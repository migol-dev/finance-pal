import { memo } from "react";
import {
  User,
  Landmark,
  CalendarClock,
  Palette,
  Accessibility,
  Bell,
  Cloud,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useFinance } from "@/store/finance-store";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseEnabled } from "@/lib/supabase";
import { getCurrentVersion } from "@/lib/version-check";
import { AjustesSectionId, AjustesCategoryMeta } from "./types";
import { Header } from "@/components/app/Header";

interface AjustesHubProps {
  onSelectSection: (id: AjustesSectionId) => void;
}

export const AjustesHub = memo(function AjustesHub({ onSelectSection }: AjustesHubProps) {
  const { profile, accounts, fixedItems } = useFinanceData();
  const accentColor = useFinance((s) => s.appSettings.accentColor);
  const a11y = useFinance((s) => s.appSettings.accessibility);
  const notifications = useFinance((s) => s.appSettings.notifications);
  const { session } = useAuth();

  const textScalePercent = a11y?.textScalePercent ?? 100;

  const categories: AjustesCategoryMeta[] = [
    {
      id: "perfil",
      title: "Perfil y Cuenta",
      description: "Nombre, avatar, moneda principal y sesión",
      icon: User,
      badge: profile.currency ?? "MXN",
      colorClass: "bg-blue-500/10 text-blue-500",
    },
    {
      id: "cuentas",
      title: "Cuentas y Efectivo",
      description: "Gestión de bancos, efectivo y desglose de billetes",
      icon: Landmark,
      badge: `${accounts.length} ${accounts.length === 1 ? "cuenta" : "cuentas"}`,
      colorClass: "bg-emerald-500/10 text-emerald-500",
    },
    {
      id: "fijos",
      title: "Conceptos Fijos",
      description: "Ingresos recurrentes, suscripciones y ahorros",
      icon: CalendarClock,
      badge: `${fixedItems.length} activos`,
      colorClass: "bg-violet-500/10 text-violet-500",
    },
    {
      id: "apariencia",
      title: "Apariencia",
      description: "Temas claro/oscuro, color de acento y modo compacto",
      icon: Palette,
      badge: accentColor,
      colorClass: "bg-amber-500/10 text-amber-500",
    },
    {
      id: "accesibilidad",
      title: "Accesibilidad",
      description: "Tamaño de texto continuo, alto contraste y dislexia",
      icon: Accessibility,
      badge: `${textScalePercent}%`,
      colorClass: "bg-rose-500/10 text-rose-500",
    },
    {
      id: "notificaciones",
      title: "Notificaciones",
      description: "Alertas push, avisos de corte y recordatorios",
      icon: Bell,
      badge: notifications?.enabled ? "Activas" : "Pausadas",
      colorClass: "bg-indigo-500/10 text-indigo-500",
    },
    {
      id: "datos",
      title: "Nube y Respaldos",
      description: "Sincronización Supabase, exportar/importar datos",
      icon: Cloud,
      badge: isSupabaseEnabled && session ? "Nube activa" : "Local",
      colorClass: "bg-cyan-500/10 text-cyan-500",
    },
    {
      id: "seguridad",
      title: "Seguridad y Sistema",
      description: "Restablecer datos, diagnóstico y versión",
      icon: ShieldCheck,
      badge: `v${getCurrentVersion()}`,
      colorClass: "bg-orange-500/10 text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <Header
        title="Ajustes"
        subtitle="Configuración general, personalización y datos"
      />

      {/* Profile quick banner */}
      <button
        type="button"
        onClick={() => onSelectSection("perfil")}
        className="w-full rounded-3xl bg-gradient-to-r from-primary/10 via-card to-card border border-primary/20 p-4 sm:p-5 flex items-center justify-between text-left hover:border-primary/40 transition shadow-soft group"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center text-lg shadow-md shrink-0">
            {profile.name ? profile.name.slice(0, 1).toUpperCase() : <User className="size-6" />}
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-base sm:text-lg text-foreground truncate">
              {profile.name || "Mi Perfil"}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>Moneda: {profile.currency}</span>
              <span>•</span>
              <span className="truncate">{session?.user?.email || "Modo local"}</span>
            </p>
          </div>
        </div>
        <div className="size-9 rounded-xl bg-muted/60 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition flex items-center justify-center shrink-0 ml-2">
          <ChevronRight className="size-5" />
        </div>
      </button>

      {/* Categories Grid */}
      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground px-1">
          Categorías de configuración
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {categories.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectSection(cat.id)}
                className="w-full rounded-2xl bg-card border border-border p-4 flex items-center justify-between text-left hover:border-primary/40 hover:bg-muted/30 transition-all shadow-soft group min-h-[64px]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`size-11 rounded-2xl ${cat.colorClass} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm`}>
                    <IconComponent className="size-5.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-bold text-sm text-foreground truncate">{cat.title}</span>
                      {cat.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0 capitalize">
                          {cat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{cat.description}</p>
                  </div>
                </div>

                <div className="size-8 rounded-lg text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition flex items-center justify-center shrink-0 ml-2">
                  <ChevronRight className="size-4.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pt-4 pb-12 text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Sparkles className="size-3.5 text-primary" />
        <span>Finance Pal v{getCurrentVersion()} • Todos tus datos son seguros y locales</span>
      </div>
    </div>
  );
});

export default AjustesHub;
