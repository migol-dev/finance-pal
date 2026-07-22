import { memo } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/framer";
import { navItems } from "./nav-items";

export const BottomNav = memo(function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-bottom lg:hidden">
      <div className="mx-auto max-w-lg px-3 pb-3">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-strong rounded-2xl border border-border/80 shadow-card flex items-center justify-around px-1.5 py-1.5"
        >
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl text-[9px] font-semibold transition-all min-w-[48px] relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("size-5 relative z-10", isActive && "text-primary")} />
                  <span className="relative z-10">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </motion.div>
      </div>
    </nav>
  );
});
