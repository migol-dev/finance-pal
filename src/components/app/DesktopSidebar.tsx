import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/framer";
import { navItems } from "./nav-items";
import { useFinance } from "@/store/finance-store";
import { isSupabaseEnabled } from "@/lib/supabase";
import { SyncIndicator } from "./SyncIndicator";
import { Sun, Moon, BarChart3, History, Wallet } from "lucide-react";

const appIcon = "/icon-512.webp";

export const DesktopSidebar = memo(function DesktopSidebar() {
  const theme = useFinance((s) => s.theme);
  const toggleTheme = useFinance((s) => s.toggleTheme);
  const profile = useFinance((s) => s.profile);
  const location = useLocation();

  const isActive = (to: string) => location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 lg:h-screen lg:border-r lg:border-border lg:bg-sidebar lg:p-5">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="size-10 rounded-xl gradient-primary shadow-glow flex items-center justify-center">
          <Wallet className="size-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-extrabold tracking-tight">Finance Pal</p>
          {profile.name && (
            <p className="text-[11px] text-muted-foreground leading-tight font-medium">{profile.name}</p>
          )}
        </div>
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
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition w-full"
      >
        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </div>
        <span>Tema {theme === "dark" ? "oscuro" : "claro"}</span>
      </button>
    </aside>
  );
});
