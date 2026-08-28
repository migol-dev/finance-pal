import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { toast } from 'sonner';
import { ErrorCodes, logger } from '@/lib/app-error';
import { audit } from '@/lib/audit-logger';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  mfaRequired: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkMfaStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  mfaRequired: false,
  signOut: async () => {},
  refreshSession: async () => {},
  checkMfaStatus: async () => false,
});

// Session timeout: 30 minutes of inactivity
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
// Token refresh: 5 minutes before expiry
const REFRESH_THRESHOLD = 5 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshing = useRef(false);
  
  // Use refs for callbacks to avoid circular dependencies
  const signOutRef = useRef<() => Promise<void>>();
  const refreshSessionRef = useRef<() => Promise<void>>();
  const resetInactivityTimerRef = useRef<() => void>();
  const scheduleTokenRefreshRef = useRef<() => void>();

  const checkMfaStatus = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseEnabled) return false;
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      if (data) {
        const needsMfa = data.currentLevel === 'aal1' && data.nextLevel === 'aal2';
        setMfaRequired(needsMfa);
        return needsMfa;
      }
    } catch (e) {
      console.warn('[AuthContext] Failed to get MFA assurance level:', e);
    }
    setMfaRequired(false);
    return false;
  }, []);

  const signOut = useCallback(async () => {
    const userId = session?.user?.id;
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    
    if (isSupabaseEnabled) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        logger.error('Sign out failed', ErrorCodes.AUTH_SIGNOUT_FAILED, { error: e });
      }
    }
    
    // Clear local data completely to avoid merging it into another user's session
    useFinance.setState({
      fixedItems: [],
      transactions: [],
      goals: [],
      debts: [],
      goalFolders: [],
      changeLog: [],
      accounts: [],
    });
    useSyncStore.getState().clearQueue();
    
    setSession(null);
    setUser(null);
    setMfaRequired(false);
    
    // Audit log: user logout
    if (userId) {
      audit.logout(userId, { reason: 'manual' });
    }
  }, [session]);

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
        await checkMfaStatus();
        scheduleTokenRefreshRef.current?.();
      }
    } catch (e) {
      logger.error('Token refresh failed', ErrorCodes.AUTH_TOKEN_REFRESH_FAILED, { error: e });
      // If refresh fails, sign out
      await signOutRef.current?.();
    } finally {
      isRefreshing.current = false;
    }
  }, [checkMfaStatus]);

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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        await checkMfaStatus();
        resetInactivityTimerRef.current?.();
        scheduleTokenRefreshRef.current?.();
      }
      setLoading(false);
    }).catch((e) => {
      logger.error('Failed to get session', ErrorCodes.AUTH_SESSION_EXPIRED, { error: e });
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isNewSession = event === 'SIGNED_IN' && session;
      const isSignOut = event === 'SIGNED_OUT';
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (isNewSession) {
        await checkMfaStatus();
        resetInactivityTimerRef.current?.();
        scheduleTokenRefreshRef.current?.();
        
        // Audit log: user login
        if (session?.user?.id) {
          audit.login(session.user.id, { provider: session.user.app_metadata?.provider ?? 'email' });
        }
      } else if (isSignOut) {
        setMfaRequired(false);
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
  }, [checkMfaStatus]);

  return (
    <AuthContext.Provider value={{ session, user, loading, mfaRequired, signOut, refreshSession, checkMfaStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);