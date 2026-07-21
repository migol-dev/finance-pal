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
