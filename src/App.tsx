import React, { Suspense, lazy } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "@/lib/framer";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app/AppShell";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Movimientos = lazy(() => import("./pages/Movimientos"));
const Metas = lazy(() => import("./pages/Metas"));
const Anual = lazy(() => import("./pages/Anual"));
const Ajustes = lazy(() => import("./pages/Ajustes"));
const Deudas = lazy(() => import("./pages/Deudas"));
const Historial = lazy(() => import("./pages/Historial"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Login = lazy(() => import("./pages/Login"));
const MigracionNube = lazy(() => import("./pages/MigracionNube"));

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { setupSyncListener } from '@/lib/sync-engine';
import { useFinance } from '@/store/finance-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
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
  const { hasLocalData } = useFinance();
  const [showMigration, setShowMigration] = React.useState(false);

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
    // Check if user has local data and hasn't migrated yet
    if (hasLocalData && !showMigration) {
      return (
        <Suspense fallback={suspenseFallback}>
          <MigracionNube />
        </Suspense>
      );
    }
  }

  return <AnimatedRoutes />;
}

const App = () => {
  React.useEffect(() => {
    if (isSupabaseEnabled) {
      setupSyncListener();
    }
  }, []);

  return (
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
  );
};

export default App;
