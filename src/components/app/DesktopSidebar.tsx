import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/framer";
import { navItems } from "./nav-items";
import { useFinance } from "@/store/finance-store";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { isSupabaseEnabled } from "@/lib/supabase";
import { SyncIndicator } from "./SyncIndicator";
import { BrandLogo } from "./BrandLogo";
import { Sun, Moon, Monitor, BarChart3, History } from "lucide-react";

export const DesktopSidebar = memo(function DesktopSidebar() {
  const { themePreference, resolvedTheme } = useSystemTheme();
  const toggleTheme = useFinance((s) => s.toggleTheme);
  const profile = useFinance((s) => s.profile);
  const location = useLocation();

  const isActive = (to: string) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  const themeIcon = themePreference === "system"
    ? <Monitor className="size-4" />
    : resolvedTheme === "dark"
      ? <Moon className="size-4" />
      : <Sun className="size-4" />;

  const themeLabel = themePreference === "system"
    ? "Sistema"
    : resolvedTheme === "dark"
      ? "Oscuro"
      : "Claro";

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 lg:h-screen lg:border-r lg:border-border lg:bg-sidebar lg:p-5">
      <div className="mb-8 px-2">
        <BrandLogo size="md" withText subtitle={profile.name} />
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative group",
                active
                  ? "text-primary"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
              )}
            >
              {active && (
                <motion.div
                  layoutId="desktopSidebarNav"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn("size-[18px] relative z-10", active ? "text-primary" : "text-sidebar-foreground group-hover:text-foreground")} />
              <span className="relative z-10">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mb-4 border-t border-border pt-4 space-y-1">
        <NavLink
          to="/anual"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all",
              isActive
                ? "text-primary bg-primary/10"
                : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
            )
          }
        >
          <BarChart3 className="size-4" />
          <span>Resumen anual</span>
        </NavLink>
        <NavLink
          to="/historial"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all",
              isActive
                ? "text-primary bg-primary/10"
                : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"
            )
          }
        >
          <History className="size-4" />
          <span>Historial</span>
        </NavLink>
      </div>

      {isSupabaseEnabled && <SyncIndicator showLabel className="mb-3" />}

      <button
        onClick={toggleTheme}
        aria-label={`Cambiar tema. Modo actual: ${themeLabel}`}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition w-full"
      >
        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {themeIcon}
        </div>
        <span>Tema: {themeLabel}</span>
      </button>
    </aside>
  );
});

