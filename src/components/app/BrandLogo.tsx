import { memo } from "react";
import logoImg from "@/assets/nuevo_logo.webp";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  withText?: boolean;
  subtitle?: string;
  className?: string;
  imgClassName?: string;
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
}: BrandLogoProps) {
  const s = SIZE_MAP[size] || SIZE_MAP.md;

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
});
