import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const DEVICE_ID_KEY = 'finance-pal-device-id';
const POLL_INTERVAL = 5000;
const STALE_TIMEOUT_MS = 60000;

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/edge/i.test(ua)) return 'Edge';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Navegador';
}

export function useSessionManager() {
  const { session, loading } = useAuth();
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const deviceId = getDeviceId();
  const sessionIdRef = useRef<string | null>(null);

  const resume = useCallback(() => {
    setPaused(false);
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled || loading || !session?.user?.id) return;

    const userId = session.user.id;
    const deviceName = getDeviceName();
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const register = async (): Promise<string | null> => {
      try {
        const now = new Date().toISOString();
        // Clean up stale sessions for this user
        const staleCutoff = new Date(Date.now() - STALE_TIMEOUT_MS).toISOString();
        await supabase
          .from('user_sessions')
          .delete()
          .eq('user_id', userId)
          .lt('last_seen_at', staleCutoff);
        // Delete old sessions for this device to prevent duplicates
        await supabase
          .from('user_sessions')
          .delete()
          .eq('user_id', userId)
          .eq('device_id', deviceId);
        // Insert a fresh session
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: userId,
            device_id: deviceId,
            device_name: deviceName,
            last_seen_at: now,
          })
          .select('id')
          .maybeSingle();
        if (!error && data?.id) return data.id;
        return null;
      } catch {
        return null;
      }
    };

    const heartbeat = async () => {
      if (!sessionIdRef.current) return;
      try {
        await supabase
          .from('user_sessions')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', sessionIdRef.current);
      } catch {
        // Silently fail — heartbeat is best-effort
      }
    };

    const checkOtherSessions = async () => {
      try {
        const cutoff = new Date(Date.now() - STALE_TIMEOUT_MS).toISOString();
        const { data: sessions } = await supabase
          .from('user_sessions')
          .select('device_id, created_at')
          .eq('user_id', userId)
          .gte('last_seen_at', cutoff)
          .order('created_at', { ascending: true });

        if (sessions && sessions.length > 1) {
          const oldest = sessions[0];
          if (oldest.device_id === deviceId) {
            setPaused(true);
          } else if (pausedRef.current) {
            setPaused(false);
          }
        } else if (pausedRef.current) {
          setPaused(false);
        }
      } catch {
        // Silently fail — polling is best-effort
      }
    };

    (async () => {
      sessionIdRef.current = await register();
    })();

    heartbeatTimer = setInterval(heartbeat, POLL_INTERVAL);
    pollTimer = setInterval(checkOtherSessions, POLL_INTERVAL);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session?.user?.id]);

  return { paused, resume };
}
