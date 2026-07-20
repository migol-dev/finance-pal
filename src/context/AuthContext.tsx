import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

// Session timeout: 30 minutes of inactivity
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
// Token refresh: 5 minutes before expiry
const REFRESH_THRESHOLD = 5 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshing = useRef(false);
  
  // Use refs for callbacks to avoid circular dependencies
  const signOutRef = useRef<() => Promise<void>>();
  const refreshSessionRef = useRef<() => Promise<void>>();
  const resetInactivityTimerRef = useRef<() => void>();
  const scheduleTokenRefreshRef = useRef<() => void>();

  const signOut = useCallback(async () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    
    if (isSupabaseEnabled) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
  }, []);

  // Set refs after defining functions
  signOutRef.current = signOut;

  const refreshSession = useCallback(async () => {
    if (isRefreshing.current || !isSupabaseEnabled) return;
    
    isRefreshing.current = true;
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        scheduleTokenRefreshRef.current?.();
      }
    } catch (e) {
      console.error('Token refresh failed:', e);
      // If refresh fails, sign out
      await signOutRef.current?.();
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  refreshSessionRef.current = refreshSession;

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (session && isSupabaseEnabled) {
        signOutRef.current?.();
        toast.warning('Sesión cerrada por inactividad', {
          description: 'Tu sesión ha expirado por 30 minutos de inactividad',
        });
      }
    }, INACTIVITY_TIMEOUT);
  }, [session]);

  resetInactivityTimerRef.current = resetInactivityTimer;

  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (!session?.expires_at) return;
    
    const expiresAt = session.expires_at * 1000; // Convert to ms
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshIn = Math.max(0, timeUntilExpiry - REFRESH_THRESHOLD);
    
    if (refreshIn > 0 && refreshIn < 24 * 60 * 60 * 1000) { // Only if expires within 24h
      refreshTimer.current = setTimeout(async () => {
        if (!isRefreshing.current && isSupabaseEnabled) {
          await refreshSessionRef.current?.();
        }
      }, refreshIn);
    }
  }, [session]);

  scheduleTokenRefreshRef.current = scheduleTokenRefresh;

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        resetInactivityTimerRef.current?.();
        scheduleTokenRefreshRef.current?.();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session) {
        resetInactivityTimerRef.current?.();
        scheduleTokenRefreshRef.current?.();
      } else {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
      }
    });

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => resetInactivityTimerRef.current?.();
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      subscription.unsubscribe();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);