import React from "react";

type Series = {
  key: string;
  label?: string;
  color?: string;
  type?: "area" | "line";
  strokeWidth?: number;
  dot?: boolean;
  formatter?: (v: number) => string;
};

export default function SimpleAreaChart({
  data,
  xKey = "x",
  series,
  height = 200,
  maxY,
  referenceLines,
  showLegend = true,
}: {
  data: any[];
  xKey?: string;
  series: Series[];
  height?: number;
  maxY?: number;
  referenceLines?: { value: number; label?: string }[];
  showLegend?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(0, el.clientWidth)));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const margin = { top: 8, right: 8, bottom: 24, left: 8 };
  const w = Math.max(200, width || 600);
  const h = height;
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const n = data.length || 1;

  // determine value range
  let min = Infinity, max = -Infinity;
  for (const d of data) {
    for (const s of series) {
      const v = d[s.key];
      if (v == null) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!isFinite(min)) min = 0;
  if (!isFinite(max)) max = 0;
  if (maxY != null) max = Math.max(max, maxY);
  if (min > 0) min = 0; // baseline at 0 for area charts
  const range = max - min || 1;

  const x = (i: number) => margin.left + (i / Math.max(1, n - 1)) * chartW;
  const y = (v: number) => margin.top + (1 - (v - min) / range) * chartH;

  const buildPath = (key: string) => {
    let d = "";
    for (let i = 0; i < n; i++) {
      const v = data[i][key];
      if (v == null) continue;
      const px = x(i);
      const py = y(v);
      d += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
    }
    return d;
  };

  const buildAreaPath = (key: string) => {
    const top = buildPath(key);
    const lastX = x(n - 1);
    const firstX = x(0);
    const baseY = y(min);
    return `${top} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  return (
    <div ref={ref} style={{ width: "100%" }} className="relative">
      {showLegend && (
        <div className="flex gap-3 items-center mb-2">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1 text-xs">
              <span style={{ width: 12, height: 8, background: s.color ?? "#000", display: "inline-block", borderRadius: 2 }} />
              <span>{s.label ?? s.key}</span>
            </div>
          ))}
        </div>
      )}
      <svg width={w} height={h}>
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={margin.left} x2={margin.left + chartW} y1={margin.top + t * chartH} y2={margin.top + t * chartH} stroke="var(--border)" strokeOpacity={0.12} />
        ))}

        {/* reference lines */}
        {(referenceLines || []).map((rl, i) => (
          <line key={i} x1={margin.left} x2={margin.left + chartW} y1={y(rl.value)} y2={y(rl.value)} stroke="#ffffff88" strokeDasharray="3 3" />
        ))}

        {/* areas */}
        {series.map((s) => s.type === "area" ? (
          <path key={s.key} d={buildAreaPath(s.key)} fill={s.color ?? "#000"} fillOpacity={0.14} stroke={s.color ?? "#000"} strokeWidth={s.strokeWidth ?? 1.5} />
        ) : null)}

        {/* lines */}
        {series.map((s) => s.type !== "area" ? (
          <path key={s.key} d={buildPath(s.key)} fill="none" stroke={s.color ?? "#000"} strokeWidth={s.strokeWidth ?? 2} strokeLinejoin="round" strokeLinecap="round" />
        ) : null)}

        {/* dots for hovered index */}
        {hoverIdx != null && series.map((s) => {
          const v = data[hoverIdx]?.[s.key];
          if (v == null) return null;
          const px = x(hoverIdx);
          const py = y(v);
          return <circle key={s.key} cx={px} cy={py} r={3} fill={s.color ?? "#000"} />;
        })}

        {/* overlay for pointer events */}
        <rect x={margin.left} y={margin.top} width={chartW} height={chartH} fill="transparent"
          onMouseMove={(e) => {
            const rect = (e.target as SVGRectElement).getBoundingClientRect();
            const px = e.clientX - rect.left;
            const idx = Math.round((px / chartW) * (n - 1));
            setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
          }}
          onMouseLeave={() => setHoverIdx(null)} />
      </svg>

      {/* tooltip */}
      {hoverIdx != null && (
        <div style={{ position: "absolute", left: 8 + (hoverIdx / Math.max(1, n - 1)) * chartW, top: 8 }} className="pointer-events-none bg-card border border-border rounded-md p-2 text-xs">
          <div className="font-semibold">{String(data[hoverIdx]?.[xKey] ?? "")}</div>
          {series.map((s) => {
            const v = data[hoverIdx]?.[s.key];
            if (v == null) return null;
            return <div key={s.key} className="flex items-center gap-2"><span style={{ width:10,height:8,background:s.color||"#000" }} /> <span>{s.label ?? s.key}:</span> <span className="font-medium">{s.formatter ? s.formatter(v) : String(v)}</span></div>;
          })}
        </div>
      )}
    </div>
  );
}
