import React, { Suspense, lazy, useEffect, useRef } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "@/lib/framer";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app/AppShell";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataConflictDialog } from '@/components/app/DataConflictDialog';
import { UpdateNotification } from '@/components/app/UpdateNotification';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Movimientos = lazy(() => import("./pages/Movimientos"));
const Metas = lazy(() => import("./pages/Metas"));
const Anual = lazy(() => import("./pages/Anual"));
const Ajustes = lazy(() => import("./pages/Ajustes"));
const Deudas = lazy(() => import("./pages/Deudas"));
const Historial = lazy(() => import("./pages/Historial"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const MigracionNube = lazy(() => import("./pages/MigracionNube"));

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled, supabase } from '@/lib/supabase';
import { setupSyncListener } from '@/lib/sync-engine';
import { useFinance } from '@/store/finance-store';
import { useSyncStore } from '@/store/sync-store';
import { useSessionManager } from '@/hooks/useSessionManager';
import { handleError } from '@/lib/app-error';
import { saveEncryptedState, loadEncryptedState, isEncryptionAvailable, migrateReceiptsToEncrypted } from '@/lib/encrypted-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 10, // 10 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const QUERY_CACHE_KEY = 'finance-pal-query-cache';

const encryptedQueryStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (key !== QUERY_CACHE_KEY) return null;
    if (!isEncryptionAvailable()) return window.localStorage.getItem(key);
    return await loadEncryptedState();
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (key !== QUERY_CACHE_KEY) return;
    if (!isEncryptionAvailable()) {
      window.localStorage.setItem(key, value);
      return;
    }
    await saveEncryptedState(value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (key !== QUERY_CACHE_KEY) return;
    if (!isEncryptionAvailable()) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.removeItem(key);
  },
};

const persister = createAsyncStoragePersister({
  storage: encryptedQueryStorage,
});

function PageFade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -10, filter: "blur(4px)" }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

import { PageSkeleton } from '@/components/app/PageSkeleton';

function AnimatedRoutes() {
  const location = useLocation();

  if (location.pathname === "/auth/callback") {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Routes location={location}>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </Suspense>
    );
  }

  if (location.pathname === "/404" || !["/", "/movimientos", "/metas", "/deudas", "/anual", "/historial", "/ajustes", "/migracion"].includes(location.pathname)) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Routes location={location}>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageFade><Dashboard /></PageFade>} />
            <Route path="/movimientos" element={<PageFade><Movimientos /></PageFade>} />
            <Route path="/metas" element={<PageFade><Metas /></PageFade>} />
            <Route path="/deudas" element={<PageFade><Deudas /></PageFade>} />
            <Route path="/anual" element={<PageFade><Anual /></PageFade>} />
            <Route path="/historial" element={<PageFade><Historial /></PageFade>} />
            <Route path="/ajustes" element={<PageFade><Ajustes /></PageFade>} />
            <Route path="/migracion" element={<PageFade><MigracionNube /></PageFade>} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </AppShell>
  );
}

