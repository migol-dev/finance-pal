import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFinance } from "@/store/finance-store";
import { fmt, fmt2, monthlyAmount, MONTHS, MONTHS_SHORT, isFixedActiveInMonth, iconFor, PAYMENT_METHOD_LABEL, PAYMENT_METHOD_EMOJI, PaymentMethod, parseDateLocal } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { PillTabs } from "@/components/app/PillTabs";
import { IconDisplay } from "@/components/app/IconDisplay";
import SimpleAreaChart from "@/components/ui/SimpleAreaChart";
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PiggyBank,
  Wallet, Trophy, AlertTriangle, Sparkles, Download, Target, HandCoins,
} from "lucide-react";
import { motion } from "@/lib/framer";
import { toast } from "sonner";

type Tab = "general" | "categorias" | "metodos" | "metas";

interface MonthRow {
  mes: string;
  idx: number;
  Ingresos: number;
  Gastos: number;
  Ahorros: number;
  Neto: number;
  Tasa: number; // savings rate
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--primary-glow))",
  "hsl(250 95% 65%)",
];

export default function Anual() {
  const fixedItems = useFinance((s) => s.fixedItems);
  const transactions = useFinance((s) => s.transactions);
  const debts = useFinance((s) => s.debts);
  const goals = useFinance((s) => s.goals);
  const activeYear = useFinance((s) => s.activeYear);
  const activeMonth = useFinance((s) => s.activeMonth);
  const setActive = useFinance((s) => s.setActive);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("general");

  /* ---------- Aggregate per month, current and previous year ---------- */
  const monthly = useMemo<MonthRow[]>(() => buildMonthly(activeYear), [fixedItems, transactions, debts, activeYear]);
  const monthlyPrev = useMemo<MonthRow[]>(() => buildMonthly(activeYear - 1), [fixedItems, transactions, debts, activeYear]);

  function buildMonthly(year: number): MonthRow[] {
    return MONTHS.map((m, idx) => {
      let income = 0, expense = 0, saving = 0;
      for (const i of fixedItems) {
        if (!isFixedActiveInMonth(i, year, idx)) continue;
        const ma = monthlyAmount(i);
        if (i.type === "income_fixed") income += ma;
        else if (i.type === "saving_fixed") saving += ma;
        else expense += ma;
      }
      for (const t of transactions) {
        const d = parseDateLocal(t.date);
        if (d.getMonth() !== idx || d.getFullYear() !== year) continue;
        if (t.type === "income") income += t.amount;
        else if (t.type === "saving") saving += t.amount;
        else expense += t.amount;
      }
      for (const dt of debts) {
        const dd = parseDateLocal(dt.date);
        if (dd.getFullYear() === year && dd.getMonth() === idx) expense += dt.amount;
        for (const p of dt.payments) {
          const pd = parseDateLocal(p.date);
          if (pd.getFullYear() === year && pd.getMonth() === idx) income += p.amount;
        }
      }
      const tasa = income > 0 ? (saving / income) * 100 : 0;
      return {
        mes: MONTHS_SHORT[idx], idx,
        Ingresos: Math.round(income),
        Gastos: Math.round(expense),
        Ahorros: Math.round(saving),
        Neto: Math.round(income - expense - saving),
        Tasa: Math.round(tasa * 10) / 10,
      };
    });
  }

  const totals = useMemo(() => monthly.reduce(
    (a, b) => ({
      income: a.income + b.Ingresos,
      expense: a.expense + b.Gastos,
      saving: a.saving + b.Ahorros,
      net: a.net + b.Neto,
    }),
    { income: 0, expense: 0, saving: 0, net: 0 }
  ), [monthly]);

  const totalsPrev = useMemo(() => monthlyPrev.reduce(
    (a, b) => ({ income: a.income + b.Ingresos, expense: a.expense + b.Gastos, saving: a.saving + b.Ahorros, net: a.net + b.Neto }),
    { income: 0, expense: 0, saving: 0, net: 0 }
  ), [monthlyPrev]);

  const avg = {
    income: totals.income / 12,
    expense: totals.expense / 12,
    saving: totals.saving / 12,
    net: totals.net / 12,
  };
  const savingsRate = totals.income > 0 ? (totals.saving / totals.income) * 100 : 0;

  /* ---------- Best/Worst months ---------- */
  const monthsWithActivity = monthly.filter(m => m.Ingresos + m.Gastos + m.Ahorros > 0);
  const bestNet = monthsWithActivity.length ? [...monthsWithActivity].sort((a,b) => b.Neto - a.Neto)[0] : null;
  const worstNet = monthsWithActivity.length ? [...monthsWithActivity].sort((a,b) => a.Neto - b.Neto)[0] : null;
  const topExpenseMonth = monthsWithActivity.length ? [...monthsWithActivity].sort((a,b) => b.Gastos - a.Gastos)[0] : null;

  /* ---------- Categories aggregated ---------- */
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    fixedItems.filter((i) => i.type === "expense_fixed" || i.type === "expense_variable").forEach((i) => {
      let total = 0;
      for (let m = 0; m < 12; m++) if (isFixedActiveInMonth(i, activeYear, m)) total += monthlyAmount(i);
      if (total > 0) map[i.category] = (map[i.category] || 0) + total;
    });
    transactions.filter((t) => t.type === "expense" && parseDateLocal(t.date).getFullYear() === activeYear)
      .forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [fixedItems, transactions, activeYear]);

  /* ---------- Top concepts (variable expenses) ---------- */
  const topConcepts = useMemo(() => {
    const map: Record<string, { amount: number; count: number; sample: any }> = {};
    transactions.filter((t) => t.type === "expense" && parseDateLocal(t.date).getFullYear() === activeYear)
      .forEach((t) => {
        const k = t.concept.trim();
        if (!map[k]) map[k] = { amount: 0, count: 0, sample: t };
        map[k].amount += t.amount;
        map[k].count += 1;
      });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [transactions, activeYear]);

  /* ---------- Payment methods ---------- */
  const byMethod = useMemo(() => {
    const map: Record<PaymentMethod, number> = { cash: 0, transfer: 0, card: 0, other: 0 };
    transactions.filter((t) => t.type === "expense" && parseDateLocal(t.date).getFullYear() === activeYear)
      .forEach((t) => { if (t.paymentMethod) map[t.paymentMethod] += t.amount; });
    fixedItems.filter((i) => i.type === "expense_fixed" || i.type === "expense_variable").forEach((i) => {
      if (!i.paymentMethod) return;
      let total = 0;
      for (let m = 0; m < 12; m++) if (isFixedActiveInMonth(i, activeYear, m)) total += monthlyAmount(i);
      map[i.paymentMethod] += total;
    });
    return (Object.keys(map) as PaymentMethod[])
      .map((k) => ({ key: k, name: PAYMENT_METHOD_LABEL[k], emoji: PAYMENT_METHOD_EMOJI[k], value: Math.round(map[k]) }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, fixedItems, activeYear]);

  /* ---------- Goals progress this year ---------- */
  const goalsThisYear = useMemo(() => goals.map((g) => {
    const contribsYear = (g.contributions ?? []).filter((c) => parseDateLocal(c.date).getFullYear() === activeYear)
      .reduce((s, c) => s + c.amount, 0);
    return { goal: g, contribsYear };
  }), [goals, activeYear]);

  /* ---------- Debts overview for the year ---------- */
  const debtsYear = useMemo(() => {
    const lent = debts.filter((d) => parseDateLocal(d.date).getFullYear() === activeYear)
      .reduce((s, d) => s + d.amount, 0);
    const collected = debts.flatMap((d) => d.payments)
      .filter((p) => parseDateLocal(p.date).getFullYear() === activeYear)
      .reduce((s, p) => s + p.amount, 0);
    const outstanding = debts.reduce((s, d) => {
      const paid = d.payments.reduce((a, p) => a + p.amount, 0);
      return s + Math.max(0, d.amount - paid);
    }, 0);
    return { lent, collected, outstanding };
  }, [debts, activeYear]);

  /* ---------- CSV export ---------- */
  const exportCsv = () => {
    const rows = [["Mes", "Ingresos", "Gastos", "Ahorros", "Neto", "Tasa de ahorro %"]];
    monthly.forEach((m) => rows.push([m.mes, String(m.Ingresos), String(m.Gastos), String(m.Ahorros), String(m.Neto), String(m.Tasa)]));
    rows.push(["TOTAL", String(totals.income), String(totals.expense), String(totals.saving), String(totals.net), String(savingsRate.toFixed(1))]);
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `resumen-${activeYear}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado resumen-${activeYear}.csv`);
  };

  const tooltipStyle = {
    borderRadius: 12,
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
    fontSize: 11,
  } as const;

  // lightweight built-in charts (recharts removed for bundle size)

  return (
    <div>
      <Header title="Resumen anual" subtitle="Tu año en una sola vista"
        action={
          <button onClick={exportCsv} className="size-11 rounded-2xl bg-card border border-border shadow-soft flex items-center justify-center hover:bg-muted transition" aria-label="Exportar CSV">
            <Download className="size-4" />
          </button>
        } />

      {/* Year switcher */}
      <div className="px-5 mb-4 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-1.5 py-1.5 shadow-soft">
          <button onClick={() => setActive(activeYear - 1, activeMonth)} className="size-9 rounded-full hover:bg-muted flex items-center justify-center transition" aria-label="Año anterior"><ChevronLeft className="size-4" /></button>
          <span className="px-4 h-9 flex items-center text-base font-extrabold tracking-tight">{activeYear}</span>
          <button onClick={() => setActive(activeYear + 1, activeMonth)} className="size-9 rounded-full hover:bg-muted flex items-center justify-center transition" aria-label="Año siguiente"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      {/* Hero net card */}
      <motion.section
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="mx-5 rounded-3xl gradient-primary text-primary-foreground p-6 shadow-glow relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-primary-glow/40 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 size-32 rounded-full bg-secondary/40 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest opacity-80 font-semibold">Neto del año</p>
          <p className="text-5xl font-extrabold tracking-tight mt-1">{fmt(totals.net)}</p>
          <YoyBadge current={totals.net} previous={totalsPrev.net} />
          <div className="grid grid-cols-3 gap-3 mt-5">
            <MiniStat icon={<TrendingUp className="size-3.5" />} label="Ingresos" value={fmt(totals.income)} />
            <MiniStat icon={<TrendingDown className="size-3.5" />} label="Gastos" value={fmt(totals.expense)} />
            <MiniStat icon={<PiggyBank className="size-3.5" />} label="Ahorro" value={fmt(totals.saving)} />
          </div>
        </div>
      </motion.section>

      {/* Savings rate */}
      <section className="px-5 mt-4">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Tasa de ahorro anual</span>
            <span className="text-sm font-bold text-success">{savingsRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, savingsRate)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full gradient-success rounded-full" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Promedio mensual: ingresos {fmt(avg.income)} · gastos {fmt(avg.expense)} · ahorro {fmt(avg.saving)}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="px-5 mt-5">
        <PillTabs<Tab>
          ariaLabel="Vistas del resumen anual"
          tabs={["general", "categorias", "metodos", "metas"]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "general" && (
        <>
          {/* Highlights */}
          {(bestNet || worstNet) && (
            <section className="px-5 mt-5 grid grid-cols-2 gap-3">
              {bestNet && (
                <HighlightCard tone="success" icon={<Trophy className="size-4" />} label="Mejor mes"
                  primary={MONTHS[bestNet.idx]} secondary={`Neto ${fmt(bestNet.Neto)}`}
                  onClick={() => { setActive(activeYear, bestNet.idx); navigate("/"); }} />
              )}
              {worstNet && worstNet.Neto < 0 && (
                <HighlightCard tone="danger" icon={<AlertTriangle className="size-4" />} label="Peor mes"
                  primary={MONTHS[worstNet.idx]} secondary={`Neto ${fmt(worstNet.Neto)}`}
                  onClick={() => { setActive(activeYear, worstNet.idx); navigate("/"); }} />
              )}
              {topExpenseMonth && (!worstNet || worstNet.Neto >= 0) && (
                <HighlightCard tone="warning" icon={<TrendingDown className="size-4" />} label="Más gasto"
                  primary={MONTHS[topExpenseMonth.idx]} secondary={fmt(topExpenseMonth.Gastos)}
                  onClick={() => { setActive(activeYear, topExpenseMonth.idx); navigate("/"); }} />
              )}
            </section>
          )}

          {/* Trend chart */}
          <section className="px-5 mt-5">
            <SectionTitle>Flujo mensual</SectionTitle>
            <ChartCard>
              <SimpleAreaChart
                data={monthly}
                xKey="mes"
                height={240}
                series={[
                  { key: "Ingresos", label: "Ingresos", color: "hsl(var(--success))", type: "area", formatter: (v) => fmt(Number(v)) },
                  { key: "Gastos", label: "Gastos", color: "hsl(var(--destructive))", type: "area", formatter: (v) => fmt(Number(v)) },
                ]}
              />
            </ChartCard>
          </section>

          {/* Net + savings rate trend */}
          <section className="px-5 mt-5">
            <SectionTitle>Neto y tasa de ahorro</SectionTitle>
            <ChartCard>
              <SimpleAreaChart
                data={monthly}
                xKey="mes"
                height={220}
                series={[
                  { key: "Neto", label: "Neto", color: "hsl(var(--primary))", type: "line", formatter: (v) => fmt(Number(v)) },
                  { key: "Tasa", label: "Tasa", color: "hsl(var(--accent))", type: "line", formatter: (v) => `${v}%` },
                ]}
              />
            </ChartCard>
          </section>

          {/* YoY comparison */}
          <section className="px-5 mt-5">
            <SectionTitle>Comparativo vs {activeYear - 1}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <YoyCard label="Ingresos" current={totals.income} previous={totalsPrev.income} positive />
              <YoyCard label="Gastos" current={totals.expense} previous={totalsPrev.expense} positive={false} />
              <YoyCard label="Ahorro" current={totals.saving} previous={totalsPrev.saving} positive />
              <YoyCard label="Neto" current={totals.net} previous={totalsPrev.net} positive />
            </div>
          </section>

          {/* Debts */}
          {(debtsYear.lent + debtsYear.collected + debtsYear.outstanding > 0) && (
            <section className="px-5 mt-5">
              <SectionTitle>Deudas a tu favor</SectionTitle>
              <div className="rounded-3xl bg-card border border-border p-4 shadow-soft grid grid-cols-3 gap-3">
                <DebtStat icon={<HandCoins className="size-4" />} label="Prestado" value={fmt(debtsYear.lent)} tone="warning" />
                <DebtStat icon={<Wallet className="size-4" />} label="Cobrado" value={fmt(debtsYear.collected)} tone="success" />
                <DebtStat icon={<AlertTriangle className="size-4" />} label="Por cobrar" value={fmt(debtsYear.outstanding)} tone="danger" />
              </div>
            </section>
          )}

          {/* Monthly detail */}
          <section className="px-5 mt-5">
            <SectionTitle>Detalle por mes</SectionTitle>
            <div className="rounded-3xl bg-card border border-border shadow-soft overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 font-bold">Mes</th>
                    <th className="text-right p-3 font-bold">Ingr.</th>
                    <th className="text-right p-3 font-bold">Gasto</th>
                    <th className="text-right p-3 font-bold">Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((d) => (
                    <tr key={d.mes}
                      onClick={() => { setActive(activeYear, d.idx); navigate("/"); }}
                      className="border-t border-border cursor-pointer hover:bg-muted/40 transition">
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
        </>
      )}

      {tab === "categorias" && (
        <>
          <section className="px-5 mt-5">
            <SectionTitle>Gasto por categoría</SectionTitle>
            <ChartCard>
              {byCategory.length === 0 ? (
                <EmptyState text={`Sin gastos registrados en ${activeYear}`} />
              ) : (
                <>
                  <div className="space-y-2 mt-1">
                    {byCategory.slice(0, 8).map((c, i) => {
                      const pct = (c.value / totals.expense) * 100 || 0;
                      return (
                        <div key={c.name}>
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="size-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="flex-1 truncate font-semibold">{c.name}</span>
                            <span className="font-bold">{fmt(c.value)}</span>
                            <span className="text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </ChartCard>
          </section>

          <section className="px-5 mt-5">
            <SectionTitle>Top conceptos del año</SectionTitle>
            {topConcepts.length === 0 ? (
              <ChartCard><EmptyState text="Aún no hay movimientos variables" /></ChartCard>
            ) : (
              <div className="space-y-2">
                {topConcepts.map((c) => (
                  <div key={c.name} className="rounded-2xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
                    <IconDisplay icon={iconFor(c.sample)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.count} movimiento{c.count === 1 ? "" : "s"}</p>
                    </div>
                    <p className="font-bold text-sm">{fmt(c.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === "metodos" && (
        <section className="px-5 mt-5">
          <SectionTitle>Gasto por método de pago</SectionTitle>
          <ChartCard>
            {byMethod.length === 0 ? (
              <EmptyState text="Sin métodos de pago registrados" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {byMethod.map((m) => {
                    const total = byMethod.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? (m.value / total) * 100 : 0;
                    return (
                      <div key={m.key} className="rounded-2xl bg-muted/60 p-3">
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          <span className="text-base">{m.emoji}</span>{m.name}
                        </p>
                        <p className="text-base font-extrabold mt-1">{fmt(m.value)}</p>
                        <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% del total</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </ChartCard>
        </section>
      )}

      {tab === "metas" && (
        <section className="px-5 mt-5">
          <SectionTitle>Avance de metas</SectionTitle>
          {goalsThisYear.length === 0 ? (
            <ChartCard>
              <div className="text-center py-6">
                <Target className="size-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aún no creas ninguna meta</p>
                <button onClick={() => navigate("/metas")} className="mt-3 text-xs font-bold text-primary">Ir a Metas →</button>
              </div>
            </ChartCard>
          ) : (
            <div className="space-y-3">
              {goalsThisYear.map(({ goal, contribsYear }) => {
                const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
                return (
                  <button key={goal.id} onClick={() => navigate("/metas")}
                    className={`block w-full text-left rounded-3xl p-4 text-primary-foreground shadow-pop relative overflow-hidden ${goal.color}`}>
                    <div className="flex items-center gap-3">
                      <IconDisplay icon={iconFor(goal)} className="bg-white/20" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{goal.name}</p>
                        <p className="text-[11px] opacity-90">{fmt(goal.saved)} / {fmt(goal.target)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold">{Math.round(pct)}%</p>
                        <p className="text-[10px] opacity-80 uppercase tracking-wide">avance</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-white/25 overflow-hidden mt-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} className="h-full bg-white rounded-full" />
                    </div>
                    <p className="text-[11px] opacity-90 mt-2">
                      <Sparkles className="inline size-3 mr-1" />Aportado en {activeYear}: <span className="font-bold">{fmt(contribsYear)}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="h-6" />
    </div>
  );
}

/* ─────────────────────────  Sub-components  ───────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold mb-3">{children}</h2>;
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl bg-card border border-border p-4 shadow-soft">{children}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground text-center py-8">{text}</p>;
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-2.5">
      <div className="flex items-center gap-1 opacity-90">{icon}<span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span></div>
      <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
}

function YoyBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : 100;
  const positive = diff >= 0;
  return (
    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? "+" : ""}{pct.toFixed(0)}% vs año anterior
    </div>
  );
}

function YoyCard({ label, current, previous, positive }: { label: string; current: number; previous: number; positive: boolean }) {
  const diff = current - previous;
  // For "expense" positive=false: increase is bad
  const goodDirection = positive ? diff >= 0 : diff <= 0;
  const tone = goodDirection ? "text-success" : "text-destructive";
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : (current === 0 ? 0 : 100);
  return (
    <div className="rounded-2xl bg-card border border-border p-3 shadow-soft">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className="text-base font-extrabold mt-1">{fmt(current)}</p>
      <p className={`text-[11px] font-bold mt-0.5 ${tone}`}>
        {diff >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
        <span className="text-muted-foreground font-normal"> · {fmt2(previous)}</span>
      </p>
    </div>
  );
}

function HighlightCard({ tone, icon, label, primary, secondary, onClick }: {
  tone: "success" | "danger" | "warning";
  icon: React.ReactNode; label: string; primary: string; secondary: string; onClick?: () => void;
}) {
  const map = {
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <button onClick={onClick} className="rounded-2xl bg-card border border-border p-3 shadow-soft text-left active:scale-[0.98] transition">
      <div className={`size-8 rounded-xl flex items-center justify-center ${map[tone]}`}>{icon}</div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-2">{label}</p>
      <p className="text-sm font-extrabold mt-0.5">{primary}</p>
      <p className="text-[11px] text-muted-foreground">{secondary}</p>
    </button>
  );
}

function DebtStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "success" | "danger" | "warning" }) {
  const map = {
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <div className="text-center">
      <div className={`size-9 mx-auto rounded-xl flex items-center justify-center ${map[tone]}`}>{icon}</div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-2">{label}</p>
      <p className="text-sm font-extrabold mt-0.5">{value}</p>
    </div>
  );
}
