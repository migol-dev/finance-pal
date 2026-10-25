import React, { memo, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  Tag,
} from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseEnabled } from "@/lib/supabase";
import { getCurrentVersion } from "@/lib/version-check";
import { AjustesSectionId, AjustesCategoryMeta } from "./types";
import { SyncIndicator } from "@/components/app/SyncIndicator";

// Secciones modulares de configuración
import { PerfilSection } from "./secciones/PerfilSection";
import { CuentasSection } from "./secciones/CuentasSection";
import { FijosSection } from "./secciones/FijosSection";
import { CategoriasSection } from "./secciones/CategoriasSection";
import { AparienciaSection } from "./secciones/AparienciaSection";
import { AccesibilidadSection } from "./secciones/AccesibilidadSection";
import { NotificacionesSection } from "./secciones/NotificacionesSection";
import { DatosSection } from "./secciones/DatosSection";
import { SeguridadSection } from "./secciones/SeguridadSection";

const CATEGORIES_DEF: {
  id: AjustesSectionId;
  code: string;
  title: string;
  description: string;
  icon: typeof User;
  accent: string;
}[] = [
  {
    id: "perfil",
    code: "01",
    title: "Perfil y Cuenta",
    description: "Nombre, avatar, moneda principal y sesión",
    icon: User,
    accent: "text-[#2383E2]",
  },
  {
    id: "cuentas",
    code: "02",
    title: "Cuentas y Efectivo",
    description: "Gestión de bancos, efectivo y desglose de billetes",
    icon: Landmark,
    accent: "text-[#1F7A5A]",
  },
  {
    id: "fijos",
    code: "03",
    title: "Conceptos Fijos",
    description: "Ingresos recurrentes, suscripciones y ahorros",
    icon: CalendarClock,
    accent: "text-[#8B5CF6]",
  },
  {
    id: "categorias",
    code: "04",
    title: "Categorías",
    description: "Categorías generales y personalizadas",
    icon: Tag,
    accent: "text-[#10B981]",
  },
  {
    id: "apariencia",
    code: "05",
    title: "Apariencia",
    description: "Temas claro/oscuro, color de acento y modo compacto",
    icon: Palette,
    accent: "text-[#D9730D]",
  },
  {
    id: "accesibilidad",
    code: "06",
    title: "Accesibilidad",
    description: "Tamaño de texto continuo, alto contraste y dislexia",
    icon: Accessibility,
    accent: "text-[#EC4899]",
  },
  {
    id: "notificaciones",
    code: "07",
    title: "Notificaciones",
    description: "Alertas push, avisos de corte y recordatorios",
    icon: Bell,
    accent: "text-[#6366F1]",
  },
  {
    id: "datos",
    code: "08",
    title: "Nube y Respaldos",
    description: "Sincronización Supabase, exportar/importar datos",
    icon: Cloud,
    accent: "text-[#06B6D4]",
  },
  {
    id: "seguridad",
    code: "09",
    title: "Seguridad y Sistema",
    description: "Restablecer datos, diagnóstico y versión",
    icon: ShieldCheck,
    accent: "text-[#C86446]",
  },
];

