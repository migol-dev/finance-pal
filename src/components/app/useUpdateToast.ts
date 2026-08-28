import { useEffect } from 'react';

/**
 * Simpler toast-based notification (alternative to the banner)
 * Usage: import { useUpdateToast } from '@/components/app/useUpdateToast';
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
