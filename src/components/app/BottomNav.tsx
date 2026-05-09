import { memo } from "react";
import { NavLink } from "react-router-dom";
import { Home, ListTree, HandCoins, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/framer";

const items = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/movimientos", icon: ListTree, label: "Movimientos" },
  { to: "/deudas", icon: HandCoins, label: "Deudas" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/ajustes", icon: Settings, label: "Ajustes" },
];

export const BottomNav = memo(function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-bottom">
      <div className="mx-auto max-w-md px-3 pb-2">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-3xl bg-card/90 backdrop-blur-xl border border-border shadow-card flex items-center justify-around px-2 py-2"
        >
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl text-[10px] font-medium transition-all min-w-[56px] relative",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 gradient-primary rounded-2xl shadow-glow -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="size-5" />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </motion.div>
      </div>
    </nav>
  );
});
