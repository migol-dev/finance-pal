import React, { Suspense, lazy, useEffect, useRef } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "@/lib/framer";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app/AppShell";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataConflictDialog } from '@/components/app/DataConflictDialog';
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
import { useSessionManager } from '@/hooks/useSessionManager';
import { handleError } from '@/lib/app-error';

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

const persister = createSyncStoragePersister({
  storage: window.localStorage,
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

function AnimatedRoutes() {
  const location = useLocation();
  const suspenseFallback = (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-50">
      <div className="size-16 rounded-[28px] gradient-primary shadow-glow flex items-center justify-center animate-pulse mb-4">
        <div className="size-8 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Finance Pal</p>
    </div>
  );

  if (location.pathname === "/auth/callback") {
    return (
      <Suspense fallback={suspenseFallback}>
        <Routes location={location}>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </Suspense>
    );
  }

  if (location.pathname === "/404" || !["/", "/movimientos", "/metas", "/deudas", "/anual", "/historial", "/ajustes", "/migracion"].includes(location.pathname)) {
    return (
      <Suspense fallback={suspenseFallback}>
        <Routes location={location}>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <Suspense fallback={suspenseFallback}>
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
  const { session, loading } = useAuth();
  const { hasLocalData, loadSettingsFromCloud } = useFinance();
  const [resolved, setResolved] = React.useState(false);
  const [cloudHasData, setCloudHasData] = React.useState<boolean | null>(null);
  const { paused, resume } = useSessionManager();
  const set = useFinance.setState;
  const navigate = useNavigate();
  const checkingCloudRef = useRef(false);

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
      .catch(() => setCloudHasData(false));
  }, [session?.user?.id, loadSettingsFromCloud]);

  // Auto-resolve conflict when we know cloud state
  React.useEffect(() => {
    if (!session?.user?.id || cloudHasData === null || resolved) return;
    if (hasLocalData() && !cloudHasData) {
      // Only local data exists → auto-upload
      setResolved(true);
      navigate('/migracion');
    } else if (!hasLocalData() && cloudHasData) {
      // Only cloud data exists → auto-download
      const downloadCloud = async () => {
        try {
          const userId = session.user.id;
          const [accountsRes, txRes, fixedRes, goalsRes, debtsRes] = await Promise.all([
            supabase.from('accounts').select('id, name, type, initial_balance, currency, denominations, clabe, bank, holder_name').eq('user_id', userId).order('created_at', { ascending: true }),
            supabase.from('transactions').select('id, type, category, concept, amount, date, note, icon, payment_method, fixed_id, account_id, transfer_to_account_id, external_payee, receipt').eq('user_id', userId).order('date', { ascending: false }),
            supabase.from('fixed_items').select('id, type, category, concept, amount, frequency, active, note, start_date, end_date, priority, pay_day, pay_week_day, icon, payment_method, account_id').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('goals').select('id, name, target, saved, emoji, color, deadline, icon, purchase_url, contributions, pinned, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
            supabase.from('debts').select('id, person, concept, amount, date, due_date, note, icon, account_id, payments:debt_payments(id, amount, date, note, payment_method, account_id)').eq('user_id', userId).order('created_at', { ascending: false }),
          ]);
          set({
            accounts: (accountsRes.data ?? []).map((r: any) => ({ id: r.id, name: r.name, type: r.type, initialBalance: Number(r.initial_balance ?? 0), currency: r.currency, denominations: r.denominations ?? [], clabe: r.clabe, bank: r.bank, holderName: r.holder_name })),
            transactions: (txRes.data ?? []).map((r: any) => ({ id: r.id, type: r.type, category: r.category, concept: r.concept, amount: Number(r.amount), date: r.date, note: r.note, icon: r.icon, paymentMethod: r.payment_method, fixedId: r.fixed_id, accountId: r.account_id, transferToAccountId: r.transfer_to_account_id, externalPayee: r.external_payee, receipt: r.receipt })),
            fixedItems: (fixedRes.data ?? []).map((r: any) => ({ id: r.id, type: r.type, category: r.category, concept: r.concept, amount: Number(r.amount), frequency: r.frequency, active: r.active, note: r.note, startDate: r.start_date, endDate: r.end_date, priority: r.priority, payDay: r.pay_day, payWeekDay: r.pay_week_day, icon: r.icon, paymentMethod: r.payment_method, accountId: r.account_id })),
            goals: (goalsRes.data ?? []).map((r: any) => ({ id: r.id, name: r.name, target: Number(r.target), saved: Number(r.saved ?? 0), emoji: r.emoji, color: r.color, deadline: r.deadline, icon: r.icon, purchaseUrl: r.purchase_url, contributions: r.contributions ?? [], pinned: r.pinned, createdAt: r.created_at })),
            debts: (debtsRes.data ?? []).map((r: any) => ({ id: r.id, person: r.person, concept: r.concept, amount: Number(r.amount), date: r.date, dueDate: r.due_date, note: r.note, icon: r.icon, accountId: r.account_id, payments: (r.payments ?? []).map((p: any) => ({ id: p.id, amount: Number(p.amount), date: p.date, note: p.note, paymentMethod: p.payment_method, accountId: p.account_id })) })),
          });
        } catch (e) {
          handleError(e, 'Auto-download');
        }
        setResolved(true);
      };
      downloadCloud();
    } else if (!hasLocalData() && !cloudHasData) {
      // Neither has data → nothing to resolve
      setResolved(true);
    }
    // Both have data → dialog will show (no action needed)
  }, [session?.user?.id, cloudHasData, hasLocalData, resolved, navigate, set]);

  const suspenseFallback = (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-50">
      <div className="size-16 rounded-[28px] gradient-primary shadow-glow flex items-center justify-center animate-pulse mb-4">
        <div className="size-8 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Finance Pal</p>
    </div>
  );

  if (isSupabaseEnabled) {
    if (loading) {
      return suspenseFallback;
    }
    if (!session) {
      return (
        <Suspense fallback={suspenseFallback}>
          <Login />
        </Suspense>
      );
    }
    // Show conflict dialog only when BOTH local and cloud have data
    if (hasLocalData() && cloudHasData && !resolved) {
      return (
        <DataConflictDialog
          onUpload={() => { setResolved(true); navigate('/migracion'); }}
          onDownload={() => setResolved(true)}
        />
      );
    }
    // While checking cloud data, show fallback with timeout safety
    if (cloudHasData === null && hasLocalData()) {
      return suspenseFallback;
    }
  }

  return (
    <>
      {paused && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
          <div className="rounded-3xl bg-card border border-border shadow-soft p-8 max-w-sm mx-4 text-center space-y-4">
            <div className="size-16 mx-auto rounded-[28px] bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="size-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground">Sesión en pausa</h2>
            <p className="text-sm text-muted-foreground">
              Tu cuenta está siendo usada en otro dispositivo o navegador.
              La sesión actual se ha pausado para evitar conflictos de datos.
            </p>
            <button
              onClick={resume}
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold"
            >
              Sincronizar y reanudar
            </button>
            <p className="text-[10px] text-muted-foreground">
              Al reanudar se recargarán los datos más recientes desde la nube.
            </p>
          </div>
        </div>
      )}
      <AnimatedRoutes />
    </>
  );
}

const App = () => {
  useEffect(() => {
    if (isSupabaseEnabled) {
      setupSyncListener();
    }
  }, []);

  // Handle OAuth deep links on native (Android)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let canceled = false;
    CapApp.addListener('appUrlOpen', async (event) => {
      if (canceled) return;
      const url = event.url;
      if (url.startsWith('app.financepal.com://auth/callback')) {
        await supabase.auth.exchangeCodeForSession(url);
      }
    });

    return () => { canceled = true; };
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
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;