import { useState, memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  ListTree,
  HandCoins,
  Target,
  BarChart3,
  History,
  Settings,
  Sun,
  Moon,
  Monitor,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/framer";
import { useFinance } from "@/store/finance-store";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { isSupabaseEnabled } from "@/lib/supabase";
import { SyncIndicator } from "./SyncIndicator";
import { BrandLogo } from "./BrandLogo";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";

const PRIMARY_NAV = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/movimientos", icon: ListTree, label: "Movimientos" },
  { to: "/deudas", icon: HandCoins, label: "Deudas" },
  { to: "/metas", icon: Target, label: "Metas" },
];

const SECONDARY_NAV = [
  { to: "/anual", icon: BarChart3, label: "Balance Anual" },
  { to: "/historial", icon: History, label: "Historial" },
];

export const DesktopSidebarV2 = memo(function DesktopSidebarV2() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const { themePreference, resolvedTheme } = useSystemTheme();
  const toggleTheme = useFinance((s) => s.toggleTheme);
  const profile = useFinance((s) => s.profile);
  const openQuickTx = useQuickTxModal((s) => s.openQuickTx);

  const isActive = (to: string) =>
    location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  const triggerCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  };

  const themeIcon =
    themePreference === "system" ? (
      <Monitor className="size-4" strokeWidth={1.75} />
    ) : resolvedTheme === "dark" ? (
      <Moon className="size-4" strokeWidth={1.75} />
    ) : (
      <Sun className="size-4" strokeWidth={1.75} />
    );

  const themeLabel =
    themePreference === "system" ? "Sistema" : resolvedTheme === "dark" ? "Oscuro" : "Claro";

  return (
    <aside
      aria-label="Navegación lateral de escritorio v2"
      className={cn(
        "hidden lg:flex lg:flex-col lg:h-screen lg:shrink-0 lg:border-r lg:border-border lg:bg-card/95 lg:backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] z-40 select-none",
        isCollapsed ? "lg:w-[72px] lg:p-3" : "lg:w-[256px] xl:w-[264px] lg:p-4"
      )}
    >
      {/* Cabecera con BrandLogo y Toggle de Colapso */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="overflow-hidden">
          <BrandLogo
            size={isCollapsed ? "sm" : "md"}
            withText={!isCollapsed}
            subtitle={!isCollapsed ? profile?.name || "Finanzas Personales" : undefined}
          />
        </div>
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors"
            aria-label="Colapsar barra lateral"
            title="Colapsar barra lateral"
          >
            <PanelLeftClose className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Gatillo de Command Palette (⌘K) */}
      <div className="mb-4">
        <button
          type="button"
          onClick={triggerCommandPalette}
          className={cn(
            "w-full flex items-center rounded-xl border border-border/70 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-xs font-medium",
            isCollapsed ? "justify-center h-10 p-0" : "justify-between h-9 px-2.5"
          )}
          title="Buscar o comandos (⌘K)"
          aria-label="Buscar o comandos (⌘K)"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5" strokeWidth={1.75} />
            {!isCollapsed && <span>Buscar...</span>}
          </div>
          {!isCollapsed && (
            <kbd className="font-mono text-[10px] tracking-widest bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded border border-border/50">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Botón de Acción Rápida "+ Nuevo Movimiento" */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => openQuickTx("expense")}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all",
            isCollapsed ? "h-10 px-0" : "h-9 px-3"
          )}
          title="Registrar nuevo movimiento"
          aria-label="Registrar nuevo movimiento"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          {!isCollapsed && <span>Nuevo Movimiento</span>}
        </button>
      </div>

      {/* Navegación Primaria */}
      <nav className="flex-1 space-y-1">
        {PRIMARY_NAV.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative group",
                isCollapsed ? "justify-center px-0" : "",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={isCollapsed ? label : undefined}
            >
              {active && (
                <motion.div
                  layoutId="desktopSidebarNavV2"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn("size-4 relative z-10 shrink-0", active ? "text-primary" : "")}
                strokeWidth={active ? 2 : 1.75}
              />
              {!isCollapsed && <span className="relative z-10 truncate">{label}</span>}
            </NavLink>
          );
        })}

        {/* Separador sutil */}
        <div className="pt-2 pb-1">
          <div className="border-t border-border/60" />
        </div>

        {/* Navegación Secundaria */}
        {SECONDARY_NAV.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative group",
                isCollapsed ? "justify-center px-0" : "",
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Pie de Barra Lateral */}
      <div className="pt-3 border-t border-border/70 space-y-1.5">
        <NavLink
          to="/ajustes"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
              isCollapsed ? "justify-center px-0" : "",
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )
          }
          title={isCollapsed ? "Ajustes" : undefined}
        >
          <Settings className="size-4 shrink-0" strokeWidth={1.75} />
          {!isCollapsed && <span>Ajustes</span>}
        </NavLink>

        {isSupabaseEnabled && (
          <div className={cn("px-1", isCollapsed ? "flex justify-center" : "")}>
            <SyncIndicator compact={isCollapsed} />
          </div>
        )}

        <div className={cn("pt-1", isCollapsed ? "flex flex-col items-center gap-1.5" : "flex items-center justify-between")}>
          <button
            type="button"
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs font-medium py-1.5 px-2",
              isCollapsed ? "size-9 justify-center p-0" : ""
            )}
            title={`Tema: ${themeLabel}`}
            aria-label={`Cambiar tema: actualmente ${themeLabel}`}
          >
            {themeIcon}
            {!isCollapsed && <span className="text-[11px]">{themeLabel}</span>}
          </button>

          {isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors"
              aria-label="Expandir barra lateral"
              title="Expandir barra lateral"
            >
              <PanelLeft className="size-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
});
