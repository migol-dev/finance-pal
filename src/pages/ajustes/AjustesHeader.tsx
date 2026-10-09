import { memo } from "react";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AjustesHeaderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  iconColorClass?: string;
  onBack: () => void;
}

export const AjustesHeader = memo(function AjustesHeader({
  title,
  description,
  icon: Icon,
  iconColorClass = "bg-primary/10 text-primary",
  onBack,
}: AjustesHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label="Volver al menú de Ajustes"
          className="rounded-xl px-2.5 h-9 -ml-2 text-muted-foreground hover:text-foreground font-semibold flex items-center gap-2 transition"
        >
          <ArrowLeft className="size-4" />
          <span>Ajustes</span>
        </Button>
      </div>

      <div className="flex items-start gap-3.5 pt-1">
        {Icon && (
          <div className={`size-11 rounded-2xl ${iconColorClass} flex items-center justify-center shrink-0 shadow-soft`}>
            <Icon className="size-5.5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
    </div>
  );
});

export default AjustesHeader;
