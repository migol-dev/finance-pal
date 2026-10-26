import { memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  HandCoins,
  BarChart3,
  History,
  Settings,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useFinance } from "@/store/finance-store";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { SyncIndicator } from "@/components/app/SyncIndicator";
import { isSupabaseEnabled } from "@/lib/supabase";
import type { ThemeMode } from "@/lib/finance";

interface MoreNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MORE_NAV_LINKS = [
  {
    to: "/deudas",
    label: "Deudas y Préstamos",
    description: "Amortizaciones, cobros y pagos pendientes",
    icon: HandCoins,
    color: "text-[#C86446] dark:text-[#E07A5F]",
    bg: "bg-[#C86446]/10",
  },
  {
    to: "/anual",
    label: "Balance Anual",
    description: "Panorama patrimonial y tendencias por mes",
    icon: BarChart3,
    color: "text-[#2383E2] dark:text-[#3B9EFF]",
    bg: "bg-[#2383E2]/10",
  },
  {
    to: "/historial",
    label: "Historial de Actividades",
    description: "Registro cronológico de cambios y eventos",
    icon: History,
    color: "text-[#1F7A5A] dark:text-[#34D399]",
    bg: "bg-[#1F7A5A]/10",
  },
  {
    to: "/ajustes",
    label: "Ajustes y Personalización",
    description: "Cuentas, categorías, accesibilidad y perfil",
    icon: Settings,
    color: "text-[#191918] dark:text-[#EDEDED]",
    bg: "bg-muted/80",
  },
] as const;

export const MoreNavSheet = memo(function MoreNavSheet({
  open,
  onOpenChange,
}: MoreNavSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const setTheme = useFinance((s) => s.setTheme);
  const { themePreference, resolvedTheme } = useSystemTheme();

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: "system", label: "Sistema", icon: Monitor },
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="max-h-[90dvh] px-4 pb-10 focus:outline-none"
        aria-label="Menú de navegación extendido"
      >
        <div className="mx-auto w-full max-w-md space-y-5">
          {/* Cabecera */}
          <DrawerHeader className="px-0 pt-3 pb-1 text-left">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="font-display-v2 text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>Más opciones</span>
                  <span className="text-[11px] uppercase font-mono-tabular font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Menú
                  </span>
                </DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
                  Accesos directos rápidos y configuración de la aplicación
                </DrawerDescription>
              </div>
              {isSupabaseEnabled && (
                <div className="shrink-0">
                  <SyncIndicator compact />
                </div>
              )}
            </div>
          </DrawerHeader>

          {/* Accesos de Navegación Principal */}
          <nav
            aria-label="Navegación extendida móvil"
            className="space-y-2 border-y border-[#E4E0D8] dark:border-white/10 py-3"
          >
            {MORE_NAV_LINKS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleNavigate(item.to)}
                  className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? "bg-primary/10 border border-primary/30 text-primary font-semibold"
                      : "bg-card hover:bg-muted/40 border border-[#E4E0D8]/80 dark:border-white/10 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate leading-tight">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-tight">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className="size-4 text-muted-foreground/60 shrink-0"
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </nav>

          {/* Selector de Tema */}
          <section aria-label="Selector de tema de interfaz" className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" strokeWidth={1.75} />
                Tema visual
              </span>
              <span className="text-[11px] text-muted-foreground font-mono-tabular">
                {themePreference === "system"
                  ? `Automático (${resolvedTheme === "dark" ? "oscuro" : "claro"})`
                  : resolvedTheme === "dark"
                  ? "Oscuro permanente"
                  : "Claro permanente"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = themePreference === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`min-h-[48px] py-2 px-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-card border-[#E4E0D8] dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
});
