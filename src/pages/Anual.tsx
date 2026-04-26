import { useMemo } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, monthlyAmount, MONTHS, isFixedActiveInMonth } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Anual() {
  const { fixedItems, transactions, activeYear, setActive, activeMonth } = useFinance();

  const data = useMemo(() => {
    return MONTHS.map((m, idx) => {
      let income = 0, expense = 0, saving = 0;
      for (const i of fixedItems) {
        if (!isFixedActiveInMonth(i, activeYear, idx)) continue;
        const ma = monthlyAmount(i);
        if (i.type === "income_fixed") income += ma;
        else if (i.type === "saving_fixed") saving += ma;
        else expense += ma;
      }
      for (const t of transactions) {
        const d = new Date(t.date);
        if (d.getMonth() !== idx || d.getFullYear() !== activeYear) continue;
        if (t.type === "income") income += t.amount;
        else if (t.type === "saving") saving += t.amount;
        else expense += t.amount;
      }
      return { mes: m.slice(0, 3), Ingresos: Math.round(income), Gastos: Math.round(expense), Ahorros: Math.round(saving), Neto: Math.round(income - expense - saving) };
    });
  }, [fixedItems, transactions, activeYear]);

  const totals = data.reduce((a, b) => ({ income: a.income + b.Ingresos, expense: a.expense + b.Gastos, saving: a.saving + b.Ahorros, net: a.net + b.Neto }), { income: 0, expense: 0, saving: 0, net: 0 });

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    fixedItems.filter((i) => i.type === "expense_fixed" || i.type === "expense_variable").forEach((i) => {
      let total = 0;
      for (let m = 0; m < 12; m++) if (isFixedActiveInMonth(i, activeYear, m)) total += monthlyAmount(i);
      if (total > 0) map[i.category] = (map[i.category] || 0) + total;
    });
    transactions.filter((t) => t.type === "expense" && new Date(t.date).getFullYear() === activeYear).forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [fixedItems, transactions, activeYear]);

  const COLORS = ["hsl(348 92% 60%)","hsl(250 95% 65%)","hsl(170 80% 45%)","hsl(38 95% 55%)","hsl(280 90% 65%)","hsl(200 95% 55%)","hsl(20 95% 60%)","hsl(152 75% 42%)"];

  return (
    <div>
      <Header title="Resumen anual" subtitle={`Año ${activeYear}`} />

      <div className="px-5 mb-3 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-1.5 py-1.5 shadow-soft">
          <button onClick={() => setActive(activeYear - 1, activeMonth)} className="size-8 rounded-full hover:bg-muted flex items-center justify-center transition"><ChevronLeft className="size-4" /></button>
          <span className="px-3 h-8 flex items-center text-sm font-extrabold">{activeYear}</span>
          <button onClick={() => setActive(activeYear + 1, activeMonth)} className="size-8 rounded-full hover:bg-muted flex items-center justify-center transition"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      <div className="px-5 grid grid-cols-2 gap-3">
        <Card label="Ingreso anual" value={fmt(totals.income)} tone="success" />
        <Card label="Gasto anual" value={fmt(totals.expense)} tone="danger" />
        <Card label="Ahorro anual" value={fmt(totals.saving)} tone="info" />
        <Card label="Neto anual" value={fmt(totals.net)} tone="primary" />
      </div>

      <section className="px-5 mt-6">
        <h2 className="text-base font-bold mb-3">Comparativo mensual</h2>
        <div className="rounded-3xl bg-card border border-border p-3 shadow-soft">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Ingresos" fill="hsl(152 75% 42%)" radius={[6,6,0,0]} />
              <Bar dataKey="Gastos" fill="hsl(348 92% 60%)" radius={[6,6,0,0]} />
              <Bar dataKey="Ahorros" fill="hsl(250 95% 65%)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-base font-bold mb-3">Gasto por categoría</h2>
        <div className="rounded-3xl bg-card border border-border p-4 shadow-soft">
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin gastos registrados en {activeYear}</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {byCategory.slice(0, 8).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="size-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="flex-1 truncate text-muted-foreground">{c.name}</span>
                    <span className="font-bold">{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="px-5 mt-6">
        <h2 className="text-base font-bold mb-3">Detalle por mes</h2>
        <div className="rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/60"><tr><th className="text-left p-3 font-bold">Mes</th><th className="text-right p-3 font-bold">Ingr.</th><th className="text-right p-3 font-bold">Gasto</th><th className="text-right p-3 font-bold">Neto</th></tr></thead>
            <tbody>
              {data.map((d, idx) => (
                <tr key={d.mes} onClick={() => setActive(activeYear, idx)} className="border-t border-border cursor-pointer hover:bg-muted/40 transition">
                  <td className="p-3 font-semibold">{d.mes}</td>
                  <td className="p-3 text-right text-success font-semibold">{fmt(d.Ingresos)}</td>
                  <td className="p-3 text-right text-destructive font-semibold">{fmt(d.Gastos)}</td>
                  <td className={`p-3 text-right font-bold ${d.Neto >= 0 ? "text-foreground" : "text-destructive"}`}>{fmt(d.Neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" | "info" | "primary" }) {
  const map = { success: "gradient-success", danger: "gradient-sunset", info: "gradient-ocean", primary: "gradient-primary" };
  return (
    <div className={`rounded-2xl p-4 text-primary-foreground shadow-pop ${map[tone]}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-90 font-bold">{label}</p>
      <p className="text-lg font-extrabold mt-1">{value}</p>
    </div>
  );
}
