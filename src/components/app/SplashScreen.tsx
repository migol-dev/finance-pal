import { motion } from "@/lib/framer";
import { Wallet } from "lucide-react";
import { useFinance } from "@/store/finance-store";

export function SplashScreen() {
  const uiVersion = useFinance((s) => s?.appSettings?.uiVersion ?? "v2");

  if (uiVersion === "classic") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <div className="relative flex items-center justify-center">
          <span className="absolute size-32 rounded-[32px] bg-primary/20 animate-pulse-ring" />
          <span className="absolute size-32 rounded-[32px] bg-primary/10 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="size-24 rounded-[28px] gradient-primary shadow-glow flex items-center justify-center relative z-10"
          >
            <Wallet className="size-12 text-primary-foreground" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-xl font-extrabold tracking-tight">Finance Pal</p>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-2 rounded-full bg-primary"
                animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // --- V2: Warm Editorial Wealth Animated SplashScreen ---
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background text-foreground transition-colors duration-500">
      {/* Halo ambiental suave con acento editorial */}
      <div className="relative flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <span className="absolute size-36 rounded-3xl bg-primary/10 blur-xl animate-pulse" />
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="size-28 rounded-2xl bg-card border border-border/80 shadow-soft flex items-center justify-center relative z-10 p-2"
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
              aria-label="Finance Pal Isotipo Animado"
            >
              <defs>
                <linearGradient id="splash-fp-coin" x1="20" y1="12" x2="32" y2="24" gradientUnits="userSpaceOnUse">
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
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* Barra transversal de la F */}
              <motion.path
                d="M 15 30 H 26"
                stroke="hsl(var(--primary))"
                strokeWidth="3.2"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* Brote elástico de la Semilla / Moneda Próspera */}
              <motion.circle
                cx="25.5"
                cy="17"
                r="3.6"
                fill="url(#splash-fp-coin)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.45 }}
              />
              {/* Destello especular */}
              <motion.circle
                cx="24.4"
                cy="15.8"
                r="1.1"
                fill="#FFFFFF"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 0.9, scale: 1 }}
                transition={{ delay: 0.65, duration: 0.2 }}
              />
            </svg>
          </motion.div>
        </div>

        {/* Identidad editorial */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 text-center"
        >
          <h1 className="font-display-v2 text-2xl font-bold tracking-tight text-foreground">
            Finance Pal
          </h1>
          <p className="mt-1 text-xs text-muted-foreground font-medium tracking-wide">
            Tu compañero financiero
          </p>
        </motion.div>

        {/* Barra de progreso sutil y elegante */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 w-28 h-1 rounded-full bg-muted overflow-hidden"
        >
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