function AuthGuard() {
  const { session, loading, mfaRequired } = useAuth();
  const { hasLocalData, loadSettingsFromCloud, appSettings, setConflictResolved } = useFinance();
  const [resolved, setResolved] = React.useState(appSettings.conflictResolved ?? false);
  React.useEffect(() => {
    if (appSettings.conflictResolved && !resolved) {
      setResolved(true);
    }
  }, [appSettings.conflictResolved, resolved]);
  const [cloudHasData, setCloudHasData] = React.useState<boolean | null>(null);
  const { sessionState, otherDevice, resume, requestTakeover } = useSessionManager();
  const set = useFinance.setState;
  const navigate = useNavigate();
  const checkingCloudRef = useRef(false);
  const resolveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety timeout to prevent infinite loading
  React.useEffect(() => {
    if (!resolved && hasLocalData()) {
      resolveTimeoutRef.current = setTimeout(() => {
        console.warn('[AuthGuard] Conflict resolution timeout - forcing resolve');
        setResolved(true);
        if (cloudHasData === null) setCloudHasData(false);
      }, 8000); // 8 seconds max
    }
    return () => {
      if (resolveTimeoutRef.current) clearTimeout(resolveTimeoutRef.current);
    };
  }, [resolved, hasLocalData, cloudHasData]);

  React.useEffect(() => {
    if (!session?.user?.id) return;
    loadSettingsFromCloud().catch(() => {});
    if (checkingCloudRef.current) return;
    checkingCloudRef.current = true;
    // Check if cloud has data across ALL entity types
    const userId = session.user.id;
    Promise.all([
      supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', userId).limit(1),
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).limit(1),
      supabase.from('fixed_items').select('id', { count: 'exact', head: true }).eq('user_id', userId).limit(1),
      supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', userId).limit(1),
      supabase.from('debts').select('id', { count: 'exact', head: true }).eq('user_id', userId).limit(1),
    ])
      .then((results) => {
        const hasAnyData = results.some(({ count }) => (count ?? 0) > 0);
        setCloudHasData(hasAnyData);
      })
      .catch((err) => {
        console.error('[AuthGuard] Error checking cloud data:', err);
        // If the query fails (e.g. network error), don't falsely assume cloud is empty.
        // Set it to true to be safe, which will show the dialog instead of auto-migrating,
        // or just let it time out and resolve.
        setCloudHasData(true);
      });
  }, [session?.user?.id, loadSettingsFromCloud]);

  // Auto-resolve conflict when we know cloud state
  React.useEffect(() => {
    if (!session?.user?.id || cloudHasData === null || resolved) return;
    if (hasLocalData() && !cloudHasData) {
      // Only local data exists → auto-upload
      setConflictResolved();
      setResolved(true);
      if (localStorage.getItem('finance-pal-migration-skipped') !== 'true') {
        navigate('/migracion');
      }
    } else if (!hasLocalData() && cloudHasData) {
      // Only cloud data exists → auto-download
      const downloadCloud = async () => {
        try {
          await useFinance.getState().downloadFromCloud();
        } catch (e) {
          handleError(e, 'Auto-download');
        } finally {
          setConflictResolved();
          setResolved(true);
        }
      };
      downloadCloud();
    } else if (!hasLocalData() && !cloudHasData) {
      // Neither has data → nothing to resolve
      setConflictResolved();
      setResolved(true);
    }
    // Both have data → dialog will show (no action needed)
  }, [session?.user?.id, cloudHasData, hasLocalData, resolved, navigate, set]);

  // Background startup sync for multi-device harmony
  React.useEffect(() => {
    if (!session?.user?.id || !cloudHasData) return;
    
    // If the local device has NO pending offline mutations, it's 100% safe to 
    // overwrite local data with cloud data, ensuring we get the latest changes
    // made by other devices while this device was closed/offline.
    const { syncQueue } = useSyncStore.getState();
    if (syncQueue.length === 0 && hasLocalData()) {
      useFinance.getState().downloadFromCloud().then(() => {
        console.log('[StartupSync] Successfully fetched latest data from cloud');
      });
    }
  }, [session?.user?.id, cloudHasData]);

  if (isSupabaseEnabled) {
    if (loading) {
      return <PageSkeleton />;
    }
    if (!session || mfaRequired) {
      return (
        <Suspense fallback={<PageSkeleton />}>
          <Login />
        </Suspense>
      );
    }
    // Show conflict dialog only when BOTH local and cloud have data
    if (hasLocalData() && cloudHasData && !resolved) {
      return (
        <DataConflictDialog
          onUpload={() => { setConflictResolved(); setResolved(true); navigate('/migracion'); }}
          onDownload={() => { 
            // Wipe local data so it doesn't get merged
            set({ fixedItems: [], transactions: [], goals: [], debts: [], goalFolders: [], accounts: [] });
            setConflictResolved(); 
            setResolved(true); 
          }}
        />
      );
    }
    // While checking cloud data, show fallback with timeout safety
    if (cloudHasData === null && hasLocalData()) {
      return <PageSkeleton />;
    }
  }

  return (
    <>
      {sessionState === 'paused' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="rounded-3xl bg-card border border-border shadow-soft p-8 max-w-sm mx-4 text-center space-y-4">
            <div className="size-16 mx-auto rounded-[28px] bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="size-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground">Sesión Terminada</h2>
            <p className="text-sm text-muted-foreground">
              Tu cuenta está siendo usada en otro dispositivo. Se guardaron tus datos y esta sesión se ha cerrado.
            </p>
            <button
              onClick={resume}
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold"
            >
              Volver a entrar aquí
            </button>
          </div>
        </div>
      )}

      {sessionState === 'pendingTakeover' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="rounded-3xl bg-card border border-border shadow-soft p-8 max-w-sm mx-4 text-center space-y-4">
            <div className="size-16 mx-auto rounded-[28px] bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="size-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground">Sesión Activa</h2>
            <p className="text-sm text-muted-foreground">
              Tienes una sesión activa en <strong>{otherDevice?.name}</strong>. ¿Deseas iniciar sesión aquí y cerrar la otra?
            </p>
            <button
              onClick={requestTakeover}
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold"
            >
              Sí, iniciar sesión aquí
            </button>
          </div>
        </div>
      )}

      {sessionState === 'takingOver' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="rounded-3xl bg-card border border-border shadow-soft p-8 max-w-sm mx-4 text-center space-y-4">
            <div className="size-16 mx-auto rounded-[28px] bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center animate-pulse">
              <svg className="size-8 text-indigo-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground">Sincronizando...</h2>
            <p className="text-sm text-muted-foreground">
              Esperando a que el otro dispositivo guarde sus cambios para no perder información...
            </p>
          </div>
        </div>
      )}

      {sessionState === 'syncingAndClosing' && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-destructive/90 backdrop-blur-md">
          <div className="rounded-3xl bg-card border border-border shadow-soft p-8 max-w-sm mx-4 text-center space-y-4 animate-in zoom-in-95">
            <div className="size-16 mx-auto rounded-[28px] bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-pulse">
              <svg className="size-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">¡Aviso Importante!</h2>
            <p className="text-base text-muted-foreground">
              Se ha iniciado sesión en otro dispositivo. Estamos subiendo tus últimos cambios a la nube para evitar perder información.
            </p>
            <p className="text-sm font-semibold text-primary">
              Por favor, no cierres esta ventana.
            </p>
          </div>
        </div>
      )}

      <AnimatedRoutes />
    </>
  );
}

