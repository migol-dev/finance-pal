import { memo } from "react";
import logoImg from "@/assets/nuevo_logo.webp";
import { cn } from "@/lib/utils";
import { useFinance } from "@/store/finance-store";
import type { UIVersion } from "@/lib/finance";
import { motion } from "framer-motion";

export interface BrandLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  withText?: boolean;
  subtitle?: string;
  className?: string;
  imgClassName?: string;
  version?: UIVersion;
  forceVersion?: UIVersion;
  animated?: boolean;
}

const SIZE_MAP = {
  xs: { img: "size-6", text: "text-xs", sub: "text-[10px]" },
  sm: { img: "size-8", text: "text-sm", sub: "text-xs" },
  md: { img: "size-10", text: "text-base", sub: "text-xs" },
  lg: { img: "size-14", text: "text-xl", sub: "text-sm" },
  xl: { img: "size-20", text: "text-2xl", sub: "text-base" },
};

export const BrandLogo = memo(function BrandLogo({
  size = "md",
  withText = false,
  subtitle,
  className,
  imgClassName,
  version,
  forceVersion,
  animated = false,
}: BrandLogoProps) {
  const currentVersion = useFinance((s) => s?.appSettings?.uiVersion ?? "v2");
  const effectiveVersion: UIVersion = forceVersion ?? version ?? currentVersion;
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  if (effectiveVersion === "classic") {
    return (
      <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
        <div
          className={cn(
            "relative shrink-0 rounded-2xl overflow-hidden shadow-glow flex items-center justify-center bg-card border border-border/50",
            s.img,
            imgClassName
          )}
        >
          <img
            src={logoImg}
            alt="Finance Pal"
            width={80}
            height={80}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        {withText && (
          <div className="min-w-0">
            <p className={cn("font-extrabold tracking-tight leading-tight text-foreground", s.text)}>
              Finance Pal
            </p>
            {subtitle && (
              <p className={cn("text-muted-foreground font-medium truncate leading-tight", s.sub)}>
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- V2: Isotipo Vectorial "El Compañero Próspero" (Monograma FP + Semilla/Moneda) ---
  const iconContent = animated ? (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full p-1"
      initial={{ scale: 0.96 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <linearGradient id="fp-v2-coin" x1="20" y1="12" x2="32" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary))" />
          <stop offset="1" stopColor="hsl(var(--primary-glow, var(--primary)))" />
        </linearGradient>
      </defs>
      {/* Monograma continuo FP: trazo del bucle P y el asta compartida F/P */}
      <motion.path
        d="M 15 38 V 10 H 26 C 32 10 35 13 35 17 C 35 21 32 24 26 24 H 15"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Barra transversal de F */}
      <motion.path
        d="M 15 30 H 26"
        stroke="hsl(var(--primary))"
        strokeWidth="3.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Semilla / Moneda Próspera */}
      <motion.circle
        cx="25.5"
        cy="17"
        r="3.6"
        fill="url(#fp-v2-coin)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.35 }}
      />
      {/* Destello especular */}
      <motion.circle
        cx="24.4"
        cy="15.8"
        r="1.1"
        fill="#FFFFFF"
        opacity="0.9"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ delay: 0.5 }}
      />
    </motion.svg>
  ) : (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full p-1"
      aria-label="Finance Pal Isotipo"
    >
      <defs>
        <linearGradient id="fp-v2-coin-static" x1="20" y1="12" x2="32" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(var(--primary))" />
          <stop offset="1" stopColor="hsl(var(--primary-glow, var(--primary)))" />
        </linearGradient>
      </defs>
      {/* Monograma continuo FP */}
      <path
        d="M 15 38 V 10 H 26 C 32 10 35 13 35 17 C 35 21 32 24 26 24 H 15"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-foreground"
      />
      {/* Barra transversal de F */}
      <path
        d="M 15 30 H 26"
        stroke="hsl(var(--primary))"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Semilla / Moneda Próspera */}
      <circle
        cx="25.5"
        cy="17"
        r="3.6"
        fill="url(#fp-v2-coin-static)"
      />
      {/* Destello especular */}
      <circle
        cx="24.4"
        cy="15.8"
        r="1.1"
        fill="#FFFFFF"
        opacity="0.9"
      />
    </svg>
  );

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-card/80 border border-border/70 shadow-sm transition-all duration-300",
          s.img,
          imgClassName
        )}
      >
        {iconContent}
      </div>
      {withText && (
        <div className="min-w-0">
          <p className={cn("font-display-v2 font-bold tracking-tight leading-tight text-foreground", s.text)}>
            Finance Pal
          </p>
          {subtitle && (
            <p className={cn("text-muted-foreground font-medium truncate leading-tight text-xs", s.sub)}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
});
