import { Home, ListTree, HandCoins, Target, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const navItems: NavItem[] = [
  { to: "/", icon: Home, label: "Inicio" },
  { to: "/movimientos", icon: ListTree, label: "Movimientos" },
  { to: "/deudas", icon: HandCoins, label: "Deudas" },
  { to: "/metas", icon: Target, label: "Metas" },
  { to: "/ajustes", icon: Settings, label: "Ajustes" },
];

/**
 * Rutas primarias y secundarias compartidas entre AppShell (gestos swipe y botón atrás),
 * BottomNavV2, DesktopSidebarV2 y HeaderMoreButton.
 */

export const MOBILE_PRIMARY_ROUTES_V2 = ["/", "/movimientos", "/metas", "/deudas"] as const;

export const SWIPE_ROUTES_CLASSIC = ["/", "/movimientos", "/deudas", "/metas", "/ajustes"] as const;

export const MORE_SECONDARY_ROUTES_V2 = ["/anual", "/historial", "/ajustes"] as const;