function extractParamFromUrl(url: string, param: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get(param);
  } catch {
    const queryStart = url.indexOf('?');
    if (queryStart !== -1) {
      return new URLSearchParams(url.substring(queryStart)).get(param);
    }
    return null;
  }
}

function extractHashParams(url: string): Record<string, string> {
  const hashIdx = url.indexOf('#');
  if (hashIdx === -1) return {};
  const params: Record<string, string> = {};
  url.substring(hashIdx + 1).split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) params[key] = decodeURIComponent(value || '');
  });
  return params;
}

const App = () => {
  useEffect(() => {
    if (isSupabaseEnabled) {
      setupSyncListener();
    }
    // Migrate any unencrypted receipts in IndexedDB to encrypted storage
    migrateReceiptsToEncrypted().catch((e) => console.warn('Receipt migration failed:', e));
  }, []);

  // Handle OAuth deep links on native (Android)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: any;
    CapApp.addListener('appUrlOpen', async (event) => {
      const url = event.url;
      if (url.startsWith('app.financepal.com://auth/callback')) {
        // PKCE flow: code in query string
        const code = extractParamFromUrl(url, 'code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('[Auth] PKCE exchange error:', error.message);
          return;
        }
        // Implicit flow: tokens in hash fragment
        const hashParams = extractHashParams(url);
        const at = hashParams.access_token;
        const rt = hashParams.refresh_token;
        if (at && rt) {
          const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          if (error) console.error('[Auth] setSession error:', error.message);
        }
      }
    }).then(h => { handle = h; });

    return () => { handle?.remove(); };
  }, []);

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthGuard />
              {/* Update notification - non-intrusive, checks GitHub releases */}
              <UpdateNotification position="bottom" autoHideSeconds={30} />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
