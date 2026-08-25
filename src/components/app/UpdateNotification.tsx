import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Github, X, Loader2 } from 'lucide-react';
import { checkForUpdates, dismissVersion, VersionInfo } from '@/lib/version-check';
import { toast } from 'sonner';

interface UpdateNotificationProps {
  /** Position of the notification */
  position?: 'top' | 'bottom';
  /** Auto-hide after seconds (0 = never) */
  autoHideSeconds?: number;
  /** Custom check interval override (hours) */
  checkIntervalHours?: number;
}

/**
 * Non-intrusive update notification banner
 * Shows at top/bottom of screen when new version available
 */
export function UpdateNotification({
  position = 'bottom',
  autoHideSeconds = 30,
  checkIntervalHours = 6,
}: UpdateNotificationProps = {}) {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    let hideTimer: ReturnType<typeof setTimeout>;

    async function check() {
      if (dismissed) return;
      setChecking(true);
      
      try {
        const info = await checkForUpdates();
        if (mounted && info) {
          setUpdateInfo(info);
          // Auto-hide timer
          if (autoHideSeconds > 0) {
            hideTimer = setTimeout(() => {
              if (mounted) setUpdateInfo(null);
            }, autoHideSeconds * 1000);
          }
        }
      } catch (e) {
        console.warn('Update check failed:', e);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    // Initial check after short delay (don't block startup)
    const initTimer = setTimeout(check, 2000);
    
    return () => {
      mounted = false;
      clearTimeout(initTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [dismissed, autoHideSeconds]);

  if (!updateInfo || dismissed) return null;

  const handleDismiss = () => {
    setUpdateInfo(null);
    dismissVersion(updateInfo.latest);
  };

  const handleUpdate = () => {
    window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
    dismissVersion(updateInfo.latest);
    setUpdateInfo(null);
  };

  const isTop = position === 'top';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, translateY: isTop ? -100 : 100 }}
        animate={{ opacity: 1, translateY: 0 }}
        exit={{ opacity: 0, translateY: isTop ? -100 : 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`
          fixed ${isTop ? 'top-0' : 'bottom-0'} left-4 right-4 z-[9999]
          pointer-events-auto
          ${isTop ? 'md:top-4 md:left-auto md:right-4 md:w-96' : 'md:bottom-4 md:left-auto md:right-4 md:w-96'}
        `}
        style={{ maxWidth: '480px', margin: '0 auto' }}
      >
        <div className="relative bg-card border border-border shadow-2xl rounded-2xl overflow-hidden">
          {/* Gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" />
          
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="flex-shrink-0 size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Github className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">Actualización disponible</p>
                  <p className="text-xs text-muted-foreground truncate">
                    Versión {updateInfo.latest} • {updateInfo.isPreRelease ? 'Beta' : 'Estable'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 size-8 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                aria-label="Descartar"
              >
                <X className="size-4" />
              </button>
            </div>

            {updateInfo.releaseNotes && (
              <details className="group">
                <summary className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer list-none">
                  <Loader2 className="size-3.5 text-primary animate-spin" />
                  <span>Ver novedades</span>
                  <span className="ml-auto text-[10px] opacity-50">▼</span>
                </summary>
                <div className="mt-2 p-3 bg-accent/50 rounded-xl text-xs text-muted-foreground whitespace-pre-line max-h-32 overflow-y-auto">
                  {updateInfo.releaseNotes.slice(0, 500)}{updateInfo.releaseNotes.length > 500 ? '...' : ''}
                </div>
              </details>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleUpdate}
                className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground border-0 shadow-glow font-medium"
                disabled={checking}
              >
                {checking ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Comprobando...
                  </>
                ) : (
                  <>
                    <Github className="size-4 mr-2" />
                    Ver en GitHub
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleDismiss}
                className="h-10 rounded-xl px-4 text-sm font-medium"
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
 
/**
 * Simpler toast-based notification (alternative)
 * Usage: import { useUpdateToast } from '@/components/app/UpdateNotification';
 * Then call useUpdateToast() in your component
 */
export function useUpdateToast() {
  useEffect(() => {
    let mounted = true;
    
    async function check() {
      try {
        const { checkForUpdates, dismissVersion } = await import('@/lib/version-check');
        const info = await checkForUpdates();
        if (mounted && info) {
          const { toast } = await import('sonner');
          toast.info(`Nueva versión ${info.latest} disponible`, {
            description: info.releaseNotes?.slice(0, 100) + '...',
            action: {
              label: 'Ver en GitHub',
              onClick: () => {
                window.open(info.releaseUrl, '_blank', 'noopener,noreferrer');
                dismissVersion(info.latest);
              },
            },
            dismissible: true,
            duration: 15000,
          });
        }
      } catch (e) {
        console.warn('Update check failed:', e);
      }
    }
 
    const timer = setTimeout(check, 3000);
    return () => { mounted = false; clearTimeout(timer); };
  }, []);
}