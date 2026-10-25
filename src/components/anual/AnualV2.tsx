import React, { useMemo, useState, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  fmt,
  fmt2,
  monthlyAmount,
  MONTHS,
  MONTHS_SHORT,
  isFixedActiveInMonth,
  iconFor,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_EMOJI,
  PaymentMethod,
  parseDateLocal,
} from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { PillTabs } from "@/components/app/PillTabs";
import { IconDisplay } from "@/components/app/IconDisplay";
import SimpleAreaChart from "@/components/ui/SimpleAreaChart";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  Trophy,
  AlertTriangle,
  Sparkles,
  Download,
  Target,
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
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
  Tasa: number;
}

const CATEGORY_COLORS = [
  "#1F7A5A",
  "#2383E2",
  "#D9730D",
  "#C86446",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F59E0B",
];

export const AnualV2 = memo(function AnualV2() {
  const {
    fixedItems,
    transactions,
    debts,
    goals,
    activeYear,
    activeMonth,
    setActive,
    accounts,
  } = useFinanceData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("general");

  // Fast monthly aggregation memoized across year
  const buildMonthly = useCallback(
    (year: number): MonthRow[] => {
      return MONTHS.map((_, idx) => {
        let income = 0;
        let expense = 0;
        let saving = 0;

        for (const i of fixedItems) {
          if (!isFixedActiveInMonth(i, year, idx)) continue;
          const recordedForFixed = transactions
            .filter((t) => {
              if (t.fixedId !== i.id) return false;
              const d = parseDateLocal(t.date);
              return d.getFullYear() === year && d.getMonth() === idx;
            })
            .reduce((sum, t) => sum + t.amount, 0);
          const ma = Math.max(0, monthlyAmount(i) - recordedForFixed);
          if (i.type === "income_fixed") income += ma;
          else if (i.type === "saving_fixed") saving += ma;
          else expense += ma;
        }

        for (const t of transactions) {
          const d = parseDateLocal(t.date);
          if (d.getMonth() !== idx || d.getFullYear() !== year) continue;
          const isInternalTransfer =
            t.type === "transfer" ||
            (t.transferToAccountId &&
              accounts.some((a) => a.id === t.transferToAccountId));
          if (isInternalTransfer) continue;
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

        const tasa = income > 0 ? Math.max(0, (saving / income) * 100) : 0;
        return {
          mes: MONTHS_SHORT[idx],
          idx,
          Ingresos: Math.round(Math.max(0, income)),
          Gastos: Math.round(Math.max(0, expense)),
          Ahorros: Math.round(Math.max(0, saving)),
          Neto: Math.round(income - expense - saving),
          Tasa: Math.round(tasa * 10) / 10,
        };
      });
    },
    [fixedItems, transactions, debts, accounts]
  );

  const monthly = useMemo<MonthRow[]>(() => buildMonthly(activeYear), [buildMonthly, activeYear]);
  const monthlyPrev = useMemo<MonthRow[]>(() => buildMonthly(activeYear - 1), [buildMonthly, activeYear]);

  const totals = useMemo(() => {
    return monthly.reduce(
      (a, b) => ({
        income: a.income + b.Ingresos,
        expense: a.expense + b.Gastos,
        saving: a.saving + b.Ahorros,
        net: a.net + b.Neto,
      }),
      { income: 0, expense: 0, saving: 0, net: 0 }
    );
  }, [monthly]);

  const totalsPrev = useMemo(() => {
    return monthlyPrev.reduce(
      (a, b) => ({
        income: a.income + b.Ingresos,
        expense: a.expense + b.Gastos,
        saving: a.saving + b.Ahorros,
        net: a.net + b.Neto,
      }),
      { income: 0, expense: 0, saving: 0, net: 0 }
    );
  }, [monthlyPrev]);

  const avg = useMemo(() => ({
    income: totals.income / 12,
    expense: totals.expense / 12,
    saving: totals.saving / 12,
    net: totals.net / 12,
  }), [totals]);

  const savingsRate = totals.income > 0 ? (totals.saving / totals.income) * 100 : 0;

  const monthsWithActivity = useMemo(() => monthly.filter((m) => m.Ingresos + m.Gastos + m.Ahorros > 0), [monthly]);
  const bestNet = useMemo(() => (monthsWithActivity.length ? [...monthsWithActivity].sort((a, b) => b.Neto - a.Neto)[0] : null), [monthsWithActivity]);
  const worstNet = useMemo(() => (monthsWithActivity.length ? [...monthsWithActivity].sort((a, b) => a.Neto - b.Neto)[0] : null), [monthsWithActivity]);
  const topExpenseMonth = useMemo(() => (monthsWithActivity.length ? [...monthsWithActivity].sort((a, b) => b.Gastos - a.Gastos)[0] : null), [monthsWithActivity]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    fixedItems
      .filter((i) => i.type === "expense_fixed" || i.type === "expense_variable")
      .forEach((i) => {
        let total = 0;
        for (let m = 0; m < 12; m++) {
          if (!isFixedActiveInMonth(i, activeYear, m)) continue;
          const recordedForFixed = transactions
            .filter((t) => {
              if (t.fixedId !== i.id || t.type !== "expense") return false;
              const d = parseDateLocal(t.date);
              return d.getFullYear() === activeYear && d.getMonth() === m;
            })
            .reduce((sum, t) => sum + t.amount, 0);
          total += Math.max(0, monthlyAmount(i) - recordedForFixed);
        }
        if (total > 0) map[i.category] = (map[i.category] || 0) + total;
      });

    transactions
      .filter((t) => t.type === "expense" && parseDateLocal(t.date).getFullYear() === activeYear)
      .forEach((t) => {
        if (
          t.type === "transfer" ||
          (t.transferToAccountId && accounts.some((a) => a.id === t.transferToAccountId))
        )
          return;
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [fixedItems, transactions, activeYear, accounts]);

  const topConcepts = useMemo(() => {
    const map: Record<string, { amount: number; count: number; sample: any }> = {};
    transactions
      .filter((t) => t.type === "expense" && parseDateLocal(t.date).getFullYear() === activeYear)
      .forEach((t) => {
        if (
          t.type === "transfer" ||
          (t.transferToAccountId && accounts.some((a) => a.id === t.transferToAccountId))
        )
          return;
        const k = t.concept.trim();
        if (!map[k]) map[k] = { amount: 0, count: 0, sample: t };
        map[k].amount += t.amount;
        map[k].count += 1;
      });

    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [transactions, activeYear, accounts]);

  const byMethod = useMemo(() => {
    const map: Record<PaymentMethod, number> = { cash: 0, transfer: 0, card: 0, other: 0 };
    transactions
      .filter((t) => t.type === "expense" && parseDateLocal(t.date).getFullYear() === activeYear)
      .forEach((t) => {
        if (
          t.paymentMethod &&
          !(
            t.type === "transfer" ||
            (t.transferToAccountId && accounts.some((a) => a.id === t.transferToAccountId))
          )
        ) {
          map[t.paymentMethod] += t.amount;
        }
      });

    fixedItems
      .filter((i) => i.type === "expense_fixed" || i.type === "expense_variable")
      .forEach((i) => {
        if (!i.paymentMethod) return;
        let total = 0;
        for (let m = 0; m < 12; m++) {
          if (!isFixedActiveInMonth(i, activeYear, m)) continue;
          const recordedForFixed = transactions
            .filter((t) => {
              if (t.fixedId !== i.id || t.type !== "expense") return false;
              const d = parseDateLocal(t.date);
              return d.getFullYear() === activeYear && d.getMonth() === m;
            })
            .reduce((sum, t) => sum + t.amount, 0);
          total += Math.max(0, monthlyAmount(i) - recordedForFixed);
        }
        map[i.paymentMethod] += total;
      });

    return (Object.keys(map) as PaymentMethod[])
      .map((k) => ({
        key: k,
        name: PAYMENT_METHOD_LABEL[k],
        emoji: PAYMENT_METHOD_EMOJI[k],
        value: Math.round(map[k]),
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, fixedItems, activeYear, accounts]);

  const goalsThisYear = useMemo(
    () =>
      goals.map((g) => {
        const contribsYear = (g.contributions ?? [])
          .filter((c: any) => parseDateLocal(c.date).getFullYear() === activeYear)
          .reduce((s: number, c: any) => s + c.amount, 0);
        return { goal: g, contribsYear };
      }),
    [goals, activeYear]
  );

  const debtsYear = useMemo(() => {
    const lent = debts
      .filter((d) => parseDateLocal(d.date).getFullYear() === activeYear)
      .reduce((s, d) => s + d.amount, 0);
    const collected = debts
      .flatMap((d) => d.payments)
      .filter((p) => parseDateLocal(p.date).getFullYear() === activeYear)
      .reduce((s, p) => s + p.amount, 0);
    const outstanding = debts.reduce((s, d) => {
      const paid = d.payments.reduce((a, p) => a + p.amount, 0);
      return s + Math.max(0, d.amount - paid);
    }, 0);
    return { lent, collected, outstanding };
  }, [debts, activeYear]);

  const exportCsv = useCallback(() => {
    const rows = [["Mes", "Ingresos", "Gastos", "Ahorros", "Neto", "Tasa de ahorro %"]];
    monthly.forEach((m) =>
      rows.push([
        m.mes,
        String(m.Ingresos),
        String(m.Gastos),
        String(m.Ahorros),
        String(m.Neto),
        String(m.Tasa),
      ])
    );
    rows.push([
      "TOTAL",
      String(totals.income),
      String(totals.expense),
      String(totals.saving),
      String(totals.net),
      String(savingsRate.toFixed(1)),
    ]);
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen-${activeYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success(`Exportado resumen-${activeYear}.csv`);
  }, [monthly, totals, savingsRate, activeYear]);

  const maxMonthValue = useMemo(() => {
    return Math.max(
      1,
      ...monthly.map((m) => Math.max(m.Ingresos, m.Gastos, m.Ahorros))
    );
  }, [monthly]);

  return (
    <div className="min-h-screen pb-32 bg-[#FAF8F5] dark:bg-[#0C0C0B] text-[#191918] dark:text-[#EDEDED]">
      {/* Editorial Header */}
      <Header
        title="Resumen Anual"
        subtitle={`Visión macroeconómica y desempeño integral de ${activeYear}`}
        action={
          <button
            onClick={exportCsv}
            className="size-11 min-w-[44px] min-h-[44px] rounded-xl bg-white dark:bg-[#141413] border border-[#E4E0D8] dark:border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
            aria-label="Exportar CSV"
          >
            <Download className="size-4" strokeWidth={1.5} />
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Year Navigator & Macro Hero */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#E4E0D8] dark:border-white/10 pb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono-tabular tracking-wider text-[#6E6A63] dark:text-[#8E8D8A]">
              EJERCICIO FISCAL
            </span>
            <div className="inline-flex items-center gap-1 rounded-xl bg-white dark:bg-[#141413] border border-[#E4E0D8] dark:border-white/10 p-1">
              <button
                onClick={() => setActive(activeYear - 1, activeMonth)}
                className="size-9 sm:size-8 min-w-[36px] sm:min-w-[32px] h-9 sm:h-8 rounded-lg hover:bg-[#F2EFE9] dark:hover:bg-white/5 flex items-center justify-center transition active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                aria-label="Año anterior"
              >
                <ChevronLeft className="size-4" strokeWidth={1.75} />
              </button>
              <span className="px-3 h-9 sm:h-8 flex items-center text-sm font-bold font-mono-tabular tracking-tight">
                {activeYear}
              </span>
              <button
                onClick={() => setActive(activeYear + 1, activeMonth)}
                className="size-9 sm:size-8 min-w-[36px] sm:min-w-[32px] h-9 sm:h-8 rounded-lg hover:bg-[#F2EFE9] dark:hover:bg-white/5 flex items-center justify-center transition active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                aria-label="Año siguiente"
              >
                <ChevronRight className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-tabular">
            <div>
              <span className="text-[#6E6A63] dark:text-[#8E8D8A] block">Tasa de ahorro:</span>
              <span className="font-bold text-[#1F7A5A] text-sm tabular-nums">
                {savingsRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-6 w-px bg-[#E4E0D8] dark:bg-white/10" />
            <div>
              <span className="text-[#6E6A63] dark:text-[#8E8D8A] block">Promedio mensual neto:</span>
              <span className={`font-bold text-sm tabular-nums ${avg.net >= 0 ? "text-[#1F7A5A]" : "text-[#C86446]"}`}>
                {fmt(avg.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Editorial Card: Net Flow */}
        <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-wider font-mono-tabular text-[#6E6A63] dark:text-[#8E8D8A]">
                  SUPERÁVIT / FLUJO NETO ACUMULADO
                </span>
                <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-[#F2EFE9] dark:bg-white/5 border border-[#E4E0D8] dark:border-white/10">
                  {activeYear}
                </span>
              </div>
              <p className="font-display-v2 text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#191918] dark:text-[#EDEDED]">
                {fmt(totals.net)}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-mono-tabular">
                <YoyBadge current={totals.net} previous={totalsPrev.net} />
                <span className="text-[#6E6A63] dark:text-[#8E8D8A]">
                  vs {fmt(totalsPrev.net)} en {activeYear - 1}
                </span>
              </div>
            </div>

            {/* Micro Stats Bar */}
            <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-[#E4E0D8] dark:border-white/10 pt-4 md:pt-0 md:pl-6">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-mono-tabular text-[#6E6A63] dark:text-[#8E8D8A] flex items-center gap-1">
                  <TrendingUp className="size-3 text-[#1F7A5A]" strokeWidth={1.5} />
                  Ingresos
                </p>
                <p className="font-mono-tabular text-sm sm:text-base font-semibold mt-1 text-[#1F7A5A]">
                  {fmt(totals.income)}
                </p>
                <p className="text-[10px] text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
                  Prom: {fmt(avg.income)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider font-mono-tabular text-[#6E6A63] dark:text-[#8E8D8A] flex items-center gap-1">
                  <TrendingDown className="size-3 text-[#C86446]" strokeWidth={1.5} />
                  Gastos
                </p>
                <p className="font-mono-tabular text-sm sm:text-base font-semibold mt-1 text-[#C86446]">
                  {fmt(totals.expense)}
                </p>
                <p className="text-[10px] text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
                  Prom: {fmt(avg.expense)}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider font-mono-tabular text-[#6E6A63] dark:text-[#8E8D8A] flex items-center gap-1">
                  <PiggyBank className="size-3 text-[#2383E2]" strokeWidth={1.5} />
                  Ahorro
                </p>
                <p className="font-mono-tabular text-sm sm:text-base font-semibold mt-1 text-[#2383E2]">
                  {fmt(totals.saving)}
                </p>
                <p className="text-[10px] text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
                  {savingsRate.toFixed(1)}% tasa
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-start">
          <PillTabs<Tab>
            ariaLabel="Vistas del resumen anual"
            tabs={["general", "categorias", "metodos", "metas"]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {/* TAB 1: GENERAL (Asymmetric 7/5 Desktop Layout) */}
        {tab === "general" && (
          <div className="space-y-6">
            {/* Highlights row if unusual months exist */}
            {(bestNet || worstNet || topExpenseMonth) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {bestNet && (
                  <button
                    onClick={() => {
                      setActive(activeYear, bestNet.idx);
                      navigate("/");
                    }}
                    className="p-4 rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] text-left active:scale-[0.98] transition hover:border-[#1F7A5A]/50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A5A]"
                  >
                    <div className="flex items-center justify-between text-xs text-[#1F7A5A] font-bold">
                      <span className="flex items-center gap-1.5">
                        <Trophy className="size-3.5" strokeWidth={1.5} />
                        Mejor Mes
                      </span>
                      <ArrowUpRight className="size-3.5" />
                    </div>
                    <p className="font-display-v2 text-lg font-normal mt-1.5">{MONTHS[bestNet.idx]}</p>
                    <p className="text-xs font-mono-tabular text-[#1F7A5A] mt-0.5 font-semibold">
                      Neto {fmt(bestNet.Neto)}
                    </p>
                  </button>
                )}

                {worstNet && worstNet.Neto < 0 && (
                  <button
                    onClick={() => {
                      setActive(activeYear, worstNet.idx);
                      navigate("/");
                    }}
                    className="p-4 rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] text-left active:scale-[0.98] transition hover:border-[#C86446]/50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C86446]"
                  >
                    <div className="flex items-center justify-between text-xs text-[#C86446] font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5" strokeWidth={1.5} />
                        Mes con Déficit
                      </span>
                      <ArrowDownRight className="size-3.5" />
                    </div>
                    <p className="font-display-v2 text-lg font-normal mt-1.5">{MONTHS[worstNet.idx]}</p>
                    <p className="text-xs font-mono-tabular text-[#C86446] mt-0.5 font-semibold">
                      Neto {fmt(worstNet.Neto)}
                    </p>
                  </button>
                )}

                {topExpenseMonth && (
                  <button
                    onClick={() => {
                      setActive(activeYear, topExpenseMonth.idx);
                      navigate("/");
                    }}
                    className="p-4 rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] text-left active:scale-[0.98] transition hover:border-[#D9730D]/50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9730D]"
                  >
                    <div className="flex items-center justify-between text-xs text-[#D9730D] font-bold">
                      <span className="flex items-center gap-1.5">
                        <TrendingDown className="size-3.5" strokeWidth={1.5} />
                        Mayor Gasto
                      </span>
                      <ArrowUpRight className="size-3.5" />
                    </div>
                    <p className="font-display-v2 text-lg font-normal mt-1.5">{MONTHS[topExpenseMonth.idx]}</p>
                    <p className="text-xs font-mono-tabular text-[#D9730D] mt-0.5 font-semibold">
                      Gastos {fmt(topExpenseMonth.Gastos)}
                    </p>
                  </button>
                )}
              </div>
            )}

            {/* Asymmetric 7 / 5 Grid: Monthly Flow Chart + YoY Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Area Chart + Monthly Breakdown */}
              <div className="lg:col-span-7 space-y-6">
                {/* De-boxed Chart */}
                <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display-v2 text-base font-normal">
                      Flujo Mensual: Ingresos vs Gastos
                    </h3>
                    <span className="text-[11px] font-mono-tabular text-[#6E6A63] dark:text-[#8E8D8A]">
                      12 Meses
                    </span>
                  </div>
                  <SimpleAreaChart
                    data={monthly}
                    xKey="mes"
                    height={220}
                    series={[
                      {
                        key: "Ingresos",
                        label: "Ingresos",
                        color: "#1F7A5A",
                        type: "area",
                        formatter: (v) => fmt(Number(v)),
                      },
                      {
                        key: "Gastos",
                        label: "Gastos",
                        color: "#C86446",
                        type: "area",
                        formatter: (v) => fmt(Number(v)),
                      },
                    ]}
                  />
                </div>

                {/* Monthly Hairline Table with Inline Bars */}
                <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-5 overflow-x-auto no-scrollbar">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display-v2 text-base font-normal">
                      Detalle por Mes
                    </h3>
                    <span className="text-[11px] font-mono-tabular text-[#6E6A63] dark:text-[#8E8D8A]">
                      Haz clic en un mes para examinarlo
                    </span>
                  </div>

                  <table className="w-full text-xs font-mono-tabular min-w-[420px]">
                    <thead>
                      <tr className="border-b border-[#E4E0D8] dark:border-white/10 text-[#6E6A63] dark:text-[#8E8D8A] text-left">
                        <th className="pb-2.5 font-semibold">Mes</th>
                        <th className="pb-2.5 text-right font-semibold">Ingresos</th>
                        <th className="pb-2.5 text-right font-semibold">Gastos</th>
                        <th className="pb-2.5 text-right font-semibold">Neto</th>
                        <th className="pb-2.5 text-right font-semibold">Tasa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E0D8]/60 dark:divide-white/5">
                      {monthly.map((d) => (
                        <tr
                          key={d.mes}
                          role="button"
                          tabIndex={0}
                          aria-label={`Ver detalle mensual de ${d.mes} ${activeYear}`}
                          onClick={() => {
                            setActive(activeYear, d.idx);
                            navigate("/");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setActive(activeYear, d.idx);
                              navigate("/");
                            }
                          }}
                          className="hover:bg-[#F2EFE9]/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                        >
                          <td className="py-2.5 font-bold text-foreground flex items-center gap-2">
                            <span>{d.mes}</span>
                            <div className="hidden sm:flex items-center gap-1 w-20 h-1.5 bg-[#F2EFE9] dark:bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1F7A5A] rounded-full"
                                style={{ width: `${Math.min(100, (d.Ingresos / maxMonthValue) * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 text-right text-[#1F7A5A] font-semibold tabular-nums">
                            {fmt(d.Ingresos)}
                          </td>
                          <td className="py-2.5 text-right text-[#C86446] font-semibold tabular-nums">
                            {fmt(d.Gastos)}
                          </td>
                          <td
                            className={`py-2.5 text-right font-bold tabular-nums ${
                              d.Neto >= 0 ? "text-[#1F7A5A]" : "text-[#C86446]"
                            }`}
                          >
                            {fmt(d.Neto)}
                          </td>
                          <td className="py-2.5 text-right text-[#6E6A63] dark:text-[#8E8D8A] tabular-nums">
                            {d.Tasa}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column (5 cols): YoY Comparatives & Debts Summary */}
              <div className="lg:col-span-5 space-y-6">
                {/* Year-over-Year Cards */}
                <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-5 space-y-4">
                  <h3 className="font-display-v2 text-base font-normal">
                    Comparativa Anual ({activeYear} vs {activeYear - 1})
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <YoyTile
                      label="Ingresos"
                      current={totals.income}
                      previous={totalsPrev.income}
                      positiveIsGood={true}
                    />
                    <YoyTile
                      label="Gastos"
                      current={totals.expense}
                      previous={totalsPrev.expense}
                      positiveIsGood={false}
                    />
                    <YoyTile
                      label="Ahorro"
                      current={totals.saving}
                      previous={totalsPrev.saving}
                      positiveIsGood={true}
                    />
                    <YoyTile
                      label="Neto"
                      current={totals.net}
                      previous={totalsPrev.net}
                      positiveIsGood={true}
                    />
                  </div>
                </div>

                {/* Net Trend Line Chart */}
                <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-5">
                  <h3 className="font-display-v2 text-base font-normal mb-3">
                    Curva de Superávit Mensual
                  </h3>
                  <SimpleAreaChart
                    data={monthly}
                    xKey="mes"
                    height={160}
                    series={[
                      {
                        key: "Neto",
                        label: "Neto",
                        color: "#2383E2",
                        type: "line",
                        formatter: (v) => fmt(Number(v)),
                      },
                    ]}
                  />
                </div>

                {/* Debts Snapshot */}
                {debtsYear.lent + debtsYear.collected + debtsYear.outstanding > 0 && (
                  <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-5 space-y-3">
                    <h3 className="font-display-v2 text-base font-normal">
                      Flujo de Préstamos y Deudas
                    </h3>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono-tabular">
                      <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-white/[0.02] border border-[#E4E0D8]/60 dark:border-white/5">
                        <p className="text-[10px] uppercase text-[#6E6A63] dark:text-[#8E8D8A]">Prestado</p>
                        <p className="text-xs font-bold mt-1 text-[#D9730D]">{fmt(debtsYear.lent)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-white/[0.02] border border-[#E4E0D8]/60 dark:border-white/5">
                        <p className="text-[10px] uppercase text-[#6E6A63] dark:text-[#8E8D8A]">Cobrado</p>
                        <p className="text-xs font-bold mt-1 text-[#1F7A5A]">{fmt(debtsYear.collected)}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF8F5] dark:bg-white/[0.02] border border-[#E4E0D8]/60 dark:border-white/5">
                        <p className="text-[10px] uppercase text-[#6E6A63] dark:text-[#8E8D8A]">Por Cobrar</p>
                        <p className="text-xs font-bold mt-1 text-[#C86446]">{fmt(debtsYear.outstanding)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORÍAS */}
        {tab === "categorias" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-5">
                <h3 className="font-display-v2 text-base font-normal mb-4">
                  Gasto por Categoría en {activeYear}
                </h3>
                {byCategory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    Sin gastos registrados en {activeYear}
                  </p>
                ) : (
                  <div className="space-y-3 font-mono-tabular">
                    {byCategory.map((c, i) => {
                      const pct = totals.expense > 0 ? (c.value / totals.expense) * 100 : 0;
                      const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                      return (
                        <div key={c.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-sans font-medium text-foreground flex items-center gap-2">
                              <span
                                className="size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              {c.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{fmt(c.value)}</span>
                              <span className="text-[#6E6A63] dark:text-[#8E8D8A] w-9 text-right">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-[#F2EFE9] dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-5">
                <h3 className="font-display-v2 text-base font-normal mb-4">
                  Top Conceptos Más Recurrentes
                </h3>
                {topConcepts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    Aún no hay conceptos variables registrados
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {topConcepts.map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between p-3 rounded-xl border border-[#E4E0D8]/60 dark:border-white/5 bg-[#FAF8F5] dark:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <IconDisplay icon={iconFor(c.sample)} className="size-8" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                            <p className="text-[11px] text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
                              {c.count} {c.count === 1 ? "vez" : "veces"}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono-tabular text-xs font-bold text-foreground">
                          {fmt(c.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MÉTODOS DE PAGO */}
        {tab === "metodos" && (
          <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-6">
            <h3 className="font-display-v2 text-base font-normal mb-4">
              Distribución por Método de Pago
            </h3>
            {byMethod.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">
                Sin métodos de pago registrados en {activeYear}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {byMethod.map((m) => {
                  const total = byMethod.reduce((s, x) => s + x.value, 0);
                  const pct = total > 0 ? (m.value / total) * 100 : 0;
                  return (
                    <div
                      key={m.key}
                      className="p-4 rounded-xl border border-[#E4E0D8]/70 dark:border-white/5 bg-[#FAF8F5] dark:bg-white/[0.02] space-y-2 font-mono-tabular"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-sans font-semibold flex items-center gap-1.5">
                          <span>{m.emoji}</span>
                          {m.name}
                        </span>
                        <span className="text-xs text-[#6E6A63] dark:text-[#8E8D8A]">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{fmt(m.value)}</p>
                      <div className="h-1.5 w-full bg-[#E4E0D8]/60 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2383E2] rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: METAS */}
        {tab === "metas" && (
          <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display-v2 text-base font-normal">
                Aportaciones y Conquistas en {activeYear}
              </h3>
              <button
                onClick={() => navigate("/metas")}
                className="text-xs font-semibold text-[#2383E2] hover:underline"
              >
                Ir a Metas →
              </button>
            </div>

            {goalsThisYear.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Target className="size-8 mx-auto text-[#6E6A63] dark:text-[#8E8D8A]" strokeWidth={1.5} />
                <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A]">Aún no has creado metas de ahorro</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {goalsThisYear.map(({ goal, contribsYear }) => {
                  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      aria-label={`Ver meta ${goal.name}`}
                      onClick={() => navigate("/metas")}
                      className="w-full text-left p-4 rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-[#FAF8F5] dark:bg-white/[0.02] cursor-pointer hover:border-[#2383E2]/50 active:scale-[0.98] transition space-y-3 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2383E2]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <IconDisplay icon={iconFor(goal)} className="size-7" />
                          <p className="font-semibold text-sm truncate text-foreground">{goal.name}</p>
                        </div>
                        <span className="font-mono-tabular text-xs font-bold text-[#1F7A5A]">
                          {Math.round(pct)}%
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-[#E4E0D8]/60 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1F7A5A] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono-tabular text-[#6E6A63] dark:text-[#8E8D8A] pt-1">
                        <span>Aportado en {activeYear}:</span>
                        <span className="font-bold text-foreground">{fmt(contribsYear)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function YoyBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const isPositive = diff >= 0;
  const pct =
    previous !== 0
      ? (diff / Math.abs(previous)) * 100
      : current !== 0
      ? (current > 0 ? 100 : -100)
      : 0;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono-tabular font-bold ${
        isPositive ? "bg-[#1F7A5A]/10 text-[#1F7A5A]" : "bg-[#C86446]/10 text-[#C86446]"
      }`}
    >
      {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {isPositive ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
}

function YoyTile({
  label,
  current,
  previous,
  positiveIsGood,
}: {
  label: string;
  current: number;
  previous: number;
  positiveIsGood: boolean;
}) {
  const diff = current - previous;
  const isGood = positiveIsGood ? diff >= 0 : diff <= 0;
  const tone = isGood ? "text-[#1F7A5A]" : "text-[#C86446]";
  const pct =
    previous !== 0
      ? (diff / Math.abs(previous)) * 100
      : current !== 0
      ? (current > 0 ? 100 : -100)
      : 0;

  return (
    <div className="p-3 rounded-xl border border-[#E4E0D8]/60 dark:border-white/5 bg-[#FAF8F5] dark:bg-white/[0.02] font-mono-tabular">
      <span className="text-[10px] uppercase font-bold text-[#6E6A63] dark:text-[#8E8D8A] block">
        {label}
      </span>
      <p className="text-sm font-bold text-foreground mt-1">{fmt(current)}</p>
      <p className={`text-[11px] font-semibold mt-0.5 ${tone}`}>
        {diff === 0 ? "—" : diff > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%{" "}
        <span className="text-[#6E6A63] dark:text-[#8E8D8A] font-normal">· {fmt2(previous)}</span>
      </p>
    </div>
  );
}

export default AnualV2;
