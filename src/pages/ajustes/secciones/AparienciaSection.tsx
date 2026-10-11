import { memo } from "react";
import { useFinance } from "@/store/finance-store";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { ThemeMode } from "@/lib/finance";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function ThemeSelector() {
  const setTheme = useFinance((s) => s.setTheme);
  const { themePreference, resolvedTheme } = useSystemTheme();

  const options: { value: ThemeMode; label: string; desc: string; icon: JSX.Element }[] = [
    { value: "system", label: "Sistema", desc: "Sigue el dispositivo", icon: <Monitor className="size-4" /> },
    { value: "light", label: "Claro", desc: "Tema luminoso", icon: <Sun className="size-4" /> },
    { value: "dark", label: "Oscuro", desc: "Tema nocturno", icon: <Moon className="size-4" /> },
  ];

  return (
    <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {themePreference === "system" ? <Monitor className="size-4.5" /> : resolvedTheme === "dark" ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
        </div>
        <div>
          <p className="font-bold text-sm text-foreground">Tema de la interfaz</p>
          <p className="text-xs text-muted-foreground">
            {themePreference === "system"
              ? `Automático (${resolvedTheme === "dark" ? "oscuro activo" : "claro activo"})`
              : resolvedTheme === "dark" ? "Oscuro permanente" : "Claro permanente"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium min-h-[56px] ${
              themePreference === opt.value
                ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/30 font-bold shadow-sm"
                : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <div className={`size-8 rounded-lg flex items-center justify-center ${
              themePreference === opt.value ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
            }`}>
              {opt.icon}
            </div>
            <span className="font-semibold">{opt.label}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const AparienciaSection = memo(function AparienciaSection({ onBack }: SectionProps) {
  const accentColor = useFinance((s) => s.appSettings.accentColor);
  const setAccentColor = useFinance((s) => s.setAccentColor);
  const compactMode = useFinance((s) => s.appSettings.compactMode);
  const setCompactMode = useFinance((s) => s.setCompactMode);
  const glassEffect = useFinance((s) => s.appSettings.glassEffect);
  const setGlassEffect = useFinance((s) => s.setGlassEffect);

  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Apariencia y Estilo"
        description="Personaliza los colores, contraste y densidad visual de la aplicación"
        icon={Palette}
        iconColorClass="bg-amber-500/10 text-amber-500"
        onBack={onBack}
      />

      {/* Theme Mode Selector */}
      <ThemeSelector />

      {/* Accent Color Palette */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-3">
        <div>
          <h3 className="font-bold text-sm text-foreground">Color de acento principal</h3>
          <p className="text-xs text-muted-foreground">Tonalidad para botones, gráficas y elementos destacados</p>
        </div>
        <div className="flex gap-2.5 pt-1">
          {(["blue", "violet", "emerald", "rose", "amber"] as const).map((c) => {
            const colors = {
              blue: "bg-blue-500",
              violet: "bg-violet-500",
              emerald: "bg-emerald-500",
              rose: "bg-rose-500",
              amber: "bg-amber-500",
            };
            return (
              <button
                key={c}
                type="button"
                onClick={() => setAccentColor(c)}
                aria-label={`Seleccionar acento ${c}`}
                className={`size-10 sm:size-11 rounded-xl ${colors[c]} transition-all flex items-center justify-center ${
                  accentColor === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110 shadow-md" : "opacity-60 hover:opacity-100"
                }`}
              >
                {accentColor === c && <span className="text-white text-xs font-black">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Density & Glass Effects */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-4">
        <h3 className="font-bold text-sm text-foreground">Comportamiento visual</h3>

        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="compact-mode-toggle" className="font-bold text-sm cursor-pointer">
              Modo compacto
            </Label>
            <p className="text-xs text-muted-foreground">Reduce el espaciado y márgenes para mostrar más información en pantalla</p>
          </div>
          <Switch
            id="compact-mode-toggle"
            checked={compactMode}
            onCheckedChange={setCompactMode}
            aria-label="Activar modo compacto"
          />
        </div>

        <div className="border-t border-border/60" />

        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="glass-effect-toggle" className="font-bold text-sm cursor-pointer">
              Efecto cristal (Glassmorphism)
            </Label>
            <p className="text-xs text-muted-foreground">Fondos translúcidos y desenfoque suave en barras de navegación</p>
          </div>
          <Switch
            id="glass-effect-toggle"
            checked={glassEffect}
            onCheckedChange={setGlassEffect}
            aria-label="Activar efecto cristal"
          />
        </div>
      </div>
    </div>
  );
});

export default AparienciaSection;
