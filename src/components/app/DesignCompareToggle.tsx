import { useEffect, useState, memo, useCallback } from "react";
import { useFinance } from "@/store/finance-store";
import { Sparkles, Layers, X } from "lucide-react";
import { toast } from "sonner";

export const DesignCompareToggle = memo(function DesignCompareToggle() {
  const uiVersion = useFinance((s) => s?.appSettings?.uiVersion ?? "v2");
  const toggleUIVersion = useFinance((s) => s?.toggleUIVersion);
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = useCallback(() => {
    const next = uiVersion === "v2" ? "classic" : "v2";
    toggleUIVersion?.();
    if (next === "v2") {
      toast.success("Diseño activo: Warm Editorial (v2)", {
        id: "ui-version-toast",
        description: "Estética cálida en alabastro, tipografía editorial y nuevo monograma FP.",
      });
    } else {
      toast.info("Diseño activo: Clásico (v1)", {
        id: "ui-version-toast",
        description: "Interfaz tradicional original de Finance Pal.",
      });
    }
  }, [uiVersion, toggleUIVersion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea, [contenteditable='true'], select")) {
        return;
      }
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        handleToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleToggle]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="Mostrar conmutador de diseño (Alt + D)"
        aria-label="Mostrar conmutador de versión de diseño"
        className="fixed z-50 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-20 right-4 lg:bottom-6 lg:right-6 size-9 rounded-full bg-card/90 backdrop-blur-md border border-border/80 shadow-md text-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <Sparkles className="size-4 text-primary" />
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Conmutador de versión de diseño"
      className="fixed z-50 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-20 right-4 lg:bottom-6 lg:right-6 flex items-center gap-1.5 p-1.5 pl-3 rounded-full bg-card/95 backdrop-blur-md border border-border/80 shadow-lg text-foreground animate-in fade-in slide-in-from-bottom-2 duration-200 select-none"
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 text-xs font-semibold hover:opacity-85 active:scale-[0.98] transition-all"
        title="Alternar diseño de la interfaz (Atajo: Alt + D)"
      >
        {uiVersion === "v2" ? (
          <>
            <span className="flex items-center justify-center size-5 rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-3" />
            </span>
            <span className="font-display-v2 font-bold text-foreground">
              Warm Editorial <span className="text-[10px] text-primary uppercase font-mono px-1 py-0.5 rounded bg-primary/10 ml-0.5">v2</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center justify-center size-5 rounded-full bg-muted text-muted-foreground">
              <Layers className="size-3" />
            </span>
            <span className="font-sans font-medium text-foreground">
              Clásico <span className="text-[10px] text-muted-foreground uppercase font-mono px-1 py-0.5 rounded bg-muted ml-0.5">v1</span>
            </span>
          </>
        )}
        <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/90 text-muted-foreground border border-border/60">
          Alt+D
        </kbd>
      </button>

      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
        title="Ocultar conmutador"
        aria-label="Minimizar conmutador"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
});
