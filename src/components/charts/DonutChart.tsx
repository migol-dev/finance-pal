import { memo, useMemo, useState } from "react";
import { fmt } from "@/lib/finance";
import type { DistributionSlice } from "@/lib/distribution";
import { cn } from "@/lib/utils";

export interface DonutChartProps {
  slices: DistributionSlice[];
  total: number;
  title?: string;
  totalLabel?: string;
  emptyMessage?: string;
  ariaLabel?: string;
  className?: string;
}

const VIEWBOX_SIZE = 220;
const CENTER = VIEWBOX_SIZE / 2;
const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const DonutChart = memo(function DonutChart({
  slices,
  total,
  title,
  totalLabel = "Total distribuido",
  emptyMessage = "Sin saldo positivo para graficar todavía.",
  ariaLabel = "Gráfico de distribución",
  className,
}: DonutChartProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedSlice = useMemo(
    () => slices.find((s) => s.id === selectedId) ?? null,
    [slices, selectedId]
  );

  const arcSegments = useMemo(() => {
    const valid = slices.filter((s) => s.percentage > 0);
    const gap = valid.length > 1 ? 2.5 : 0;

    return valid.reduce<Array<DistributionSlice & { dashArray: string; dashOffset: number }>>(
      (acc, slice, idx) => {
        const previousLen =
          idx === 0
            ? 0
            : acc[idx - 1].dashOffset * -1 + (valid[idx - 1].percentage / 100) * CIRCUMFERENCE;
        const arcLen = (slice.percentage / 100) * CIRCUMFERENCE;
        const visibleLen = Math.max(1.5, arcLen - gap);
        acc.push({
          ...slice,
          dashArray: `${visibleLen} ${CIRCUMFERENCE}`,
          dashOffset: -previousLen,
        });
        return acc;
      },
      []
    );
  }, [slices]);

  const toggleSlice = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  if (slices.length === 0 || total <= 0) {
    return (
      <div
        className={cn(
          "py-5 px-4 text-center text-xs text-muted-foreground border-t border-border/60",
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          {title}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        {/* Donut SVG + Centro interactivo */}
        <div className="relative mx-auto sm:mx-0 w-44 h-44 sm:w-48 sm:h-48 shrink-0 flex items-center justify-center">
          <svg
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            role="img"
            aria-label={ariaLabel}
            className="w-full h-full overflow-visible select-none"
          >
            {/* Riel base sutil */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={20}
              className="text-muted/40"
            />

            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              {arcSegments.map((seg) => {
                const isSelected = selectedSlice?.id === seg.id;
                const isDimmed = Boolean(selectedSlice) && !isSelected;
                return (
                  <circle
                    key={seg.id}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke={seg.colorVar}
                    strokeWidth={isSelected ? 25 : 20}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    strokeLinecap="butt"
                    role="button"
                    tabIndex={0}
                    aria-label={`${seg.label}: ${fmt(seg.amount)} (${seg.percentage.toFixed(1)}%)`}
                    aria-pressed={isSelected}
                    onClick={() => toggleSlice(seg.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleSlice(seg.id);
                      }
                    }}
                    className={cn(
                      "cursor-pointer outline-none focus-visible:stroke-[26] transition-[stroke-width,opacity] duration-200 motion-reduce:transition-none",
                      isDimmed ? "opacity-35" : "opacity-100"
                    )}
                  />
                );
              })}
            </g>
          </svg>

          {/* Lectura central adaptativa */}
          <div
            data-testid="donut-center-readout"
            className="pointer-events-none absolute inset-7 rounded-full flex flex-col items-center justify-center text-center px-2"
          >
            {selectedSlice ? (
              <>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate max-w-full">
                  {selectedSlice.sublabel ?? "Detalle"}
                </span>
                <span className="text-xs font-bold text-foreground line-clamp-2 leading-tight mt-0.5">
                  {selectedSlice.label}
                </span>
                <span className="text-sm font-extrabold font-mono-tabular text-foreground mt-0.5">
                  {fmt(selectedSlice.amount)}
                </span>
                <span className="text-[11px] font-mono-tabular font-semibold text-primary">
                  {selectedSlice.percentage.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {totalLabel}
                </span>
                <span className="text-base font-extrabold font-mono-tabular text-foreground mt-0.5">
                  {fmt(total)}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Toca para ver detalle
                </span>
              </>
            )}
          </div>
        </div>

        {/* Leyenda interactiva en filas hairline */}
        <div
          role="list"
          aria-label="Desglose de distribución"
          className="flex-1 min-w-0 divide-y divide-border/60 border-t border-b border-border/60"
        >
          {slices.map((slice) => {
            const isSelected = selectedSlice?.id === slice.id;
            return (
              <div key={slice.id} role="listitem">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleSlice(slice.id)}
                  className={cn(
                    "w-full py-2.5 px-2 flex items-center justify-between gap-2 text-left transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.colorVar }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{slice.label}</p>
                      {slice.sublabel && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {slice.sublabel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono-tabular">
                    <p className="text-xs font-bold text-foreground">{fmt(slice.amount)}</p>
                    <p className="text-[11px] font-semibold text-primary">
                      {slice.percentage.toFixed(1)}%
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
