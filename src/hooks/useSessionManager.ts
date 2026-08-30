import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { processSyncQueue } from '@/lib/sync-engine';
import { Capacitor } from '@capacitor/core';
import { requestNotificationPermissions, scheduleLocalNotification } from '@/lib/notifications';

const DEVICE_ID_KEY = 'finance-pal-device-id';
const POLL_INTERVAL = 30000;
const STALE_TIMEOUT_MS = 90000;

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getDeviceName(): string {
  const platform = Capacitor.isNativePlatform() ? 'Nativa' : 'Web';
  const ua = navigator.userAgent;
  let browser = 'Desconocido';
  if (/android/i.test(ua)) browser = 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) browser = 'iOS';
  if (/chrome/i.test(ua)) browser = 'Chrome';
  if (/edge/i.test(ua)) browser = 'Edge';
  if (/firefox/i.test(ua)) browser = 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  
  return `${browser} (${platform})`;
}

export type SessionState = 
  | 'active'
  | 'pendingTakeover' // Asking user if they want to takeover another device
  | 'takingOver'      // Waiting for the other device to sync
  | 'syncingAndClosing' // Old device is syncing before closing
  | 'paused';         // Session terminated / paused

export function useSessionManager() {
  const { session, loading } = useAuth();
  const [sessionState, setSessionState] = useState<SessionState>('active');
  const [otherDevice, setOtherDevice] = useState<{ id: string, name: string } | null>(null);
  const deviceId = getDeviceId();
  const sessionIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const takeoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resume = useCallback(() => {
    setSessionState('active');
    window.location.reload();
  }, []);

  const requestTakeover = useCallback(() => {
    if (!channelRef.current || !otherDevice) return;
    setSessionState('takingOver');
    
    // Broadcast takeover request
    channelRef.current.send({
      type: 'broadcast',
      event: 'takeover_request',
      payload: { targetDeviceId: otherDevice.id, requesterId: deviceId }
    });

    // Timeout: if other device doesn't respond in 15 seconds, force takeover
    takeoverTimeoutRef.current = setTimeout(async () => {
      console.warn('[SessionManager] Takeover timeout reached, forcing start.');
      try {
        await supabase.from('user_sessions').delete().eq('device_id', otherDevice.id);
      } catch (e) {
        console.error('Failed to force delete old session:', e);
      }
      setSessionState('active');
      window.location.reload(); // Reload to start fresh
    }, 15000);
  }, [otherDevice, deviceId]);

  useEffect(() => {
    if (!isSupabaseEnabled || loading || !session?.user?.id) return;

    const userId = session.user.id;
    const deviceName = getDeviceName();
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    // Realtime subscription
    const channel = supabase.channel(`user_sessions:${userId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'takeover_request' }, async (payload) => {
        if (payload.payload.targetDeviceId === deviceId) {
          // This device was asked to yield
          setSessionState('syncingAndClosing');
          try {
            await processSyncQueue();
          } catch (e) {
            console.error('[SessionManager] Error during closing sync:', e);
          } finally {
            // Signal ready
            channel.send({
              type: 'broadcast',
              event: 'takeover_ready',
              payload: { sourceDeviceId: deviceId, requesterId: payload.payload.requesterId }
            });
            // Delete our session
            if (sessionIdRef.current) {
              await supabase.from('user_sessions').delete().eq('id', sessionIdRef.current);
            }
            setSessionState('paused');
          }
        }
      })
      .on('broadcast', { event: 'takeover_ready' }, (payload) => {
        if (payload.payload.requesterId === deviceId) {
          // The other device finished syncing
          if (takeoverTimeoutRef.current) clearTimeout(takeoverTimeoutRef.current);
          setSessionState('active');
          window.location.reload(); // Reload to load fresh synced data
        }
      })
      .on('broadcast', { event: 'new_login' }, async (payload) => {
        if (payload.payload.sourceDeviceId !== deviceId) {
          // Inform the user someone just logged in
          try {
            await requestNotificationPermissions();
            await scheduleLocalNotification({
              id: `new_login_${payload.payload.sourceDeviceId}`,
              type: 'new_login' as any,
              entityId: payload.payload.sourceDeviceId,
              title: 'Nuevo inicio de sesión detectado',
              body: `Se ha iniciado sesión desde ${payload.payload.deviceName}.`,
              scheduledAt: new Date(Date.now() + 1000)
            });
          } catch (e) {
            console.warn('Failed to notify new login', e);
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
           // Notify others of new login
           channel.send({
             type: 'broadcast',
             event: 'new_login',
             payload: { sourceDeviceId: deviceId, deviceName }
           });
        }
      });

    const register = async (): Promise<string | null> => {
      try {
        const now = new Date().toISOString();
        const staleCutoff = new Date(Date.now() - STALE_TIMEOUT_MS).toISOString();
        
        // Don't auto-delete other sessions yet, just clean up clearly stale ones
        await supabase
          .from('user_sessions')
          .delete()
          .eq('user_id', userId)
          .lt('last_seen_at', staleCutoff);

        // Check if there are active sessions BEFORE registering our new one
        const { data: activeSessions } = await supabase
          .from('user_sessions')
          .select('id, device_id, device_name, created_at')
          .eq('user_id', userId)
          .neq('device_id', deviceId)
          .gte('last_seen_at', staleCutoff)
          .order('created_at', { ascending: false });

        if (activeSessions && activeSessions.length > 0) {
          const other = activeSessions[0];
          setOtherDevice({ id: other.device_id, name: other.device_name ?? 'Dispositivo desconocido' });
          setSessionState('pendingTakeover');
          return null; // Don't register yet
        }

        // Delete our old sessions to prevent duplicates
        await supabase
          .from('user_sessions')
          .delete()
          .eq('user_id', userId)
          .eq('device_id', deviceId);

        // Register new session
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
      if (!sessionIdRef.current || document.visibilityState !== 'visible' || sessionState !== 'active') return;
      try {
        await supabase
          .from('user_sessions')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', sessionIdRef.current);
      } catch {
        // Silently fail
      }
    };

    const checkOtherSessions = async () => {
      if (document.visibilityState !== 'visible' || sessionState !== 'active') return;
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
            // We are the old session, someone else is active but didn't request takeover via Realtime yet.
            // Let's do nothing here, the Realtime event handles the takeover.
          }
        }
      } catch {
        // Silently fail
      }
    };

    (async () => {
      // Only register if we are in active state (e.g. no takeover pending)
      if (sessionState === 'active') {
        const sid = await register();
        if (sid) sessionIdRef.current = sid;
      }
    })();

    heartbeatTimer = setInterval(heartbeat, POLL_INTERVAL);
    pollTimer = setInterval(checkOtherSessions, POLL_INTERVAL);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (pollTimer) clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session?.user?.id, sessionState]);

  return { sessionState, otherDevice, resume, requestTakeover };
}