export const AjustesV2 = memo(function AjustesV2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const seccionParam = (searchParams.get("seccion") as AjustesSectionId) || null;

  const { profile, accounts, fixedItems, appSettings, customCategories = [] } = useFinanceData();
  const accentColor = appSettings?.accentColor ?? "emerald";
  const a11y = appSettings?.accessibility;
  const notifications = appSettings?.notifications;
  const { session } = useAuth();

  const textScalePercent = a11y?.textScalePercent ?? 100;

  // Resolved active section for desktop (defaults to 'perfil' if null on wide screen)
  const activeSection: AjustesSectionId = seccionParam ?? "perfil";

  const handleSelectSection = useCallback(
    (id: AjustesSectionId) => {
      setSearchParams({ seccion: id });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setSearchParams]
  );

  const handleBack = useCallback(() => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchParams]);

  // Dynamic badges for metadata
  const categoriesWithBadges = useMemo(() => {
    return CATEGORIES_DEF.map((cat) => {
      let badge = "";
      if (cat.id === "perfil") badge = profile?.currency ?? "MXN";
      else if (cat.id === "cuentas")
        badge = `${accounts?.length ?? 0} ${(accounts?.length ?? 0) === 1 ? "cuenta" : "cuentas"}`;
      else if (cat.id === "fijos") badge = `${fixedItems?.length ?? 0} activos`;
      else if (cat.id === "categorias") badge = `${customCategories?.length ?? 0} personalizadas`;
      else if (cat.id === "apariencia") badge = accentColor;
      else if (cat.id === "accesibilidad") badge = `${textScalePercent}%`;
      else if (cat.id === "notificaciones")
        badge = notifications?.enabled ? "Activas" : "Pausadas";
      else if (cat.id === "datos")
        badge = isSupabaseEnabled && session ? "Nube activa" : "Local";
      else if (cat.id === "seguridad") badge = `v${getCurrentVersion()}`;

      return { ...cat, badge };
    });
  }, [
    profile?.currency,
    accounts?.length,
    fixedItems?.length,
    accentColor,
    textScalePercent,
    notifications?.enabled,
    session,
  ]);

  const renderActiveSection = (id: AjustesSectionId) => {
    switch (id) {
      case "perfil":
        return <PerfilSection onBack={handleBack} />;
      case "cuentas":
        return <CuentasSection onBack={handleBack} />;
      case "fijos":
        return <FijosSection onBack={handleBack} />;
      case "categorias":
        return <CategoriasSection onBack={handleBack} />;
      case "apariencia":
        return <AparienciaSection onBack={handleBack} />;
      case "accesibilidad":
        return <AccesibilidadSection onBack={handleBack} />;
      case "notificaciones":
        return <NotificacionesSection onBack={handleBack} />;
      case "datos":
        return <DatosSection onBack={handleBack} />;
      case "seguridad":
        return <SeguridadSection onBack={handleBack} />;
      default:
        return <PerfilSection onBack={handleBack} />;
    }
  };

  return (
    <div className="min-h-screen pb-32 bg-[#FAF8F5] dark:bg-[#0C0C0B] text-[#191918] dark:text-[#EDEDED]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Layout: Master-Detail 5/7 in laptop, 4/8 in desktop xl; Agile Drill-Down in mobile */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:pt-6">
          {/* MASTER COLUMN (col-span-5 / xl:col-span-4): Sticky on PC, Fullscreen on mobile if !seccionParam */}
          <div
            className={`lg:col-span-5 xl:col-span-4 ${
              seccionParam ? "hidden lg:block" : "block"
            } space-y-5 lg:sticky lg:top-6 lg:self-start`}
          >
            {/* Header Adaptativo (anti-truncamiento a escala 135%) */}
            <div className="px-1 pt-2 pb-1 space-y-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <h1 className="text-xl sm:text-2xl font-black font-display-v2 tracking-tight text-foreground whitespace-nowrap">
                  Ajustes
                </h1>
                {isSupabaseEnabled && <SyncIndicator compact />}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configuración general, personalización y datos
              </p>
            </div>

            {/* Profile Quick Pill */}
            <button
              type="button"
              onClick={() => handleSelectSection("perfil")}
              className={`w-full rounded-2xl border p-4 flex items-center justify-between text-left transition-all active:scale-[0.98] min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2] ${
                activeSection === "perfil" && seccionParam
                  ? "bg-white dark:bg-[#141413] border-[#2383E2] shadow-sm"
                  : "bg-white dark:bg-[#141413] border-[#E4E0D8] dark:border-white/10 hover:border-[#2383E2]/40"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-11 rounded-xl bg-[#2383E2]/10 text-[#2383E2] font-black flex items-center justify-center text-base shrink-0 font-display-v2">
                  {profile?.name ? profile.name.slice(0, 1).toUpperCase() : <User className="size-5" strokeWidth={1.5} />}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-foreground truncate block">
                    {profile?.name || "Mi Perfil"}
                  </span>
                  <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular truncate mt-0.5">
                    {profile?.currency ?? "MXN"} · {session?.user?.email || "Modo local"}
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 text-[#6E6A63] dark:text-[#8E8D8A] shrink-0 ml-2" strokeWidth={1.5} />
            </button>

            {/* Categories Index Header */}
            <div className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider font-mono-tabular font-bold text-[#6E6A63] dark:text-[#8E8D8A] px-1">
                Categorías de configuración
              </h2>

              <div className="space-y-1.5 font-mono-tabular">
                {categoriesWithBadges.map((cat) => {
                  const IconComponent = cat.icon;
                  const isSelected = seccionParam === cat.id || (!seccionParam && cat.id === "perfil");

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-selected={isSelected}
                      onClick={() => handleSelectSection(cat.id)}
                      className={`w-full rounded-xl border p-3 flex items-center justify-between text-left transition-all active:scale-[0.98] min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2] ${
                        isSelected
                          ? "bg-white dark:bg-[#141413] border-[#2383E2] text-foreground shadow-sm"
                          : "bg-white dark:bg-[#141413] border-[#E4E0D8] dark:border-white/10 text-foreground hover:border-[#2383E2]/40 hover:bg-[#F2EFE9]/40 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-bold text-[#6E6A63] dark:text-[#8E8D8A] shrink-0 w-5">
                          {cat.code}
                        </span>
                        <div className={`size-8 rounded-lg bg-[#FAF8F5] dark:bg-white/5 border border-[#E4E0D8]/60 dark:border-white/5 flex items-center justify-center shrink-0 ${cat.accent}`}>
                          <IconComponent className="size-4" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 font-sans flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-foreground truncate">
                              {cat.title}
                            </span>
                            {cat.badge && (
                              <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] dark:bg-white/5 border border-[#E4E0D8]/60 dark:border-white/5 text-[9px] font-mono-tabular font-bold text-[#6E6A63] dark:text-[#8E8D8A] shrink-0">
                                {cat.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#6E6A63] dark:text-[#8E8D8A] truncate mt-0.5 lg:hidden">
                            {cat.description}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="size-4 text-[#6E6A63] dark:text-[#8E8D8A] shrink-0 ml-2" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtle Footer info */}
            <div className="pt-2 text-xs text-[#6E6A63] dark:text-[#8E8D8A] flex items-center gap-1.5 px-1 font-mono-tabular">
              <Sparkles className="size-3 text-[#1F7A5A]" />
              <span>Finance Pal v{getCurrentVersion()}</span>
            </div>
          </div>

          {/* DETAIL COLUMN (col-span-7 / xl:col-span-8): Active Section Content */}
          <main
            className={`lg:col-span-7 xl:col-span-8 ${
              seccionParam ? "block" : "hidden lg:block"
            } min-w-0`}
          >
            <div className="rounded-2xl lg:border lg:border-[#E4E0D8] lg:dark:border-white/10 lg:bg-white lg:dark:bg-[#141413] lg:p-8 pt-4">
              {seccionParam ? (
                renderActiveSection(seccionParam)
              ) : (
                <div className="hidden lg:flex flex-col items-center justify-center min-h-[420px] p-8 text-center border border-dashed border-[#E4E0D8] dark:border-white/10 rounded-2xl">
                  <div className="size-12 rounded-2xl bg-[#2383E2]/10 text-[#2383E2] flex items-center justify-center mb-3">
                    <Sparkles className="size-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-display-v2 text-lg font-normal">Panel de Configuración</h3>
                  <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A] max-w-sm mt-1">
                    Selecciona una categoría del índice a la izquierda para personalizar tu perfil, cuentas bancarias, apariencia, accesibilidad y respaldos.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
});

export default AjustesV2;
