import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app/AppShell";
import Dashboard from "./pages/Dashboard";
import Movimientos from "./pages/Movimientos";
import Metas from "./pages/Metas";
import Anual from "./pages/Anual";
import Ajustes from "./pages/Ajustes";
import Deudas from "./pages/Deudas";
import Historial from "./pages/Historial";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function PageFade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.99 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  if (location.pathname === "/404" || !["/", "/movimientos", "/metas", "/deudas", "/anual", "/historial", "/ajustes"].includes(location.pathname)) {
    return (
      <Routes location={location}>
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }
  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageFade><Dashboard /></PageFade>} />
          <Route path="/movimientos" element={<PageFade><Movimientos /></PageFade>} />
          <Route path="/metas" element={<PageFade><Metas /></PageFade>} />
          <Route path="/deudas" element={<PageFade><Deudas /></PageFade>} />
          <Route path="/anual" element={<PageFade><Anual /></PageFade>} />
          <Route path="/historial" element={<PageFade><Historial /></PageFade>} />
          <Route path="/ajustes" element={<PageFade><Ajustes /></PageFade>} />
        </Routes>
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
