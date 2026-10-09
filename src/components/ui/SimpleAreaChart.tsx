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
    if (typeof ResizeObserver === "undefined") {
      setWidth(el.clientWidth || 300);
      return;
    }
    const ro = new ResizeObserver(() => setWidth(Math.max(0, el.clientWidth)));
    ro.observe(el);
    setWidth(el.clientWidth || 300);
    return () => ro.disconnect();
  }, []);

  const margin = { top: 8, right: 8, bottom: 24, left: 8 };
  const w = width > 0 ? width : 300;
  const h = height;
  const chartW = Math.max(10, w - margin.left - margin.right);
  const chartH = Math.max(10, h - margin.top - margin.bottom);
  const memo = React.useMemo(() => {
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
      if (!data || data.length === 0) return "";
      let d = "";
      for (let i = 0; i < data.length; i++) {
        const v = data[i]?.[key];
        if (v == null) continue;
        const px = x(i);
        const py = y(v);
        d += d === "" ? `M ${px} ${py}` : ` L ${px} ${py}`;
      }
      return d;
    };

    const buildAreaPath = (key: string) => {
      if (!data || data.length === 0) return "";
      const top = buildPath(key);
      if (!top) return "";
      const lastX = x(data.length - 1);
      const firstX = x(0);
      const baseY = y(min);
      return `${top} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    };

    return { n, min, max, range, x, y, buildPath, buildAreaPath };
  }, [data, series, chartW, chartH, maxY, margin.left, margin.top]);

  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  const handlePointer = (clientX: number, target: SVGRectElement) => {
    if (!data || data.length === 0) return;
    const rect = target.getBoundingClientRect();
    const px = clientX - rect.left;
    const idx = Math.round((px / chartW) * (memo.n - 1));
    setHoverIdx(Math.max(0, Math.min(memo.n - 1, idx)));
  };

  return (
    <div ref={ref} style={{ width: "100%" }} className="relative max-w-full overflow-hidden">
      {showLegend && (
        <div className="flex flex-wrap gap-3 items-center mb-2">
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1 text-xs">
              <span style={{ width: 12, height: 8, background: s.color ?? "#000", display: "inline-block", borderRadius: 2 }} />
              <span className="truncate max-w-[120px]">{s.label ?? s.key}</span>
            </div>
          ))}
        </div>
      )}
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="block w-full max-w-full h-auto overflow-hidden touch-pan-x"
      >
        {/* grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={margin.left} x2={margin.left + chartW} y1={margin.top + t * chartH} y2={margin.top + t * chartH} stroke="var(--border)" strokeOpacity={0.12} />
        ))}

        {/* reference lines */}
        {(referenceLines || []).map((rl, i) => (
          <line key={i} x1={margin.left} x2={margin.left + chartW} y1={memo.y(rl.value)} y2={memo.y(rl.value)} stroke="#ffffff88" strokeDasharray="3 3" />
        ))}

        {/* area gradients */}
        <defs>
          {series.map((s, i) => {
            const id = `grad-${String(s.key).replace(/[^a-z0-9-_]/gi, "")}-${i}`;
            const c = s.color ?? "#000";
            return (
              <linearGradient id={id} key={id} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.22" />
                <stop offset="100%" stopColor={c} stopOpacity="0.02" />
              </linearGradient>
            );
          })}
        </defs>

        {/* areas */}
        {series.map((s, i) => s.type === "area" ? (
          <path key={s.key} d={memo.buildAreaPath(s.key)} fill={`url(#grad-${String(s.key).replace(/[^a-z0-9-_]/gi, "")}-${i})`} stroke={s.color ?? "#000"} strokeWidth={s.strokeWidth ?? 1.5} />
        ) : null)}

        {/* lines */}
        {series.map((s) => s.type !== "area" ? (
          <path key={s.key} d={memo.buildPath(s.key)} fill="none" stroke={s.color ?? "#000"} strokeWidth={s.strokeWidth ?? 2} strokeLinejoin="round" strokeLinecap="round" />
        ) : null)}

        {/* dots for hovered index */}
        {hoverIdx != null && series.map((s) => {
          const v = data[hoverIdx]?.[s.key];
          if (v == null) return null;
          const px = memo.x(hoverIdx);
          const py = memo.y(v);
          return <circle key={s.key} cx={px} cy={py} r={3} fill={s.color ?? "#000"} />;
        })}

        {/* overlay for pointer events */}
        <rect
          x={margin.left}
          y={margin.top}
          width={chartW}
          height={chartH}
          fill="transparent"
          onPointerMove={(e) => handlePointer(e.clientX, e.currentTarget)}
          onPointerDown={(e) => handlePointer(e.clientX, e.currentTarget)}
          onPointerLeave={() => setHoverIdx(null)}
        />
      </svg>

      {/* tooltip */}
      {hoverIdx != null && data && data[hoverIdx] && (
        <div
          style={{
            position: "absolute",
            left: hoverIdx > (memo.n - 1) / 2 ? undefined : margin.left + (hoverIdx / Math.max(1, memo.n - 1)) * chartW,
            right: hoverIdx > (memo.n - 1) / 2 ? Math.max(8, w - (margin.left + (hoverIdx / Math.max(1, memo.n - 1)) * chartW)) : undefined,
            top: 8,
          }}
          className="pointer-events-none bg-card border border-border rounded-xl p-2.5 text-xs max-w-[70vw] z-10 whitespace-nowrap shadow-md backdrop-blur-sm"
        >
          <div className="font-semibold">{String(data[hoverIdx]?.[xKey] ?? "")}</div>
          {series.map((s) => {
            const v = data[hoverIdx]?.[s.key];
            if (v == null) return null;
            return <div key={s.key} className="flex items-center gap-2 mt-0.5"><span style={{ width:10,height:8,background:s.color||"#000" }} /> <span>{s.label ?? s.key}:</span> <span className="font-medium">{s.formatter ? s.formatter(v) : String(v)}</span></div>;
          })}
        </div>
      )}
    </div>
  );
}
