import { StateCreator } from 'zustand';
import {
    ThemeMode,
    UserProfile,
    AppSettings,
    AccentColor,
    NotificationPreferences,
    ChangeLogEntry,
    DEFAULT_NOTIFICATION_PREFS,
} from '@/lib/finance';

export interface SettingsSlice {
    theme: ThemeMode;
    profile: UserProfile;
    appSettings: AppSettings;
    syncFiltersToURL: boolean;
    activeYear: number;
    activeMonth: number;
    changeLog: ChangeLogEntry[];

    setTheme: (t: ThemeMode) => void;
    toggleTheme: () => void;
    setProfile: (p: Partial<UserProfile>) => void;
    setSyncFiltersToURL: (v: boolean) => void;
    setAccentColor: (color: AccentColor) => void;
    setCompactMode: (compact: boolean) => void;
    setGlassEffect: (glass: boolean) => void;
    setNotificationPrefs: (prefs: Partial<NotificationPreferences>) => void;
    setConflictResolved: () => void;
    setActive: (year: number, month: number) => void;
    resetToToday: () => void;
    clearChangeLog: () => void;
    addLogEntry: (entry: ChangeLogEntry) => void;
}

const now = new Date();

export const createSettingsSlice: StateCreator<
    SettingsSlice,
    [],
    [],
    SettingsSlice
> = (set, get) => ({
    theme: 'system',
    profile: { name: '', currency: 'MXN' },
    appSettings: {
        accentColor: 'blue',
        compactMode: false,
        glassEffect: true,
        conflictResolved: false,
        notifications: DEFAULT_NOTIFICATION_PREFS,
    },
    syncFiltersToURL: false,
    activeYear: now.getFullYear(),
    activeMonth: now.getMonth(),
    changeLog: [],

    // Solo estado local. La sincronización a la nube (user_settings)
    // se gestiona fuera del store vía settings.service + useFinanceData.
    setTheme: (t) => {
        set({ theme: t });
    },

    toggleTheme: () => {
        const current = get().theme;
        const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
        get().setTheme(next);
    },

    setSyncFiltersToURL: (v) => set({ syncFiltersToURL: v }),

    setAccentColor: (color) =>
        set((s) => ({ appSettings: { ...s.appSettings, accentColor: color } })),

    setCompactMode: (compact) =>
        set((s) => ({ appSettings: { ...s.appSettings, compactMode: compact } })),

    setGlassEffect: (glass) =>
        set((s) => ({ appSettings: { ...s.appSettings, glassEffect: glass } })),

    setNotificationPrefs: (prefs) =>
        set((s) => ({
            appSettings: {
                ...s.appSettings,
                notifications: { ...s.appSettings.notifications, ...prefs },
            },
        })),

    setConflictResolved: () =>
        set((s) => ({ appSettings: { ...s.appSettings, conflictResolved: true } })),

    setProfile: (p) => {
        set((s) => ({ profile: { ...s.profile, ...p } }));
    },

    setActive: (y, m) => set({ activeYear: y, activeMonth: m }),

    resetToToday: () => {
        const d = new Date();
        set({ activeYear: d.getFullYear(), activeMonth: d.getMonth() });
    },

    clearChangeLog: () => set({ changeLog: [] }),

    addLogEntry: (entry) =>
        set((s) => ({
            changeLog: [entry, ...s.changeLog].slice(0, 500),
        })),
});
