import { useEffect, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  ListTree,
  HandCoins,
  Target,
  BarChart3,
  History,
  Settings,
  PlusCircle,
  SunMoon,
  Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { useFinance } from "@/store/finance-store";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CommandPalette = memo(function CommandPalette({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const navigate = useNavigate();
  const toggleTheme = useFinance((s) => s.toggleTheme);
  const toggleUIVersion = useFinance((s) => s.toggleUIVersion);
  const openQuickTx = useQuickTxModal((s) => s.openQuickTx);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (isControlled && setControlledOpen) {
        setControlledOpen(open);
      } else {
        setInternalOpen(open);
      }
    },
    [isControlled, setControlledOpen]
  );

  // Escuchar atajo global ⌘K o Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        // ⌘K / Ctrl+K funciona también dentro de inputs (patrón universal de command bar)
        e.preventDefault();
        handleOpenChange(!isOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleOpenChange]);

  const runCommand = useCallback(
    (command: () => void) => {
      handleOpenChange(false);
      command();
    },
    [handleOpenChange]
  );

  return (
    <CommandDialog open={isOpen} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Escribe un comando o busca una sección..." />
      <CommandList className="max-h-[360px] p-2 text-foreground">
        <CommandEmpty className="py-8 text-center text-xs text-muted-foreground">
          No se encontraron resultados.
        </CommandEmpty>

        <CommandGroup heading="Acciones Rápidas">
          <CommandItem
            onSelect={() => runCommand(() => openQuickTx("expense"))}
            onClick={() => runCommand(() => openQuickTx("expense"))}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <PlusCircle className="size-4 text-primary" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Nuevo Movimiento Rápido</span>
            <CommandShortcut>+</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(toggleTheme)}
            onClick={() => runCommand(toggleTheme)}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <SunMoon className="size-4 text-amber-500" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Alternar Tema (Claro / Oscuro)</span>
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(toggleUIVersion)}
            onClick={() => runCommand(toggleUIVersion)}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <Sparkles className="size-4 text-emerald-500" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Alternar Diseño (Warm Editorial v2 / Clásico)</span>
            <CommandShortcut>Alt+D</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navegación de Secciones">
          <CommandItem
            onSelect={() => runCommand(() => navigate("/"))}
            onClick={() => runCommand(() => navigate("/"))}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <Home className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Inicio (Dashboard)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/movimientos"))}
            onClick={() => runCommand(() => navigate("/movimientos"))}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <ListTree className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Movimientos y Transacciones</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/deudas"))}
            onClick={() => runCommand(() => navigate("/deudas"))}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <HandCoins className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Deudas y Compromisos</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/metas"))}
            onClick={() => runCommand(() => navigate("/metas"))}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <Target className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Metas Financieras y Ahorros</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/anual"))}
            onClick={() => runCommand(() => navigate("/anual"))}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <BarChart3 className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Balance y Resumen Anual</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/historial"))}
            onClick={() => runCommand(() => navigate("/historial"))}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <History className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Historial y Auditoría</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/ajustes"))}
            onClick={() => runCommand(() => navigate("/ajustes"))}
          >
            <span className="size-7 rounded-lg border border-[#E4E0D8]/80 dark:border-white/[0.08] bg-background/80 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <Settings className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <span className="flex-1 truncate">Ajustes y Configuración</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      <div className="border-t border-[#E4E0D8]/80 dark:border-white/[0.08] px-4 py-2 bg-muted/20 dark:bg-white/[0.015] flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="font-mono-tabular text-[10px] px-1 py-0.5 rounded border border-[#E4E0D8] dark:border-white/10 bg-background/80 dark:bg-white/[0.05]">
              ↑↓
            </kbd>
            <span>Navegar</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="font-mono-tabular text-[10px] px-1 py-0.5 rounded border border-[#E4E0D8] dark:border-white/10 bg-background/80 dark:bg-white/[0.05]">
              ↵
            </kbd>
            <span>Abrir</span>
          </span>
        </div>
        <span className="font-mono-tabular text-[10px] tracking-wider uppercase opacity-75">
          ⌘K
        </span>
      </div>
    </CommandDialog>
  );
});
