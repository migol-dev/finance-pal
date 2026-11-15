import { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { ChevronDown, Download, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from '@/lib/framer';
import { BrandLogo } from '@/components/app/BrandLogo';
import { Button } from '@/components/ui/button';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { formatApkSize } from '@/lib/version-check';
import { cn } from '@/lib/utils';

export interface UpdateNotificationProps {
  /** Auto-hide after seconds (0 = never, default) */
  autoHideSeconds?: number;
}

function formatVersionTag(version: string | undefined | null): string {
  const clean = (version ?? '').trim().replace(/^v/i, '');
  return clean ? `v${clean}` : '';
}

/**
 * Non-intrusive top editorial update banner for native Android builds.
 * Never renders on Web/PC and avoids colliding with BottomNavV2.
 */
export function UpdateNotification({
  autoHideSeconds = 0,
}: UpdateNotificationProps = {}) {
  const {
    isNativeAndroid,
    currentVersion,
    updateInfo,
    downloading,
    shouldShowBanner,
    checkAuto,
    downloadUpdate,
    dismissBanner,
  } = useAppUpdate();

  const [notesOpen, setNotesOpen] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);

  useEffect(() => {
    setNotesOpen(false);
    setAutoHidden(false);
  }, [updateInfo?.latest]);

  useEffect(() => {
    if (!isNativeAndroid) return;

    let cancelled = false;
    let handle: Awaited<ReturnType<typeof CapApp.addListener>> | undefined;

    const initTimer = setTimeout(() => {
      if (!cancelled) {
        void checkAuto();
      }
    }, 1500);

    try {
      Promise.resolve(
        CapApp.addListener('appStateChange', ({ isActive }) => {
          if (!cancelled && isActive) {
            void checkAuto();
          }
        })
      )
        .then((listenerHandle) => {
          if (cancelled) {
            void listenerHandle?.remove();
          } else {
            handle = listenerHandle;
          }
        })
        .catch(() => {
          // Ignore listener registration errors in non-native environments
        });
    } catch {
      // Ignore synchronous listener registration errors
    }

    return () => {
      cancelled = true;
      clearTimeout(initTimer);
      void handle?.remove();
    };
  }, [isNativeAndroid, checkAuto]);

  useEffect(() => {
    if (!isNativeAndroid || !shouldShowBanner || !updateInfo || autoHideSeconds <= 0) {
      return;
    }
    const hideTimer = setTimeout(() => {
      setAutoHidden(true);
    }, autoHideSeconds * 1000);
    return () => clearTimeout(hideTimer);
  }, [isNativeAndroid, shouldShowBanner, updateInfo, autoHideSeconds]);

  if (!isNativeAndroid || !shouldShowBanner || !updateInfo || autoHidden) {
    return null;
  }

  const currentTag = formatVersionTag(updateInfo.current || currentVersion);
  const latestTag = formatVersionTag(updateInfo.latest);
  const versionBadge =
    currentTag && latestTag && currentTag !== latestTag
      ? `${currentTag} -> ${latestTag}`
      : latestTag || currentTag;
  const apkSizeLabel = formatApkSize(updateInfo.apkSizeBytes);
  const releaseNotes = updateInfo.releaseNotes?.trim();

  return (
    <AnimatePresence>
      <motion.div
        role="region"
        aria-label="Actualización disponible"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] inset-x-3 sm:left-auto sm:right-4 sm:w-[400px] z-[90] pointer-events-auto"
      >
        <div className="rounded-xl bg-popover/95 dark:bg-[#141413]/95 backdrop-blur-md text-foreground border border-border dark:border-white/10 dark:border-t-white/15 shadow-lg shadow-black/10 dark:shadow-black/40 overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                <BrandLogo size="xs" />
                {versionBadge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium font-mono-tabular bg-primary/10 text-primary border border-primary/20">
                    {versionBadge}
                  </span>
                )}
                {apkSizeLabel && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium font-mono-tabular bg-muted text-muted-foreground border border-border/70">
                    {apkSizeLabel}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={dismissBanner}
                aria-label="Descartar"
                className="inline-flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] -mr-2 -mt-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors tactile-press"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="min-w-0">
              <h2 className="font-display-v2 text-base font-bold tracking-tight text-foreground leading-snug">
                Actualización disponible
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {updateInfo.apkDownloadUrl
                  ? 'Descarga directa de financemate.apk'
                  : 'Disponible en GitHub Releases'}
              </p>
            </div>

            {releaseNotes && (
              <div className="space-y-2">
                <button
                  type="button"
                  aria-expanded={notesOpen}
                  onClick={() => setNotesOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-2 min-h-[44px] rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <span>Ver novedades</span>
                  <ChevronDown
                    className={cn(
                      'size-3.5 transition-transform duration-200',
                      notesOpen && 'rotate-180'
                    )}
                    strokeWidth={1.75}
                  />
                </button>

                {notesOpen && (
                  <div className="bg-muted/50 border-t border-border/60 rounded-lg p-3 text-xs text-muted-foreground whitespace-pre-line max-h-36 overflow-y-auto">
                    {releaseNotes}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-0.5">
              <Button
                type="button"
                onClick={() => {
                  void downloadUpdate();
                }}
                disabled={downloading}
                className="flex-1 h-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg min-h-[44px] px-4 font-medium tactile-press gap-0"
              >
                {downloading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" strokeWidth={1.75} />
                ) : (
                  <Download className="size-4 mr-2" strokeWidth={1.75} />
                )}
                <span>
                  {downloading
                    ? 'Iniciando descarga...'
                    : updateInfo.apkDownloadUrl
                      ? 'Descargar APK'
                      : 'Ver actualización'}
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={dismissBanner}
                className="h-auto rounded-lg min-h-[44px] px-4 text-sm font-medium text-muted-foreground hover:text-foreground tactile-press"
              >
                Luego
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
