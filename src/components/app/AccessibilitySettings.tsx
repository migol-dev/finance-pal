import { memo } from "react";
import { useFinance } from "@/store/finance-store";
import {
  TextScale,
  ColorBlindMode,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from "@/lib/finance";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const AccessibilitySettings = memo(function AccessibilitySettings() {
  const a11y = useFinance((s) => s.appSettings.accessibility ?? DEFAULT_ACCESSIBILITY_SETTINGS);
  const setA11y = useFinance((s) => s.setAccessibilitySettings);

  const currentPercent = a11y.textScalePercent ?? (
    a11y.textScale === "compact" ? 85 :
    a11y.textScale === "large" ? 115 :
    a11y.textScale === "xlarge" ? 135 : 100
  );

  const handleSliderChange = (vals: number[]) => {
    const val = vals[0];
    let preset: TextScale = "custom";
    if (val <= 85) preset = "compact";
    else if (val === 100) preset = "normal";
    else if (val === 115) preset = "large";
    else if (val >= 135) preset = "xlarge";

    setA11y({ textScalePercent: val, textScale: preset });
  };

  const handlePresetClick = (percent: number, preset: TextScale) => {
    setA11y({ textScalePercent: percent, textScale: preset });
  };

  const handleReset = () => {
    setA11y(DEFAULT_ACCESSIBILITY_SETTINGS);
    toast.success("Opciones de accesibilidad restablecidas a valores recomendados");
  };

  return (
    <div className="space-y-4">
      {/* 1. Granular Text Scale Slider & Presets */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Type className="size-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Tamaño del texto</h3>
              <p className="text-xs text-muted-foreground">Ajusta la escala tipográfica exacta para toda la app</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-extrabold text-xs">
            {currentPercent}%
          </span>
        </div>

        {/* Interactive Slider */}
        <div className="space-y-2 pt-1 px-1">
          <Slider
            min={80}
            max={150}
            step={5}
            value={[currentPercent]}
            onValueChange={handleSliderChange}
            aria-label="Escala de tamaño de texto de 80% a 150%"
            className="cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-muted-foreground font-medium px-0.5">
            <span>80% (Mínimo)</span>
            <span>100% (Estándar)</span>
            <span>150% (Máximo)</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {(
            [
              { percent: 85, preset: "compact", label: "85%", desc: "Compacto" },
              { percent: 100, preset: "normal", label: "100%", desc: "Normal" },
              { percent: 115, preset: "large", label: "115%", desc: "Grande" },
              { percent: 135, preset: "xlarge", label: "135%", desc: "Muy grande" },
            ] as const
          ).map((s) => {
            const active = currentPercent === s.percent;
            return (
              <button
                key={s.preset}
                type="button"
                onClick={() => handlePresetClick(s.percent, s.preset as TextScale)}
                aria-pressed={active}
                className={`py-2 px-1.5 rounded-xl text-center border transition flex flex-col items-center justify-center min-h-[44px] ${
                  active
                    ? "border-primary bg-primary/15 text-primary font-bold shadow-sm ring-1 ring-primary/40"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className="text-sm font-extrabold">{s.label}</span>
                <span className="text-[10px] opacity-80 mt-0.5">{s.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Live Preview Sample */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1.5 transition-all">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            <span>Vista previa en vivo</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs font-medium text-muted-foreground">Saldo disponible</span>
            <span className="text-base font-extrabold text-foreground tracking-tight">$24,850.00</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ejemplo de texto legible con el tamaño, contraste y fuente activos en tu configuración.
          </p>
        </div>
      </div>

      {/* 2. Visual & Cognitive Accessibility Toggles */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-4">
        {/* High contrast (WCAG AAA) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Contrast className="size-4.5" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-high-contrast" className="font-bold text-sm cursor-pointer">
                Alto contraste (WCAG AAA)
              </Label>
              <p className="text-xs text-muted-foreground">Bordes definidos de 2px, máxima pureza cromática y sin transparencias tenues</p>
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

        {/* Dyslexic font (Atkinson Hyperlegible) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Eye className="size-4.5" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-dyslexic" className="font-bold text-sm cursor-pointer">
                Tipografía adaptada para dislexia
              </Label>
              <p className="text-xs text-muted-foreground">
                Fuente Atkinson Hyperlegible con espaciado de letras y altura de línea diseñados para evitar rotación de caracteres
              </p>
            </div>
          </div>
          <Switch
            id="a11y-dyslexic"
            checked={a11y.dyslexicFont}
            onCheckedChange={(v) => setA11y({ dyslexicFont: v })}
            aria-label="Activar tipografía adaptada para dislexia"
          />
        </div>

        <div className="border-t border-border/60" />

        {/* Reduce Motion */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ZapOff className="size-4.5" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-reduce-motion" className="font-bold text-sm cursor-pointer">
                Reducir movimiento
              </Label>
              <p className="text-xs text-muted-foreground">Desactiva transiciones, rebotes y animaciones decorativas</p>
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

        {/* Underline links */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Underline className="size-4.5" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-underline" className="font-bold text-sm cursor-pointer">
                Subrayar enlaces
              </Label>
              <p className="text-xs text-muted-foreground">Subraya elementos clicables para identificarlos sin depender del color</p>
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
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MousePointerClick className="size-4.5" />
            </div>
            <div className="min-w-0">
              <Label htmlFor="a11y-large-targets" className="font-bold text-sm cursor-pointer">
                Objetivos táctiles ampliados
              </Label>
              <p className="text-xs text-muted-foreground">Áreas de pulsación mínimas de 48x48px para facilitar el toque en móvil</p>
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
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Focus className="size-4.5" />
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
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Palette className="size-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Paleta para daltonismo</h3>
            <p className="text-xs text-muted-foreground">Colores contrastados para diferenciar Ingresos y Gastos</p>
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
          <span className="text-muted-foreground">Muestra:</span>
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
