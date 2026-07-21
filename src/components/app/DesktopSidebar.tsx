import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/framer";
import { navItems } from "./nav-items";
import { useFinance } from "@/store/finance-store";
import { useNetwork } from "@/hooks/useNetwork";
import { useSyncStore } from "@/store/sync-store";
import { isSupabaseEnabled } from "@/lib/supabase";
import { Cloud, CloudOff, RefreshCw, Sun, Moon } from "lucide-react";

const appIcon = "/icon-512.webp";

export const DesktopSidebar = memo(function DesktopSidebar() {
  const theme = useFinance((s) => s.theme);
  const toggleTheme = useFinance((s) => s.toggleTheme);
  const profile = useFinance((s) => s.profile);
  const { isOnline } = useNetwork();
  const syncQueue = useSyncStore((s) => s.syncQueue);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const location = useLocation();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 lg:h-screen lg:border-r lg:border-border lg:bg-card lg:p-6">
      {/* Logo / App name */}
      <div className="flex items-center gap-3 mb-8">
        <img src={appIcon} alt="" width={36} height={36} className="size-9 rounded-xl shadow-glow" />
        <div>
          <p className="text-sm font-extrabold tracking-tight">Finance Pal</p>
          {profile.name && (
            <p className="text-[10px] text-muted-foreground leading-tight">{profile.name}</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all relative",
                isActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="desktopSidebarNav"
                  className="absolute inset-0 gradient-primary rounded-2xl shadow-glow"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className="size-5 relative z-10" />
              <span className="relative z-10">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sync indicator */}
      {isSupabaseEnabled && (
        <div className="mb-3 px-4 py-2 rounded-2xl bg-muted/50 text-xs flex items-center gap-2 text-muted-foreground">
          {!isOnline ? (
            <>
              <CloudOff className="size-3.5 text-yellow-500" />
              <span>Sin conexión</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="size-3.5 text-blue-500 animate-spin" />
              <span>Sincronizando...</span>
            </>
          ) : syncQueue.length > 0 ? (
            <>
              <Cloud className="size-3.5 text-yellow-500" />
              <span>{syncQueue.length} cambio{syncQueue.length !== 1 ? "s" : ""} pendiente{syncQueue.length !== 1 ? "s" : ""}</span>
            </>
          ) : (
            <>
              <Cloud className="size-3.5 text-green-500" />
              <span>Sincronizado</span>
            </>
          )}
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition w-full"
      >
        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </div>
        <span>Tema {theme === "dark" ? "oscuro" : "claro"}</span>
      </button>
    </aside>
  );
});
