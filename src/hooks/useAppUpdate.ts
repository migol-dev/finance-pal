import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { create } from 'zustand';
import {
  checkForUpdates,
  compareVersions,
  dismissVersion,
  downloadApkUpdate,
  getCurrentVersion,
  getInstalledAppVersion,
  isVersionDismissed,
  type VersionInfo,
} from '@/lib/version-check';

const MANUAL_CHECK_ERROR_MSG =
  'No se pudo comprobar si hay actualizaciones. Verifica tu conexión.';

export interface AppUpdateState {
  isNativeAndroid: boolean;
  currentVersion: string;
  updateInfo: VersionInfo | null;
  checking: boolean;
  downloading: boolean;
  error: string | null;
  lastCheckedAt: number | null;
  bannerDismissedInSession: boolean;
  shouldShowBanner: boolean;
}

export interface AppUpdateActions {
  checkAuto: () => Promise<VersionInfo | null>;
  checkManual: () => Promise<VersionInfo | null>;
  downloadUpdate: (info?: VersionInfo) => Promise<void>;
  dismissBanner: () => void;
  resetForTest: () => void;
}

export type AppUpdateStore = AppUpdateState & AppUpdateActions;

function detectNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function computeShouldShowBanner(
  state: Pick<AppUpdateState, 'isNativeAndroid' | 'updateInfo' | 'bannerDismissedInSession'>
): boolean {
  return Boolean(
    state.isNativeAndroid && state.updateInfo?.hasUpdate && !state.bannerDismissedInSession
  );
}

function createInitialData(): AppUpdateState {
  return {
    isNativeAndroid: detectNativePlatform(),
    currentVersion: getCurrentVersion(),
    updateInfo: null,
    checking: false,
    downloading: false,
    error: null,
    lastCheckedAt: null,
    bannerDismissedInSession: false,
    shouldShowBanner: false,
  };
}

let inFlightAutoCheck: Promise<VersionInfo | null> | null = null;

export const useAppUpdateStore = create<AppUpdateStore>((set, get) => {
  const commit = (
    partial:
      | Partial<Omit<AppUpdateState, 'shouldShowBanner'>>
      | ((state: AppUpdateStore) => Partial<Omit<AppUpdateState, 'shouldShowBanner'>>)
  ) => {
    set((state) => {
      const patch = typeof partial === 'function' ? partial(state) : partial;
      const merged = { ...state, ...patch };
      return {
        ...patch,
        shouldShowBanner: computeShouldShowBanner(merged),
      };
    });
  };

  return {
    ...createInitialData(),

    checkAuto: async () => {
      if (!detectNativePlatform()) {
        if (get().isNativeAndroid) {
          commit({ isNativeAndroid: false });
        }
        return null;
      }

      if (inFlightAutoCheck) {
        return inFlightAutoCheck;
      }

      inFlightAutoCheck = (async () => {
        try {
          const installedVersion = await getInstalledAppVersion();
          const result = await checkForUpdates({ force: false });

          if (result && result.hasUpdate && !isVersionDismissed(result.latest)) {
            commit({
              isNativeAndroid: true,
              currentVersion: result.current || installedVersion,
              lastCheckedAt: Date.now(),
              updateInfo: result,
              bannerDismissedInSession: false,
              error: null,
            });
            return result;
          }

          commit((state) => {
            const nextUpdateInfo =
              state.updateInfo && compareVersions(installedVersion, state.updateInfo.latest) >= 0
                ? { ...state.updateInfo, current: installedVersion, hasUpdate: false }
                : state.updateInfo;

            return {
              isNativeAndroid: true,
              currentVersion: installedVersion,
              lastCheckedAt: Date.now(),
              updateInfo: nextUpdateInfo,
            };
          });

          return null;
        } catch {
          return null;
        } finally {
          inFlightAutoCheck = null;
        }
      })();

      return inFlightAutoCheck;
    },

    checkManual: async () => {
      if (!detectNativePlatform()) {
        if (get().isNativeAndroid) {
          commit({ isNativeAndroid: false });
        }
        return null;
      }

      commit({ isNativeAndroid: true, checking: true, error: null });

      try {
        const installedVersion = await getInstalledAppVersion();
        const result = await checkForUpdates({
          force: true,
          includeDismissed: true,
        });

        if (!result) {
          commit({
            isNativeAndroid: true,
            currentVersion: installedVersion,
            checking: false,
            error: MANUAL_CHECK_ERROR_MSG,
          });
          return null;
        }

        const previouslyDismissed = isVersionDismissed(result.latest);
        commit((state) => ({
          isNativeAndroid: true,
          currentVersion: result.current || installedVersion,
          updateInfo: result,
          lastCheckedAt: Date.now(),
          checking: false,
          error: null,
          bannerDismissedInSession: state.bannerDismissedInSession || previouslyDismissed,
        }));

        return result;
      } catch {
        commit({
          isNativeAndroid: true,
          checking: false,
          error: MANUAL_CHECK_ERROR_MSG,
        });
        return null;
      }
    },

    downloadUpdate: async (info?: VersionInfo) => {
      const target = info ?? get().updateInfo;
      if (!target) return;

      commit({ downloading: true });
      try {
        await downloadApkUpdate(target);
        dismissVersion(target.latest);
        commit({ bannerDismissedInSession: true });
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'No se pudo iniciar la descarga de la actualización.';
        toast.error(message);
      } finally {
        commit({ downloading: false });
      }
    },

    dismissBanner: () => {
      const currentUpdate = get().updateInfo;
      if (currentUpdate?.latest) {
        dismissVersion(currentUpdate.latest);
      }
      commit({ bannerDismissedInSession: true });
    },

    resetForTest: () => {
      inFlightAutoCheck = null;
      set(createInitialData());
    },
  };
});

export function useAppUpdate(): AppUpdateStore {
  const state = useAppUpdateStore();
  return {
    ...state,
    shouldShowBanner: computeShouldShowBanner(state),
  };
}
