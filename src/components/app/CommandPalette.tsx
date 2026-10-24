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
      <CommandInput placeholder="Escribe un comando o busca una sección... (⌘K)" />
      <CommandList className="max-h-[340px] p-2 text-foreground">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          No se encontraron resultados.
        </CommandEmpty>

        <CommandGroup heading="Acciones Rápidas" className="text-xs font-semibold text-muted-foreground/80">
          <CommandItem
            onSelect={() => runCommand(() => openQuickTx("expense"))}
            onClick={() => runCommand(() => openQuickTx("expense"))}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <PlusCircle className="size-4 text-primary" strokeWidth={1.75} />
            <span className="flex-1">Nuevo Movimiento Rápido</span>
            <CommandShortcut className="font-mono text-[10px] tracking-widest text-muted-foreground">
              +
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(toggleTheme)}
            onClick={() => runCommand(toggleTheme)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <SunMoon className="size-4 text-amber-500" strokeWidth={1.75} />
            <span className="flex-1">Alternar Tema (Claro / Oscuro)</span>
            <CommandShortcut className="font-mono text-[10px] tracking-widest text-muted-foreground">
              T
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(toggleUIVersion)}
            onClick={() => runCommand(toggleUIVersion)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <Sparkles className="size-4 text-emerald-500" strokeWidth={1.75} />
            <span className="flex-1">Alternar Diseño (Warm Editorial v2 / Clásico)</span>
            <CommandShortcut className="font-mono text-[10px] tracking-widest text-muted-foreground">
              Alt+D
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1.5 bg-border/60" />

        <CommandGroup heading="Navegación de Secciones" className="text-xs font-semibold text-muted-foreground/80">
          <CommandItem
            onSelect={() => runCommand(() => navigate("/"))}
            onClick={() => runCommand(() => navigate("/"))}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <Home className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1">Inicio (Dashboard)</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/movimientos"))}
            onClick={() => runCommand(() => navigate("/movimientos"))}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <ListTree className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1">Movimientos y Transacciones</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/deudas"))}
            onClick={() => runCommand(() => navigate("/deudas"))}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <HandCoins className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1">Deudas y Compromisos</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/metas"))}
            onClick={() => runCommand(() => navigate("/metas"))}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <Target className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1">Metas Financieras y Ahorros</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/anual"))}
            onClick={() => runCommand(() => navigate("/anual"))}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <BarChart3 className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1">Balance y Resumen Anual</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/historial"))}
            onClick={() => runCommand(() => navigate("/historial"))}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <History className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1">Historial y Auditoría</span>
          </CommandItem>

          <CommandItem
            onSelect={() => runCommand(() => navigate("/ajustes"))}
            onClick={() => runCommand(() => navigate("/ajustes"))}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-accent transition-colors"
          >
            <Settings className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <span className="flex-1">Ajustes y Configuración</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
});
