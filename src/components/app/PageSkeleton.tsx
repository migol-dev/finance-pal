import { memo } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

// Componente base de bloque Shimmer Editorial
function Shimmer({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "bg-[#EBE7DF]/70 dark:bg-[#1C1C1A]/80 rounded-[4px] relative overflow-hidden animate-pulse",
        className
      )}
      style={style}
    />
  );
}

// Cabecera Editorial Estándar
function SkeletonHeader({ titleWidth = "w-48", subtitleWidth = "w-32" }: { titleWidth?: string; subtitleWidth?: string }) {
  return (
    <div className="pb-6 border-b border-[#E4E0D8] dark:border-[#222220] flex items-center justify-between">
      <div className="space-y-2">
        <Shimmer className={`h-7 ${titleWidth}`} />
        <Shimmer className={`h-3.5 ${subtitleWidth}`} />
      </div>
      <div className="flex gap-2">
        <Shimmer className="h-9 w-24 hidden sm:block" />
        <Shimmer className="h-9 w-9" />
      </div>
    </div>
  );
}

export const PageSkeleton = memo(function PageSkeleton() {
  const location = useLocation();
  const path = location.pathname;

  // 1. DASHBOARD / INICIO (/)
  if (path === "/" || path === "/dashboard") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto" role="status" aria-label="Cargando panel patrimonial">
        {/* Cabecera y fecha */}
        <SkeletonHeader titleWidth="w-56" subtitleWidth="w-36" />

        {/* Hero de Liquidez */}
        <div className="p-6 rounded-md bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-[#222220] space-y-3">
          <Shimmer className="h-3.5 w-32" />
          <Shimmer className="h-12 w-64" />
          <div className="pt-2 flex gap-4">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-4 w-32" />
          </div>
        </div>

        {/* Rejilla de 4 KPIs con divisores hairline */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-md bg-[#FAF8F5] dark:bg-[#0C0C0B] border border-[#E4E0D8] dark:border-[#222220]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 p-2">
              <Shimmer className="h-3 w-20" />
              <Shimmer className="h-6 w-28" />
            </div>
          ))}
        </div>

        {/* Asymmetric Split: 7 Cols (Libro Mayor) + 5 Cols (Metas y Deudas) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E4E0D8] dark:border-[#222220]">
              <Shimmer className="h-4 w-36" />
              <Shimmer className="h-4 w-20" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-[#E4E0D8]/60 dark:border-[#222220]/60">
                <div className="flex items-center gap-3">
                  <Shimmer className="size-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Shimmer className="h-4 w-32" />
                    <Shimmer className="h-3 w-20" />
                  </div>
                </div>
                <Shimmer className="h-4 w-24" />
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 rounded-md bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-[#222220] space-y-4">
              <Shimmer className="h-4 w-32" />
              <div className="space-y-3">
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-2 w-full rounded-full" />
              </div>
              <div className="space-y-3 pt-2">
                <Shimmer className="h-3 w-full" />
                <Shimmer className="h-2 w-full rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. MOVIMIENTOS (/movimientos)
  if (path === "/movimientos") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" role="status" aria-label="Cargando libro mayor">
        <SkeletonHeader titleWidth="w-52" subtitleWidth="w-40" />

        {/* Barra de Filtros, ⌘K y Resumen */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <Shimmer className="h-10 flex-1 max-w-md" />
          <div className="flex gap-2">
            <Shimmer className="h-10 w-24" />
            <Shimmer className="h-10 w-24" />
            <Shimmer className="h-10 w-10" />
          </div>
        </div>

        {/* Tira de Resumen Monetario */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-[#222220]">
          <div className="space-y-1.5"><Shimmer className="h-3 w-16" /><Shimmer className="h-5 w-24" /></div>
          <div className="space-y-1.5"><Shimmer className="h-3 w-16" /><Shimmer className="h-5 w-24" /></div>
          <div className="space-y-1.5"><Shimmer className="h-3 w-16" /><Shimmer className="h-5 w-24" /></div>
        </div>

        {/* Filas de Tabla de Libro Mayor */}
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between p-3.5 rounded-md border border-[#E4E0D8]/60 dark:border-[#222220]/60 bg-[#FAF8F5] dark:bg-[#0C0C0B]">
              <div className="flex items-center gap-3">
                <Shimmer className="size-8" />
                <div className="space-y-1.5">
                  <Shimmer className="h-4 w-40" />
                  <Shimmer className="h-3 w-24" />
                </div>
              </div>
              <div className="text-right space-y-1.5">
                <Shimmer className="h-4 w-24 ml-auto" />
                <Shimmer className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. DEUDAS Y PASIVOS (/deudas)
  if (path === "/deudas") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto" role="status" aria-label="Cargando pasivos">
        <SkeletonHeader titleWidth="w-48" subtitleWidth="w-44" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <Shimmer className="h-28 w-full rounded-md" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-md border border-[#E4E0D8] dark:border-[#222220] space-y-3">
                <div className="flex justify-between items-center">
                  <Shimmer className="h-5 w-36" />
                  <Shimmer className="h-5 w-24" />
                </div>
                <Shimmer className="h-2 w-full rounded-full" />
                <div className="flex justify-between items-center">
                  <Shimmer className="h-3 w-28" />
                  <Shimmer className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-md bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-[#222220] space-y-4">
              <Shimmer className="h-5 w-48" />
              <Shimmer className="h-10 w-full" />
              <Shimmer className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. METAS DE AHORRO (/metas)
  if (path === "/metas") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto" role="status" aria-label="Cargando metas de ahorro">
        <SkeletonHeader titleWidth="w-52" subtitleWidth="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-md border border-[#E4E0D8] dark:border-[#222220] space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <Shimmer className="h-5 w-40" />
                    <Shimmer className="h-3 w-24" />
                  </div>
                  <Shimmer className="h-6 w-28" />
                </div>
                <Shimmer className="h-2 w-full rounded-full" />
                <div className="flex justify-between items-center pt-1">
                  <Shimmer className="h-3 w-32" />
                  <div className="flex gap-2">
                    <Shimmer className="h-8 w-20" />
                    <Shimmer className="h-8 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-md bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-[#222220] space-y-4">
              <Shimmer className="h-5 w-36" />
              <Shimmer className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. PANORAMA ANUAL (/anual)
  if (path === "/anual") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto" role="status" aria-label="Cargando panorama anual">
        <SkeletonHeader titleWidth="w-44" subtitleWidth="w-36" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-md border border-[#E4E0D8] dark:border-[#222220] space-y-2">
              <Shimmer className="h-3 w-24" />
              <Shimmer className="h-6 w-32" />
            </div>
          ))}
        </div>
        {/* Gráfica Recharts Canvas */}
        <div className="p-6 rounded-md border border-[#E4E0D8] dark:border-[#222220] space-y-4">
          <div className="flex justify-between items-center">
            <Shimmer className="h-5 w-48" />
            <Shimmer className="h-8 w-32" />
          </div>
          <Shimmer className="h-[280px] w-full rounded-md" />
        </div>
      </div>
    );
  }

  // 6. HISTORIAL MENSUAL (/historial)
  if (path === "/historial") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto" role="status" aria-label="Cargando archivo histórico">
        <SkeletonHeader titleWidth="w-48" subtitleWidth="w-36" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-3">
            <Shimmer className="h-4 w-32 mb-2" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Shimmer key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-md border border-[#E4E0D8] dark:border-[#222220] space-y-4">
              <Shimmer className="h-6 w-48" />
              <div className="grid grid-cols-3 gap-4">
                <Shimmer className="h-16" />
                <Shimmer className="h-16" />
                <Shimmer className="h-16" />
              </div>
              <Shimmer className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 7. AJUSTES (/ajustes)
  if (path.startsWith("/ajustes")) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto" role="status" aria-label="Cargando configuración">
        <SkeletonHeader titleWidth="w-40" subtitleWidth="w-52" />
        <div className="space-y-6">
          {[1, 2, 3, 4].map((section) => (
            <div key={section} className="p-5 rounded-md border border-[#E4E0D8] dark:border-[#222220] space-y-4">
              <Shimmer className="h-5 w-44" />
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center py-2 border-b border-[#E4E0D8]/40 dark:border-[#222220]/40">
                  <div className="space-y-1"><Shimmer className="h-4 w-36" /><Shimmer className="h-3 w-56" /></div>
                  <Shimmer className="h-6 w-12 rounded-full" />
                </div>
                <div className="flex justify-between items-center py-2">
                  <div className="space-y-1"><Shimmer className="h-4 w-32" /><Shimmer className="h-3 w-48" /></div>
                  <Shimmer className="h-9 w-28" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. FALLBACK / LOGIN / MIGRACIÓN
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6" role="status" aria-label="Cargando">
      <div className="w-full max-w-md p-8 rounded-md bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-[#222220] space-y-6">
        <div className="text-center space-y-2">
          <Shimmer className="size-12 rounded-xl mx-auto" />
          <Shimmer className="h-6 w-36 mx-auto" />
          <Shimmer className="h-3.5 w-48 mx-auto" />
        </div>
        <div className="space-y-3 pt-4">
          <Shimmer className="h-10 w-full" />
          <Shimmer className="h-10 w-full" />
          <Shimmer className="h-11 w-full rounded-md mt-2" />
        </div>
      </div>
    </div>
  );
});
