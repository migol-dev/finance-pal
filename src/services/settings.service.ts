import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { ThemeMode, UserProfile } from '@/lib/finance';

// Capa de acceso a datos para configuración en nube (tabla `user_settings`).
// Funciones puras contra Supabase SDK.
// NO importar React, NO importar hooks, NO importar Zustand.

export interface UserSettingsRow {
  user_id: string;
  theme: string | null;
  profile: UserProfile | null;
  accent_color?: string | null;
  compact_mode?: boolean | null;
  glass_effect?: boolean | null;
  updated_at?: string;
}

export interface UserSettings {
  theme: ThemeMode;
  profile: UserProfile;
}

export interface UserSettingsUpsertPayload {
  user_id: string;
  theme?: ThemeMode;
  profile?: UserProfile;
}

const SETTINGS_COLS = 'user_id, theme, profile, accent_color, compact_mode, glass_effect';

export function mapUserSettingsFromDb(row: UserSettingsRow): UserSettings | null {
  const theme = row.theme;
  const validTheme = theme === 'dark' || theme === 'light' || theme === 'system' ? theme : null;
  if (!validTheme && !row.profile) return null;
  return {
    theme: (validTheme ?? 'system') as ThemeMode,
    profile:
      row.profile && typeof row.profile === 'object'
        ? ({ name: '', currency: 'MXN', ...row.profile } as UserProfile)
        : ({ name: '', currency: 'MXN' } as UserProfile),
  };
}

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select(SETTINGS_COLS)
    .eq('user_id', userId)
    .maybeSingle();

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

  const { error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    throw new AppError(ErrorCodes.DB_UPDATE_FAILED, 'Error upserting user settings', {
      originalError: error,
      context: { userId },
    });
  }
}
