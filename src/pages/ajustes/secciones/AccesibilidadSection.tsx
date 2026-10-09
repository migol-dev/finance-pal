import { memo } from "react";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { AccessibilitySettings } from "@/components/app/AccessibilitySettings";
import { Accessibility } from "lucide-react";

export const AccesibilidadSection = memo(function AccesibilidadSection({ onBack }: SectionProps) {
  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Accesibilidad e Inclusión"
        description="Ajusta la escala tipográfica a tu elección, activa alto contraste WCAG AAA, fuentes para dislexia y paletas seguras"
        icon={Accessibility}
        iconColorClass="bg-rose-500/10 text-rose-500"
        onBack={onBack}
      />

      <AccessibilitySettings />
    </div>
  );
});

export default AccesibilidadSection;
