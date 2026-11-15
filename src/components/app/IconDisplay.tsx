import { forwardRef, memo } from "react";
import { IconRef } from "@/lib/finance";
import { resolveIconId } from "@/lib/icon-ids";
import { AppIcon } from "@/components/icons/AppIcon";
import { cn } from "@/lib/utils";

interface Props {
  icon: IconRef;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const iconSizeMap: Record<NonNullable<Props["size"]>, string> = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-9",
};

/**
 * Renders an SVG vector icon or cropped image thumbnail with consistent sizing
 * and theme-adaptive colors. Legacy emoji refs are resolved to AppIconId on the fly.
 * forwardRef so it works inside framer-motion <AnimatePresence>.
 */
export const IconDisplay = memo(forwardRef<HTMLDivElement, Props>(function IconDisplay(
  { icon, className, size = "md" },
  ref
) {
  const sizeMap = {
    xs: "size-6 text-xs",
    sm: "size-9 text-base",
    md: "size-11 text-xl",
    lg: "size-14 text-2xl",
    xl: "size-20 text-4xl",
  };
  const safe: IconRef =
    icon && (icon.kind === "icon" || icon.kind === "image" || icon.kind === "emoji") && typeof icon.value === "string"
      ? icon
      : { kind: "icon", value: "sparkles" };

  if (safe.kind === "image") {
    return (
      <div ref={ref} className={cn("rounded-2xl overflow-hidden bg-muted shrink-0", sizeMap[size], className)}>
        <img src={safe.value} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      </div>
    );
  }
  const iconId = resolveIconId(safe.value, "sparkles");
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0",
        sizeMap[size],
        className
      )}
    >
      <AppIcon name={iconId} className={iconSizeMap[size]} />
    </div>
  );
}));
