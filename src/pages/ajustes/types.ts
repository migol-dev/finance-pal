import { LucideIcon } from "lucide-react";

export type AjustesSectionId =
  | "perfil"
  | "cuentas"
  | "fijos"
  | "apariencia"
  | "accesibilidad"
  | "notificaciones"
  | "datos"
  | "seguridad";

export interface AjustesCategoryMeta {
  id: AjustesSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  colorClass: string;
}

export interface SectionProps {
  onBack: () => void;
}
