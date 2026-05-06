import { NavLink } from "react-router-dom";
import { Home, ListTree, HandCoins, Target, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/movimientos", icon: ListTree, label: "Movimientos" },
  { to: "/deudas", icon: HandCoins, label: "Deudas" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/ajustes", icon: Settings, label: "Ajustes" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-bottom">
      <div className="mx-auto max-w-md px-3 pb-2">
        <div className="rounded-3xl bg-card/90 backdrop-blur-xl border border-border shadow-card flex items-center justify-around px-2 py-2">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl text-[10px] font-medium transition-all min-w-[56px]",
                  isActive
                    ? "text-primary-foreground gradient-primary shadow-glow scale-105"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
