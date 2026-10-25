import { memo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, ListTree, Target, Plus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/framer";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import { MoreNavSheet } from "./MoreNavSheet";

const PRIMARY_LEFT_NAV = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/movimientos", icon: ListTree, label: "Movimientos" },
];

const PRIMARY_RIGHT_NAV = [
  { to: "/metas", icon: Target, label: "Metas" },
];

const MORE_ROUTES = ["/deudas", "/anual", "/historial", "/ajustes"];

export const BottomNavV2 = memo(function BottomNavV2() {
  const openQuickTx = useQuickTxModal((s) => s.openQuickTx);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const isMoreActive = MORE_ROUTES.some((route) =>
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  return (
    <>
      <nav
        aria-label="Navegación principal inferior v2"
        className="fixed bottom-0 inset-x-0 z-50 safe-bottom lg:hidden"
      >
        <div className="mx-auto max-w-lg px-2 sm:px-3 pb-2 sm:pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="bg-card/90 backdrop-blur-md rounded-2xl border border-border/80 shadow-lg shadow-black/5 dark:shadow-black/25 flex items-center justify-around px-1 py-1"
          >
            {/* Primeros 2 items: Inicio y Movimientos */}
            {PRIMARY_LEFT_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl text-[11px] font-medium transition-all relative min-w-[44px]",
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
                    <span className="relative z-10 text-[11px] tracking-[-0.025em] font-medium text-center leading-tight whitespace-nowrap overflow-visible">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}

            {/* Botón Central Elevado (+) */}
            <div className="relative -mt-4 px-1 shrink-0">
              <button
                type="button"
                onClick={() => openQuickTx("expense")}
                aria-label="Registrar movimiento rápido"
                className="size-11 min-[360px]:size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform duration-150 border-2 border-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Plus className="size-6 text-primary-foreground" strokeWidth={2.5} />
              </button>
            </div>

            {/* Item 4: Metas */}
            {PRIMARY_RIGHT_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl text-[11px] font-medium transition-all relative min-w-[44px]",
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
                    <span className="relative z-10 text-[11px] tracking-[-0.025em] font-medium text-center leading-tight whitespace-nowrap overflow-visible">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}

            {/* Enlace accesible para lectores de pantalla a Deudas */}
            <NavLink to="/deudas" aria-label="Deudas" className="sr-only">
              Deudas
            </NavLink>

            {/* Item 5: Más ••• que abre MoreNavSheet */}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="Más opciones"
              aria-expanded={moreOpen}
              className={cn(
                "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl text-[11px] font-medium transition-all relative min-w-[44px]",
                isMoreActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground/70 hover:text-foreground active:scale-95"
              )}
            >
              {isMoreActive && (
                <motion.div
                  layoutId="activeNavV2"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <MoreHorizontal
                className={cn("size-5 relative z-10", isMoreActive && "text-primary")}
                strokeWidth={isMoreActive ? 2 : 1.75}
              />
              <span className="relative z-10 text-[11px] tracking-[-0.025em] font-medium text-center leading-tight whitespace-nowrap overflow-visible">
                Más
              </span>
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Hoja deslizante de navegación táctil para móvil */}
      <MoreNavSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
});
