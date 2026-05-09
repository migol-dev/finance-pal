import { forwardRef, memo } from "react";
import { IconRef } from "@/lib/finance";
import { cn } from "@/lib/utils";

interface Props {
  icon: IconRef;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Renders an icon (emoji or cropped image thumbnail) with consistent sizing.
 * forwardRef so it works inside framer-motion <AnimatePresence>.
 */
export const IconDisplay = memo(forwardRef<HTMLDivElement, Props>(function IconDisplay(
  { icon, className, size = "md" },
  ref
) {
  const sizeMap = {
    sm: "size-9 text-base",
    md: "size-11 text-xl",
    lg: "size-14 text-2xl",
    xl: "size-20 text-4xl",
  };
  // Defensive: handle missing/invalid icon refs gracefully
  const safe: IconRef = icon && (icon.kind === "image" || icon.kind === "emoji") && typeof icon.value === "string"
    ? icon
    : { kind: "emoji", value: "✨" };

  if (safe.kind === "image") {
    return (
      <div ref={ref} className={cn("rounded-2xl overflow-hidden bg-muted shrink-0", sizeMap[size], className)}>
        <img src={safe.value} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div ref={ref} className={cn("rounded-2xl bg-muted flex items-center justify-center shrink-0", sizeMap[size], className)}>
      <span aria-hidden>{safe.value}</span>
    </div>
  );
}));
