import { StateCreator } from 'zustand';
import {
    ThemeMode,
    UserProfile,
    AppSettings,
    AccentColor,
    UIVersion,
    NotificationPreferences,
    AccessibilitySettings,
    ChangeLogEntry,
    CustomCategory,
    MAX_CUSTOM_CATEGORY_NAME_LENGTH,
    setCachedCustomCategories,
    DEFAULT_NOTIFICATION_PREFS,
    DEFAULT_ACCESSIBILITY_SETTINGS,
} from '@/lib/finance';
import { sanitizeNotificationPrefs, generateSecureId } from '@/lib/sanitizers';
import { readInitialThemePref, writeThemePref } from '@/lib/theme-sync';

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
    setUIVersion: (v: UIVersion) => void;
    toggleUIVersion: () => void;
    setAccentColor: (color: AccentColor) => void;
    setCompactMode: (compact: boolean) => void;
    setGlassEffect: (glass: boolean) => void;
    setNotificationPrefs: (prefs: Partial<NotificationPreferences>) => void;
    setAccessibilitySettings: (prefs: Partial<AccessibilitySettings>) => void;
    setConflictResolved: () => void;
    setActive: (year: number, month: number) => void;
    resetToToday: () => void;
    clearChangeLog: () => void;
    addLogEntry: (entry: ChangeLogEntry) => void;
    addCustomCategory: (cat: { name: string; emoji: string }) => CustomCategory | null;
    updateCustomCategory: (id: string, patch: { name?: string; emoji?: string }) => void;
    removeCustomCategory: (id: string) => void;
}

const now = new Date();
const initialThemePref = readInitialThemePref();

export const createSettingsSlice: StateCreator<
    SettingsSlice,
    [],
    [],
    SettingsSlice
> = (set, get) => ({
    theme: initialThemePref.theme,
    profile: { name: '', currency: 'MXN' },
    appSettings: {
        uiVersion: initialThemePref.uiVersion,
        accentColor: initialThemePref.accentColor,
        compactMode: false,
        glassEffect: true,
        conflictResolved: false,
        notifications: DEFAULT_NOTIFICATION_PREFS,
        accessibility: DEFAULT_ACCESSIBILITY_SETTINGS,
        customCategories: [],
    },
    syncFiltersToURL: false,
    activeYear: now.getFullYear(),
    activeMonth: now.getMonth(),
    changeLog: [],

    // Solo estado local. La sincronización a la nube (user_settings)
    // se gestiona fuera del store vía settings.service + useFinanceData.
    setTheme: (t) => {
        set({ theme: t });
        writeThemePref({ theme: t });
    },

    toggleTheme: () => {
        const current = get().theme;
        const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
        get().setTheme(next);
    },

    setSyncFiltersToURL: (v) => set({ syncFiltersToURL: v }),

    setUIVersion: (uiVersion) => {
        set((s) => ({ appSettings: { ...(s.appSettings || {}), uiVersion } }));
        writeThemePref({ uiVersion });
    },

    toggleUIVersion: () => {
        const current = (get().appSettings?.uiVersion ?? 'v2') === 'v2' ? 'classic' : 'v2';
        get().setUIVersion(current);
    },

    setAccentColor: (color) => {
        set((s) => ({ appSettings: { ...s.appSettings, accentColor: color } }));
        writeThemePref({ accentColor: color });
    },

    setCompactMode: (compact) =>
        set((s) => ({ appSettings: { ...s.appSettings, compactMode: compact } })),

    setGlassEffect: (glass) =>
        set((s) => ({ appSettings: { ...s.appSettings, glassEffect: glass } })),

    setNotificationPrefs: (prefs) =>
        set((s) => {
            const currentNotifs = s.appSettings?.notifications ?? DEFAULT_NOTIFICATION_PREFS;
            const nextNotifs = sanitizeNotificationPrefs({
                ...currentNotifs,
                ...prefs,
                quietHours: prefs.quietHours
                    ? { ...currentNotifs.quietHours, ...prefs.quietHours }
                    : currentNotifs.quietHours,
            });
            return {
                appSettings: {
                    ...s.appSettings,
                    notifications: nextNotifs,
                },
            };
        }),

    setAccessibilitySettings: (prefs) =>
        set((s) => ({
            appSettings: {
                ...s.appSettings,
                accessibility: {
                    ...(s.appSettings.accessibility ?? DEFAULT_ACCESSIBILITY_SETTINGS),
                    ...prefs,
                },
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

    addCustomCategory: ({ name, emoji }) => {
        const trimmed = (name || '').trim().slice(0, MAX_CUSTOM_CATEGORY_NAME_LENGTH);
        if (!trimmed) return null;
        const cleanEmoji = (emoji || '').trim() || '🏷️';
        const existing = (get().appSettings?.customCategories ?? []).find(
            (c) => c && c.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) return existing;

        const newCategory: CustomCategory = {
            id: generateSecureId(),
            name: trimmed,
            emoji: cleanEmoji,
            createdAt: new Date().toISOString(),
        };

        set((s) => {
            const nextList = [...(s.appSettings?.customCategories ?? []), newCategory];
            setCachedCustomCategories(nextList);
            return {
                appSettings: {
                    ...s.appSettings,
                    customCategories: nextList,
                },
            };
        });
        return newCategory;
    },

    updateCustomCategory: (id, patch) => {
        set((s) => {
            const list = s.appSettings?.customCategories ?? [];
            const nextList = list.map((c) => {
                if (c.id !== id) return c;
                return {
                    ...c,
                    name:
                        patch.name !== undefined
                            ? patch.name.trim().slice(0, MAX_CUSTOM_CATEGORY_NAME_LENGTH) || c.name
                            : c.name,
                    emoji:
                        patch.emoji !== undefined ? patch.emoji.trim() || c.emoji : c.emoji,
                };
            });
            setCachedCustomCategories(nextList);
            return {
                appSettings: {
                    ...s.appSettings,
                    customCategories: nextList,
                },
            };
        });
    },

    removeCustomCategory: (id) => {
        set((s) => {
            const list = s.appSettings?.customCategories ?? [];
            const nextList = list.filter((c) => c.id !== id);
            setCachedCustomCategories(nextList);
            return {
                appSettings: {
                    ...s.appSettings,
                    customCategories: nextList,
                },
            };
        });
    },
});
