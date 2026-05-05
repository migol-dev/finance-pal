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
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AppShell><PageFade><Dashboard /></PageFade></AppShell>} />
        <Route path="/movimientos" element={<AppShell><PageFade><Movimientos /></PageFade></AppShell>} />
        <Route path="/metas" element={<AppShell><PageFade><Metas /></PageFade></AppShell>} />
        <Route path="/deudas" element={<AppShell><PageFade><Deudas /></PageFade></AppShell>} />
        <Route path="/anual" element={<AppShell><PageFade><Anual /></PageFade></AppShell>} />
        <Route path="/historial" element={<AppShell><PageFade><Historial /></PageFade></AppShell>} />
        <Route path="/ajustes" element={<AppShell><PageFade><Ajustes /></PageFade></AppShell>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
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
