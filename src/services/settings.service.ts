import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { ThemeMode, UserProfile, NotificationPreferences } from '@/lib/finance';
import { sanitizeNotificationPrefs } from '@/lib/sanitizers';

// Capa de acceso a datos para configuración en nube (tabla `user_settings`).
// Funciones puras contra Supabase SDK.
// NO importar React, NO importar hooks, NO importar Zustand.

export interface UserSettingsRow {
  user_id: string;
  theme: string | null;
  profile: UserProfile | null;
  notification_prefs?: Record<string, unknown> | null;
  accent_color?: string | null;
  compact_mode?: boolean | null;
  glass_effect?: boolean | null;
  updated_at?: string;
}

export interface UserSettings {
  theme: ThemeMode;
  profile: UserProfile;
  notificationPrefs?: NotificationPreferences;
}

export interface UserSettingsUpsertPayload {
  user_id: string;
  theme?: ThemeMode;
  profile?: UserProfile;
  notification_prefs?: NotificationPreferences;
}

const BASE_SETTINGS_COLS = 'user_id, theme, profile, accent_color, compact_mode, glass_effect';
const SETTINGS_COLS = `${BASE_SETTINGS_COLS}, notification_prefs`;

function isMissingColumnError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code ?? '');
  const msg = String(err.message ?? '').toLowerCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    msg.includes('notification_prefs') ||
    msg.includes('column')
  );
}

export function mapUserSettingsFromDb(row: UserSettingsRow): UserSettings | null {
  const theme = row.theme;
  const validTheme = theme === 'dark' || theme === 'light' || theme === 'system' ? theme : null;
  const hasNotifPrefs =
    row.notification_prefs &&
    typeof row.notification_prefs === 'object' &&
    !Array.isArray(row.notification_prefs) &&
    Object.keys(row.notification_prefs).length > 0;

  if (!validTheme && !row.profile && !hasNotifPrefs) return null;

  return {
    theme: (validTheme ?? 'system') as ThemeMode,
    profile:
      row.profile && typeof row.profile === 'object'
        ? ({ name: '', currency: 'MXN', ...row.profile } as UserProfile)
        : ({ name: '', currency: 'MXN' } as UserProfile),
    notificationPrefs: hasNotifPrefs
      ? sanitizeNotificationPrefs(row.notification_prefs)
      : undefined,
  };
}

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  let { data, error } = await supabase
    .from('user_settings')
    .select(SETTINGS_COLS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from('user_settings')
      .select(BASE_SETTINGS_COLS)
      .eq('user_id', userId)
      .maybeSingle();
    data = fallback.data as any;
    error = fallback.error;
  }

  if (error) {
    throw new AppError(ErrorCodes.DB_QUERY_FAILED, 'Error fetching user settings', {
      originalError: error,
      context: { userId },
    });
  }
  if (!data) return null;
  return mapUserSettingsFromDb(data as UserSettingsRow);
}

export async function upsertUserSettings(
  userId: string,
  settings: Partial<UserSettings>,
): Promise<void> {
  const payload: UserSettingsUpsertPayload = { user_id: userId };
  if (settings.theme !== undefined) payload.theme = settings.theme;
  if (settings.profile !== undefined) payload.profile = settings.profile;
  if (settings.notificationPrefs !== undefined) {
    payload.notification_prefs = sanitizeNotificationPrefs(settings.notificationPrefs);
  }

  let { error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' });

  if (error && payload.notification_prefs !== undefined && isMissingColumnError(error)) {
    const { notification_prefs: _ignored, ...basePayload } = payload;
    const retry = await supabase
      .from('user_settings')
      .upsert(basePayload, { onConflict: 'user_id' });
    error = retry.error;
  }

  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error upserting user settings', {
      originalError: error,
      context: { userId },
    });
  }
}

