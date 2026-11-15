import { memo, useState } from "react";
import { useLocation } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MORE_SECONDARY_ROUTES_V2 } from "./nav-items";
import { MoreNavSheet } from "./MoreNavSheet";

interface HeaderMoreButtonProps {
  className?: string;
}

/**
 * Disparador compacto del menú "Más opciones" en la barra superior móvil/tablet (< lg).
 * Reemplaza el botón "Más" del dock inferior para liberar un espacio primario para Deudas.
 */
export const HeaderMoreButton = memo(function HeaderMoreButton({
  className,
}: HeaderMoreButtonProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const isMoreActive = MORE_SECONDARY_ROUTES_V2.some(
    (route) => location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMoreOpen(true)}
        aria-label="Más opciones"
        aria-expanded={moreOpen}
        title="Más opciones"
        data-testid="header-more-button"
        className={cn(
          "lg:hidden relative size-11 min-h-[44px] min-w-[44px] rounded-xl border border-border bg-card hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isMoreActive && "border-primary/40 bg-primary/5 text-primary",
          className
        )}
      >
        <MoreHorizontal className="size-4" strokeWidth={1.75} />
        {isMoreActive && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 size-1.5 rounded-full bg-primary"
          />
        )}
      </button>

      <MoreNavSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
});
