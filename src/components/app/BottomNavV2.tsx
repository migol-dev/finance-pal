import { memo } from "react";
import { NavLink } from "react-router-dom";
import { Home, ListTree, HandCoins, Target, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/framer";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";

const NAV_ITEMS_V2 = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/movimientos", icon: ListTree, label: "Movimientos" },
  // El centro está reservado para el botón táctil (+)
  { to: "/deudas", icon: HandCoins, label: "Deudas" },
  { to: "/metas", icon: Target, label: "Metas" },
];

export const BottomNavV2 = memo(function BottomNavV2() {
  const openQuickTx = useQuickTxModal((s) => s.openQuickTx);

  return (
    <nav
      aria-label="Navegación principal inferior v2"
      className="fixed bottom-0 inset-x-0 z-50 safe-bottom lg:hidden"
    >
      <div className="mx-auto max-w-lg px-2 sm:px-3 pb-2 sm:pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-lg shadow-black/5 dark:shadow-black/25 flex items-center justify-around px-1 py-1.5"
        >
          {/* Primeros 2 items: Inicio y Movimientos */}
          {NAV_ITEMS_V2.slice(0, 2).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] min-[360px]:text-micro font-semibold transition-all min-w-[42px] min-[360px]:min-w-[50px] relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-foreground active:scale-95"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavV2"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn("size-5 relative z-10", isActive && "text-primary")}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  <span className="relative z-10 truncate max-w-[56px] text-center leading-none">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Botón Central Elevado (+) */}
          <div className="relative -mt-4 px-1">
            <button
              type="button"
              onClick={() => openQuickTx("expense")}
              aria-label="Registrar movimiento rápido"
              className="size-11 min-[360px]:size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform duration-150 border-2 border-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Plus className="size-6 text-primary-foreground" strokeWidth={2.5} />
            </button>
          </div>

          {/* Últimos 2 items: Deudas y Metas */}
          {NAV_ITEMS_V2.slice(2, 4).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] min-[360px]:text-micro font-semibold transition-all min-w-[42px] min-[360px]:min-w-[50px] relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-foreground active:scale-95"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavV2"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn("size-5 relative z-10", isActive && "text-primary")}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  <span className="relative z-10 truncate max-w-[56px] text-center leading-none">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </motion.div>
      </div>
    </nav>
  );
});
