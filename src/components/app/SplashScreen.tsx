import { memo, useId, useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "@/lib/framer";
import { Wallet } from "lucide-react";
import { useFinance } from "@/store/finance-store";

const BOOT_STEPS = [
  { id: "01", tag: "PREFERENCIAS", label: "Cargando preferencias y perfil editorial..." },
  { id: "02", tag: "BÓVEDA LOCAL", label: "Descifrando bóveda local (AES-GCM)..." },
  { id: "03", tag: "BASE DE DATOS", label: "Conectando con base de datos e índices..." },
  { id: "04", tag: "LIBRO MAYOR", label: "Sincronizando balances y liquidez disponible..." },
];

export const SplashScreen = memo(function SplashScreen() {
  const uiVersion = useFinance((s) => s?.appSettings?.uiVersion ?? "v2");
  const userReducedMotion = useFinance((s) => s?.appSettings?.accessibility?.reduceMotion);
  const [osReducedMotion, setOsReducedMotion] = useState(false);
  const rawId = useId();
  const coinGradId = `splash-fp-coin-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  // Telemetría coreografiada de 1.5s (1500ms)
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setOsReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const shouldReduceMotion = Boolean(userReducedMotion || osReducedMotion);

  useEffect(() => {
    if (shouldReduceMotion) {
      setProgress(100);
      setStepIndex(3);
      return;
    }

    const DURATION = 1450; // 1450ms + 50ms salida
    let frameId: number;

    const tick = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setProgress(pct);

      if (elapsed < 375) {
        setStepIndex(0);
      } else if (elapsed < 750) {
        setStepIndex(1);
      } else if (elapsed < 1125) {
        setStepIndex(2);
      } else {
        setStepIndex(3);
      }

      if (elapsed < DURATION) {
        frameId = requestAnimationFrame(tick);
      } else {
        setProgress(100);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [shouldReduceMotion]);

  if (uiVersion === "classic") {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
        <div className="relative flex items-center justify-center">
          {!shouldReduceMotion && (
            <>
              <span className="absolute size-32 rounded-[32px] bg-primary/20 animate-pulse-ring" />
              <span className="absolute size-32 rounded-[32px] bg-primary/10 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
            </>
          )}
          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
            className="size-24 rounded-[28px] gradient-primary shadow-glow flex items-center justify-center relative z-10"
          >
            <Wallet className="size-12 text-primary-foreground" />
          </motion.div>
        </div>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-xl font-extrabold tracking-tight">Finance Pal</p>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-2 rounded-full bg-primary"
                animate={shouldReduceMotion ? { opacity: 0.8 } : { y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // --- V2: Propuesta A — Editorial Ledger Ticker (1.5s Labor Illusion) ---
  const currentStep = BOOT_STEPS[stepIndex];

  return (
    <div
      aria-label="Cargando Finance Pal"
      role="status"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#FAF8F5] dark:bg-[#0C0C0B] text-foreground transition-colors duration-300"
    >
      <div className="w-full max-w-sm px-6 flex flex-col items-center">
        {/* Monograma FP Central con Esquinas de Encuadre Arquitectónico */}
        <div className="relative flex items-center justify-center">
          {/* Ticks arquitectónicos de 1px en esquinas */}
          <div className="absolute -top-2.5 -left-2.5 size-3 border-t border-l border-primary/50 pointer-events-none" />
          <div className="absolute -bottom-2.5 -right-2.5 size-3 border-b border-r border-primary/50 pointer-events-none" />

          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="size-24 rounded-xl bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-[#262624] shadow-sm flex items-center justify-center relative z-10 p-2"
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
              aria-label="Finance Pal Isotipo"
            >
              <defs>
                <linearGradient id={coinGradId} x1="20" y1="12" x2="32" y2="24" gradientUnits="userSpaceOnUse">
                  <stop stopColor="hsl(var(--primary))" />
                  <stop offset="1" stopColor="hsl(var(--primary-glow, var(--primary)))" />
                </linearGradient>
              </defs>
              {/* Trazado progresivo del Monograma FP */}
              <motion.path
                d="M 15 38 V 10 H 26 C 32 10 35 13 35 17 C 35 21 32 24 26 24 H 15"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.path
                d="M 15 30 H 26"
                stroke="hsl(var(--primary))"
                strokeWidth="3.2"
                strokeLinecap="round"
                initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.circle
                cx="25.5"
                cy="17"
                r="3.6"
                fill={`url(#${coinGradId})`}
                initial={shouldReduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 20, delay: 0.35 }}
              />
            </svg>
          </motion.div>
        </div>

        {/* Título de la Aplicación */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2, duration: 0.4 }}
          className="mt-5 text-center"
        >
          <h1 className="font-display-v2 text-2xl font-semibold tracking-[-0.03em] text-[#191918] dark:text-[#F2EFE9]">
            Finance Pal
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground font-medium">
            Tu compañero financiero
          </p>
          <p className="mt-0.5 font-mono text-[9.5px] tracking-[0.16em] uppercase text-[#6E6A63] dark:text-[#8E8D8A]">
            BÓVEDA PATRIMONIAL · V2
          </p>
        </motion.div>

        {/* Cajetilla de Telemetría Dinámica (Editorial Ledger Ticker) */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.25, duration: 0.4 }}
          className="mt-6 w-full rounded-md bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-[#222220] p-3.5 shadow-sm"
        >
          {/* Cabecera del paso y porcentaje */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-primary font-semibold tracking-wider text-[11px]">
              [PASO {currentStep.id}/04] · {currentStep.tag}
            </span>
            <span className="font-mono tabular-nums font-semibold text-foreground text-[12px]">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Mensaje de proceso en curso con transición suave */}
          <div className="mt-2 flex items-center gap-2 min-h-[22px]">
            <span className="size-2 rounded-full bg-primary shrink-0 animate-pulse" />
            <AnimatePresence mode="wait">
              <motion.span
                key={currentStep.id}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.15 }}
                className="text-[12px] text-[#191918] dark:text-[#EDEDED] font-sans truncate"
              >
                {currentStep.label}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Barra hairline de 3px */}
          <div className="mt-3 w-full h-[3px] rounded-full bg-[#E4E0D8] dark:bg-[#262624] overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>

        {/* Leyenda de integridad de datos */}
        <p className="mt-4 font-mono text-[9.5px] tracking-widest text-[#9E9A90] dark:text-[#6E6A63] uppercase text-center">
          LOCAL-FIRST · CIFRADO AES-GCM
        </p>
      </div>
    </div>
  );
});
