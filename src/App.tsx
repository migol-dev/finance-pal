import React, { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const queryClient = new QueryClient();

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

  if (location.pathname === "/404" || !["/", "/movimientos", "/metas", "/deudas", "/anual", "/historial", "/ajustes"].includes(location.pathname)) {
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
          </Routes>
        </Suspense>
      </AnimatePresence>
    </AppShell>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
