import { memo } from "react";
import type { LucideProps } from "lucide-react";
import { resolveIconId, type AppIconId } from "@/lib/icon-ids";
import { cn } from "@/lib/utils";
import { APP_ICONS } from "./registry";

export interface AppIconProps extends Omit<LucideProps, "name"> {
  name?: AppIconId | string | null;
  fallback?: AppIconId;
}

/**
 * Renderiza un icono SVG vectorial adaptable al tema (currentColor).
 * Acepta tanto un AppIconId tipado como un emoji legado (traducido al vuelo).
 */
export const AppIcon = memo(function AppIcon({
  name,
  fallback = "tag",
  className,
  strokeWidth = 1.75,
  ...rest
}: AppIconProps) {
  const iconId = resolveIconId(name, fallback);
  const Component = APP_ICONS[iconId] ?? APP_ICONS[fallback];

  return (
    <Component
      aria-hidden="true"
      strokeWidth={strokeWidth}
      className={cn("size-4 shrink-0", className)}
      {...rest}
    />
  );
});
