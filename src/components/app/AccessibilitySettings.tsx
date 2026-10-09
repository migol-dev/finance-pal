import { memo } from "react";
import { useFinance } from "@/store/finance-store";
import {
  TextScale,
  ColorBlindMode,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from "@/lib/finance";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Type,
  Eye,
  ZapOff,
  Contrast,
  Underline,
  MousePointerClick,
  Palette,
  Focus,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const AccessibilitySettings = memo(function AccessibilitySettings() {
  const a11y = useFinance((s) => s.appSettings.accessibility ?? DEFAULT_ACCESSIBILITY_SETTINGS);
  const setA11y = useFinance((s) => s.setAccessibilitySettings);

  const handleReset = () => {
    setA11y(DEFAULT_ACCESSIBILITY_SETTINGS);
    toast.success("Opciones de accesibilidad restablecidas");
  };

  return (
    <div className="space-y-4">
      {/* 1. Text Scale */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-soft space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Type className="size-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Tamaño del texto</h3>
            <p className="text-xs text-muted-foreground">Ajusta el tamaño general de tipografía de la aplicación</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          {(
            [
              { id: "compact", label: "90%", desc: "Pequeño" },
              { id: "normal", label: "100%", desc: "Normal" },
              { id: "large", label: "115%", desc: "Grande" },
              { id: "xlarge", label: "130%", desc: "Máximo" },
            ] as const
          ).map((s) => {
            const active = a11y.textScale === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setA11y({ textScale: s.id as TextScale })}
                aria-pressed={active}
                className={`py-2 px-1 rounded-xl text-center border transition flex flex-col items-center justify-center ${
                  active
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className="text-sm font-extrabold">{s.label}</span>
                <span className="text-[10px] opacity-80 mt-0.5">{s.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Visual & Cognitive Toggles */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-soft space-y-4">
        {/* High contrast */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Contrast className="size-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-high-contrast" className="font-bold text-sm cursor-pointer">
                Alto contraste
              </Label>
              <p className="text-xs text-muted-foreground">Bordes más visibles y textos con mayor separación tonal</p>
            </div>
          </div>
          <Switch
            id="a11y-high-contrast"
            checked={a11y.highContrast}
            onCheckedChange={(v) => setA11y({ highContrast: v })}
            aria-label="Activar alto contraste"
          />
        </div>

        <div className="border-t border-border/60" />

        {/* Reduce Motion */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ZapOff className="size-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-reduce-motion" className="font-bold text-sm cursor-pointer">
                Reducir movimiento
              </Label>
              <p className="text-xs text-muted-foreground">Desactiva animaciones y transiciones decorativas</p>
            </div>
          </div>
          <Switch
            id="a11y-reduce-motion"
            checked={a11y.reduceMotion}
            onCheckedChange={(v) => setA11y({ reduceMotion: v })}
            aria-label="Reducir movimiento y animaciones"
          />
        </div>

        <div className="border-t border-border/60" />

        {/* Dyslexic font */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Eye className="size-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-dyslexic" className="font-bold text-sm cursor-pointer">
                Tipografía hiperlegible
              </Label>
              <p className="text-xs text-muted-foreground">Mayor separación entre letras para facilitar la lectura</p>
            </div>
          </div>
          <Switch
            id="a11y-dyslexic"
            checked={a11y.dyslexicFont}
            onCheckedChange={(v) => setA11y({ dyslexicFont: v })}
            aria-label="Activar tipografía hiperlegible"
          />
        </div>

        <div className="border-t border-border/60" />

        {/* Underline links */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Underline className="size-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-underline" className="font-bold text-sm cursor-pointer">
                Subrayar enlaces
              </Label>
              <p className="text-xs text-muted-foreground">Subraya elementos interactivos para identificarlos sin depender del color</p>
            </div>
          </div>
          <Switch
            id="a11y-underline"
            checked={a11y.underlineLinks}
            onCheckedChange={(v) => setA11y({ underlineLinks: v })}
            aria-label="Subrayar enlaces y botones"
          />
        </div>

        <div className="border-t border-border/60" />

        {/* Large touch targets */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MousePointerClick className="size-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-large-targets" className="font-bold text-sm cursor-pointer">
                Objetivos táctiles ampliados
              </Label>
              <p className="text-xs text-muted-foreground">Botones y áreas de pulsación con mínimo de 48px</p>
            </div>
          </div>
          <Switch
            id="a11y-large-targets"
            checked={a11y.largeTouchTargets}
            onCheckedChange={(v) => setA11y({ largeTouchTargets: v })}
            aria-label="Ampliar tamaño mínimo de botones y controles"
          />
        </div>

        <div className="border-t border-border/60" />

        {/* Enhanced focus ring */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Focus className="size-4" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-focus" className="font-bold text-sm cursor-pointer">
                Realce del indicador de foco
              </Label>
              <p className="text-xs text-muted-foreground">Borde grueso de alta visibilidad al navegar con teclado (Tab)</p>
            </div>
          </div>
          <Switch
            id="a11y-focus"
            checked={a11y.enhancedFocusRing}
            onCheckedChange={(v) => setA11y({ enhancedFocusRing: v })}
            aria-label="Activar realce del indicador de foco por teclado"
          />
        </div>
      </div>

      {/* 3. Color blindness palette */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-soft space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Palette className="size-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Paleta para daltonismo</h3>
            <p className="text-xs text-muted-foreground">Colores distintivos para identificar Ingresos y Gastos</p>
          </div>
        </div>

        <Select
          value={a11y.colorBlindMode}
          onValueChange={(v) => setA11y({ colorBlindMode: v as ColorBlindMode })}
        >
          <SelectTrigger className="h-11 rounded-xl bg-muted/40">
            <SelectValue placeholder="Seleccionar modo" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="none">Estándar (Verde / Rojo)</SelectItem>
            <SelectItem value="deuteranopia">Deuteranopia (Azul Cian / Naranja)</SelectItem>
            <SelectItem value="protanopia">Protanopia (Azul Cielo / Bermellón)</SelectItem>
            <SelectItem value="tritanopia">Tritanopia (Esmeralda / Fucsia)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 text-xs font-semibold">
          <span className="text-muted-foreground">Vista previa:</span>
          <span className="text-success font-bold">+ $1,250.00 (Ingreso)</span>
          <span className="text-destructive font-bold">- $450.00 (Gasto)</span>
        </div>
      </div>

      {/* Reset button */}
      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          className="rounded-xl text-xs h-9 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5 mr-1.5" />
          Restablecer accesibilidad
        </Button>
      </div>
    </div>
  );
});

export default AccessibilitySettings;
