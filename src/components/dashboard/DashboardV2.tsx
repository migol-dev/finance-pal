import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import {
  fmt,
  monthlyAmount,
  MONTHS,
  isFixedActiveInMonth,
  iconFor,
  fmtDate,
  parseDateLocal,
  computeBalances,
  cashTotalFromDenominations,
} from "@/lib/finance";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Bell,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Wallet,
  Building2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { motion } from "@/lib/framer";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { IconDisplay } from "@/components/app/IconDisplay";
import { BrandLogo } from "@/components/app/BrandLogo";

export function DashboardV2() {
  const {
    fixedItems,
    transactions,
    accounts,
    goals,
    debts,
    activeYear,
    activeMonth,
    profile,
    ensureScheduledTransactions,
  } = useFinanceData();

  const { openQuickTx } = useQuickTxModal();
  const [hide, setHide] = useState(() => {
    try {
      return sessionStorage.getItem("fp_hide_balances") === "true";
    } catch {
      return false;
    }
  });

  const toggleHide = () => {
    setHide((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("fp_hide_balances", String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    try {
      ensureScheduledTransactions();
    } catch {
      /* ignore */
    }
  }, [ensureScheduledTransactions]);

  // Cálculos de flujo del mes
  const monthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let saving = 0;
    const today = new Date();
    const isViewingCurrentMonth = today.getFullYear() === activeYear && today.getMonth() === activeMonth;
    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const txYmd = (ds?: string) => {
      if (!ds) return "";
      const dd = parseDateLocal(ds);
      return ymd(dd);
    };

    for (const t of transactions) {
      const d = parseDateLocal(t.date);
      if (d.getMonth() !== activeMonth || d.getFullYear() !== activeYear) continue;
      const isInternalTransfer =
        t.type === "transfer" || (t.transferToAccountId && accounts.some((a) => a.id === t.transferToAccountId));
      if (isInternalTransfer) continue;
      if (t.type === "income") {
        if (t.category !== "Meta") income += t.amount;
        else saving -= t.amount;
      } else if (t.type === "saving") {
        saving += t.amount;
      } else {
        expense += t.amount;
      }
    }

    const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    for (const i of fixedItems) {
      if (!isFixedActiveInMonth(i, activeYear, activeMonth)) continue;
      const start = parseDateLocal(i.startDate);
      const end = parseDateLocal(i.endDate);

      if (i.frequency === "weekly" && typeof i.payWeekDay === "number") {
        const lastDay = isViewingCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;
        const startISO = ymd(start);
        const endISO = ymd(end);
        for (let d = 1; d <= lastDay; d++) {
          const dt = new Date(activeYear, activeMonth, d);
          const dtISO = ymd(dt);
          if (dtISO < startISO || dtISO > endISO) continue;
          if (dt.getDay() !== i.payWeekDay) continue;
          const occISO = dtISO;
          const already = transactions.some((t) => t.fixedId === i.id && txYmd(t.date) === occISO);
          if (already) continue;
          if (i.type === "income_fixed") income += i.amount;
          else if (i.type === "saving_fixed") saving += i.amount;
          else expense += i.amount;
        }
        continue;
      }

      if (i.frequency === "biweekly") {
        const baseDay = Math.min(Math.max(1, i.payDay ?? 1), daysInMonth);
        const firstHalfDay = baseDay <= 15 ? baseDay : Math.max(1, baseDay - 15);
        const secondHalfDay = Math.min(firstHalfDay + 15, daysInMonth);
        const biweeklyDays = Array.from(new Set([firstHalfDay, secondHalfDay])).sort((a, b) => a - b);
        const startISO = ymd(start);
        const endISO = ymd(end);
        for (const day of biweeklyDays) {
          if (isViewingCurrentMonth && day > today.getDate()) continue;
          const dt = new Date(activeYear, activeMonth, day);
          const dtISO = ymd(dt);
          if (dtISO < startISO || dtISO > endISO) continue;
          const already = transactions.some((t) => t.fixedId === i.id && txYmd(t.date) === dtISO);
          if (!already) {
            if (i.type === "income_fixed") income += i.amount;
            else if (i.type === "saving_fixed") saving += i.amount;
            else expense += i.amount;
          }
        }
        continue;
      }

      if (typeof i.payDay === "number") {
        const day = Math.min(i.payDay, daysInMonth);
        const dt = new Date(activeYear, activeMonth, day);
        const startISO = ymd(start);
        const endISO = ymd(end);
        const dtISO = ymd(dt);
        if (dtISO < startISO || dtISO > endISO) continue;
        if (isViewingCurrentMonth && day > today.getDate()) continue;
        const occISO = dtISO;
        const already = transactions.some((t) => {
          if (t.fixedId !== i.id) return false;
          if (txYmd(t.date) === occISO) return true;
          const td = parseDateLocal(t.date ?? "");
          return td.getFullYear() === activeYear && td.getMonth() === activeMonth;
        });
        if (!already) {
          if (i.type === "income_fixed") income += i.amount;
          else if (i.type === "saving_fixed") saving += i.amount;
          else expense += i.amount;
        }
        continue;
      }

      const hasTxForFixedThisMonth = transactions.some((t) => {
        const td = parseDateLocal(t.date ?? "");
        return t.fixedId === i.id && td.getFullYear() === activeYear && td.getMonth() === activeMonth;
      });
      if (hasTxForFixedThisMonth) continue;
      const m = monthlyAmount(i);
      if (i.type === "income_fixed") income += m;
      else if (i.type === "saving_fixed") saving += m;
      else expense += m;
    }

    for (const d of debts) {
      const dd = parseDateLocal(d.date);
      if (dd.getFullYear() === activeYear && dd.getMonth() === activeMonth) {
        expense += d.amount;
      }
      for (const p of d.payments) {
        const pd = parseDateLocal(p.date);
        if (pd.getFullYear() === activeYear && pd.getMonth() === activeMonth) {
          income += p.amount;
        }
      }
    }
    const net = income - expense - saving;
    const savingRate = income > 0 ? Math.max(0, (saving / income) * 100) : 0;

    const endOfMonth = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59);
    let cumulativeNet = 0;

    for (const a of accounts) {
      cumulativeNet += a.initialBalance ?? 0;
    }

    for (const t of transactions) {
      if (parseDateLocal(t.date) <= endOfMonth) {
        const isInternalTransfer =
          t.type === "transfer" || (t.transferToAccountId && accounts.some((a) => a.id === t.transferToAccountId));
        if (isInternalTransfer) continue;
        if (t.type === "income") cumulativeNet += t.amount;
        else if (t.type === "saving") cumulativeNet -= t.amount;
        else cumulativeNet -= t.amount;
      }
    }

    for (const d of debts) {
      if (parseDateLocal(d.date) <= endOfMonth) {
        cumulativeNet -= d.amount;
      }
      for (const p of d.payments) {
        if (parseDateLocal(p.date) <= endOfMonth) {
          cumulativeNet += p.amount;
        }
      }
    }

    if (accounts.length > 0) {
      const computed = computeBalances(accounts, transactions, debts, endOfMonth);
      cumulativeNet = Object.values(computed).reduce((acc, b) => acc + b, 0);
    }

    return {
      income: Math.max(0, income),
      expense: Math.max(0, expense),
      saving: Math.max(0, saving),
      net,
      cumulativeNet,
      savingRate,
    };
  }, [fixedItems, transactions, debts, accounts, activeMonth, activeYear]);

  // Desglose de Activos vs Pasivos (Warm Editorial Wealth)
  const wealthBreakdown = useMemo(() => {
    const endOfMonth = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59);
    const balances = computeBalances(accounts, transactions, debts, endOfMonth);

    let cash = 0;
    let bank = 0;
    let liabilities = 0;

    for (const a of accounts) {
      const bal = balances[a.id] ?? (a.initialBalance ?? 0);
      if (bal < 0) {
        liabilities += Math.abs(bal);
      } else {
        if (a.type === "cash") {
          if (a.denominations && a.denominations.length > 0) {
            cash += cashTotalFromDenominations(a.denominations);
          } else {
            cash += bal;
          }
        } else {
          bank += bal;
        }
      }
    }

    const liquidAssets = cash + bank;
    const goalsSaved = goals.reduce((sum, g) => sum + (g.saved || 0), 0);

    // Cuentas por cobrar (préstamos otorgados vigentes al cierre del periodo)
    const receivables = debts.reduce((sum, d) => {
      const debtDate = parseDateLocal(d.date);
      if (debtDate > endOfMonth) return sum;
      const paid = (d.payments || []).reduce((pSum, p) => {
        const payDate = parseDateLocal(p.date);
        return payDate <= endOfMonth ? pSum + p.amount : pSum;
      }, 0);
      return sum + Math.max(0, d.amount - paid);
    }, 0);

    const totalAssets = Math.max(0, liquidAssets + receivables);
    const netWorth = totalAssets - liabilities;

    // Variación mensual del patrimonio
    const monthlyNetFlow = monthStats.net;
    const prevNet = netWorth - monthlyNetFlow;
    const percentChange =
      prevNet !== 0 ? (monthlyNetFlow / Math.abs(prevNet)) * 100 : monthlyNetFlow > 0 ? 100 : monthlyNetFlow < 0 ? -100 : 0;

    return {
      cash,
      bank,
      liquidAssets,
      goalsSaved,
      receivables,
      totalAssets,
      liabilities,
      netWorth,
      monthlyNetFlow,
      percentChange,
    };
  }, [accounts, transactions, debts, goals, monthStats.net, activeYear, activeMonth]);

  // Próximos compromisos / pagos fijos del mes
  const upcoming = useMemo(() => {
    const today = new Date();
    const todayWeekday = today.getDay();
    const isCurrentMonth = today.getFullYear() === activeYear && today.getMonth() === activeMonth;
    if (!isCurrentMonth) return [];

    return fixedItems
      .filter(
        (i) =>
          isFixedActiveInMonth(i, activeYear, activeMonth) &&
          (typeof i.payDay === "number" || typeof i.payWeekDay === "number") &&
          i.type !== "income_fixed"
      )
      .map((i) => {
        let daysLeft = 999;
        if (i.frequency === "weekly" && typeof i.payWeekDay === "number") {
          daysLeft = (i.payWeekDay - todayWeekday + 7) % 7;
        } else if (i.frequency === "biweekly") {
          const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
          const baseDay = Math.min(Math.max(1, i.payDay ?? 1), daysInMonth);
          const firstHalfDay = baseDay <= 15 ? baseDay : Math.max(1, baseDay - 15);
          const secondHalfDay = Math.min(firstHalfDay + 15, daysInMonth);
          const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
          const nextDayInMonth = [firstHalfDay, secondHalfDay].find((d) => d >= today.getDate());
          const target =
            nextDayInMonth !== undefined
              ? new Date(activeYear, activeMonth, nextDayInMonth)
              : new Date(activeYear, activeMonth + 1, firstHalfDay);
          const targetUTC = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
          daysLeft = Math.max(0, Math.round((targetUTC - todayUTC) / 86400000));
        } else if (typeof i.payDay === "number") {
          const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
          const targetDay = Math.min(i.payDay, daysInMonth);
          const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
          let target = new Date(activeYear, activeMonth, targetDay);
          let targetUTC = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
          if (targetUTC < todayUTC) {
            target = new Date(activeYear, activeMonth + 1, targetDay);
            targetUTC = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
          }
          daysLeft = Math.max(0, Math.round((targetUTC - todayUTC) / 86400000));
        } else if (typeof i.payWeekDay === "number") {
          daysLeft = (i.payWeekDay - todayWeekday + 7) % 7;
        }
        return { ...i, daysLeft };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4);
  }, [fixedItems, activeYear, activeMonth]);

  // Movimientos recientes del mes
  const recent = useMemo(() => {
    return transactions
      .filter((t) => {
        const d = parseDateLocal(t.date);
        return d.getMonth() === activeMonth && d.getFullYear() === activeYear;
      })
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime())
      .slice(0, 7);
  }, [transactions, activeMonth, activeYear]);

  const mainGoal = goals.find((g) => g.pinned) ?? goals[0];
  const goalProgress = mainGoal
    ? mainGoal.target > 0
      ? Math.min(100, Math.round((mainGoal.saved / mainGoal.target) * 100))
      : 0
    : 0;

  const mask = (s: string) => (hide ? "••••••" : s);
  const greet = profile.name ? `Hola, ${profile.name.split(" ")[0]}` : "Bienvenido";
  const trend = wealthBreakdown.monthlyNetFlow > 0 ? "up" : wealthBreakdown.monthlyNetFlow < 0 ? "down" : "flat";
  const formattedPercent =
    Math.abs(wealthBreakdown.percentChange) < 0.05 ? "0.0" : Math.abs(wealthBreakdown.percentChange).toFixed(1);

  return (
    <div className="w-full space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      {/* ── Encabezado Editorial Superior ── */}
      <header className="px-5 lg:px-0 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] dark:border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <BrandLogo size="md" withText={false} animated />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display-v2 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {greet}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono-tabular font-semibold bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="size-3" strokeWidth={1.5} />
                v2
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Panorama patrimonial y flujo financiero de {MONTHS[activeMonth]} {activeYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <MonthSwitcher />
          <button
            onClick={toggleHide}
            aria-label={hide ? "Mostrar saldos" : "Ocultar saldos"}
            title={hide ? "Mostrar saldos" : "Ocultar saldos"}
            className="size-9 rounded-lg border border-[#E4E0D8] dark:border-white/10 bg-card hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-[0.96]"
          >
            {hide ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
          </button>
          <Link
            to="/anual"
            aria-label="Resumen anual"
            title="Ir al Resumen Anual"
            className="size-9 rounded-lg border border-[#E4E0D8] dark:border-white/10 bg-card hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-[0.96]"
          >
            <BarChart3 className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      </header>

      {/* ── Composición Asimétrica de 12 Columnas ── */}
      <div className="px-5 lg:px-0 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ══════════════════════════════════════════════════════════════
            COLUMNA PRINCIPAL (7 cols en PC) — Patrimonio, Flujo & Movimientos
           ══════════════════════════════════════════════════════════════ */}
        <section className="lg:col-span-7 space-y-8 min-w-0">
          {/* Escenario de Patrimonio Neto (Warm Editorial Wealth) */}
          <div className="relative pt-2">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <p className="font-display-v2 text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                  Patrimonio Neto Total
                </p>
                <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
                  <span className="font-mono-tabular text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                    {mask(fmt(wealthBreakdown.netWorth))}
                  </span>
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono-tabular font-bold border ${
                      trend === "up"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : trend === "down"
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {trend === "up" ? (
                      <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
                    ) : trend === "down" ? (
                      <ArrowDownRight className="size-3.5" strokeWidth={1.75} />
                    ) : (
                      <Minus className="size-3.5" strokeWidth={1.75} />
                    )}
                    <span>
                      {trend === "up" ? "+" : ""}
                      {mask(fmt(wealthBreakdown.monthlyNetFlow))}
                    </span>
                    <span className="opacity-75">
                      ({trend === "up" ? "+" : ""}
                      {formattedPercent}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">
                  Corte del periodo
                </span>
                <span className="text-xs font-mono-tabular text-foreground/80 font-medium">
                  {MONTHS[activeMonth]} {activeYear}
                </span>
              </div>
            </div>

            {/* Barra de Proporción Activos vs Pasivos (De-boxed) */}
            <div className="mt-6 pt-5 border-t border-[#E4E0D8] dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono-tabular">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground font-sans">Activos Totales:</span>
                  <span className="font-semibold text-foreground">{mask(fmt(wealthBreakdown.totalAssets))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground font-sans">Pasivos / Obligaciones:</span>
                  <span className="font-semibold text-foreground">{mask(fmt(wealthBreakdown.liabilities))}</span>
                </div>
              </div>

              {/* Barra hairline de activos vs pasivos */}
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{
                    width: `${
                      wealthBreakdown.totalAssets + wealthBreakdown.liabilities > 0
                        ? (wealthBreakdown.totalAssets /
                            (wealthBreakdown.totalAssets + wealthBreakdown.liabilities)) *
                          100
                        : 100
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-destructive transition-all duration-500"
                  style={{
                    width: `${
                      wealthBreakdown.totalAssets + wealthBreakdown.liabilities > 0
                        ? (wealthBreakdown.liabilities /
                            (wealthBreakdown.totalAssets + wealthBreakdown.liabilities)) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 flex-wrap gap-2">
                <span>
                  Disponibles en cuentas y efectivo:{" "}
                  <strong className="text-foreground font-mono-tabular">
                    {mask(fmt(wealthBreakdown.liquidAssets))}
                  </strong>
                </span>
                {wealthBreakdown.receivables > 0 && (
                  <span>
                    Por cobrar:{" "}
                    <strong className="text-foreground font-mono-tabular">
                      {mask(fmt(wealthBreakdown.receivables))}
                    </strong>
                  </span>
                )}
                {wealthBreakdown.goalsSaved > 0 && (
                  <span>
                    En metas de ahorro:{" "}
                    <strong className="text-foreground font-mono-tabular">
                      {mask(fmt(wealthBreakdown.goalsSaved))}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pulso Mensual de Ingresos vs Gastos (60% Canvas abierto) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display-v2 text-base font-bold text-foreground">
                Flujo del Mes
              </h2>
              <span className="text-xs font-mono-tabular text-muted-foreground">
                Tasa de ahorro:{" "}
                <strong className="text-primary font-bold">
                  {monthStats.savingRate.toFixed(1)}%
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-1">
              <div className="border-l-2 border-emerald-500/80 pl-3 py-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <TrendingUp className="size-3.5 text-emerald-500" strokeWidth={1.5} />
                  <span>Ingresos</span>
                </div>
                <p className="font-mono-tabular font-bold text-sm sm:text-base text-foreground mt-0.5 truncate">
                  {mask(fmt(monthStats.income))}
                </p>
              </div>

              <div className="border-l-2 border-destructive/80 pl-3 py-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <TrendingDown className="size-3.5 text-destructive" strokeWidth={1.5} />
                  <span>Gastos</span>
                </div>
                <p className="font-mono-tabular font-bold text-sm sm:text-base text-foreground mt-0.5 truncate">
                  {mask(fmt(monthStats.expense))}
                </p>
              </div>

              <div className="border-l-2 border-secondary/80 pl-3 py-1">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <PiggyBank className="size-3.5 text-secondary" strokeWidth={1.5} />
                  <span>Ahorro</span>
                </div>
                <p className="font-mono-tabular font-bold text-sm sm:text-base text-foreground mt-0.5 truncate">
                  {mask(fmt(monthStats.saving))}
                </p>
              </div>
            </div>

            {/* Barra de progreso de ahorro mensual */}
            <div className="space-y-1.5 pt-2">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, monthStats.savingRate)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Movimientos Recientes con estilo editorial hairline */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display-v2 text-base font-bold text-foreground">
                Movimientos Recientes
              </h2>
              <Link
                to="/movimientos"
                className="text-xs font-semibold text-primary hover:text-primary/80 transition inline-flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="size-3.5" strokeWidth={1.5} />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-[#E4E0D8] dark:border-white/10 rounded-xl space-y-2">
                <p className="text-3xl" aria-hidden="true">
                  🕊️
                </p>
                <p className="text-sm font-semibold text-foreground">
                  Sin transacciones en este mes
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Registra tu primer movimiento para comenzar el seguimiento del periodo.
                </p>
                <button
                  onClick={() => openQuickTx("expense")}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold transition hover:opacity-90 active:scale-95 inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="size-3.5" strokeWidth={1.75} />
                  Nuevo Movimiento
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E4E0D8] dark:divide-white/10 border-t border-b border-[#E4E0D8] dark:border-white/10">
                {recent.map((t) => {
                  const isIncome = t.type === "income";
                  const isTransfer = t.type === "transfer";
                  const isSaving = t.type === "saving";

                  return (
                    <div
                      key={t.id}
                      className="py-3 flex items-center gap-3.5 hover:bg-muted/30 px-1 transition-colors rounded-sm"
                    >
                      <IconDisplay icon={iconFor(t)} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate text-foreground">
                          {t.concept}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {fmtDate(t.date)} {t.category ? `• ${t.category}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`font-mono-tabular font-bold text-sm ${
                            isIncome
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isSaving
                              ? "text-secondary"
                              : isTransfer
                              ? "text-primary"
                              : "text-destructive"
                          }`}
                        >
                          {isIncome ? "+" : isTransfer ? "⇄" : "-"}
                          {mask(fmt(t.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            COLUMNA LATERAL (5 cols en PC) — Acciones, Metas, Pagos & Liquidez
           ══════════════════════════════════════════════════════════════ */}
        <aside className="lg:col-span-5 space-y-6 min-w-0">
          {/* Botones de Acción Rápida (Micro-física táctil + useQuickTxModal) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => openQuickTx("expense")}
              aria-label="Registrar gasto rápido"
              className="group p-3.5 rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-card hover:bg-muted/40 transition-all duration-200 active:scale-[0.98] text-left flex items-center gap-3"
            >
              <div className="size-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Plus className="size-4.5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-display-v2 text-sm font-bold text-foreground leading-tight">
                  Gasto
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Registrar egreso
                </p>
              </div>
            </button>

            <button
              onClick={() => openQuickTx("income")}
              aria-label="Registrar ingreso rápido"
              className="group p-3.5 rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-card hover:bg-muted/40 transition-all duration-200 active:scale-[0.98] text-left flex items-center gap-3"
            >
              <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Plus className="size-4.5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="font-display-v2 text-sm font-bold text-foreground leading-tight">
                  Ingreso
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Registrar entrada
                </p>
              </div>
            </button>
          </div>

          {/* Meta Principal de Ahorro */}
          {mainGoal && (
            <div className="border border-[#E4E0D8] dark:border-white/10 rounded-xl p-4 bg-card/60 backdrop-blur-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <IconDisplay icon={iconFor(mainGoal)} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                      Meta Prioritaria
                    </p>
                    <h3 className="font-display-v2 text-sm font-bold truncate text-foreground">
                      {mainGoal.name}
                    </h3>
                  </div>
                </div>
                <Link
                  to="/metas"
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  Metas →
                </Link>
              </div>

              <div className="flex items-baseline justify-between text-xs font-mono-tabular">
                <span className="text-foreground font-semibold">
                  {mask(fmt(mainGoal.saved))}
                </span>
                <span className="text-muted-foreground">
                  de {mask(fmt(mainGoal.target))}
                </span>
              </div>

              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-primary rounded-full"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                <span className="font-mono-tabular font-medium">{goalProgress}% completado</span>
                <span>
                  Faltan:{" "}
                  <strong className="text-foreground font-mono-tabular">
                    {mask(fmt(Math.max(0, mainGoal.target - mainGoal.saved)))}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Próximos Pagos Fijos (Hairline Agenda) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="size-4 text-warning" strokeWidth={1.5} />
                <h3 className="font-display-v2 text-sm font-bold text-foreground">
                  Próximos Pagos Fijos
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono-tabular">
                {upcoming.length} pendientes
              </span>
            </div>

            {upcoming.length === 0 ? (
              <div className="p-4 border border-[#E4E0D8] dark:border-white/10 rounded-xl text-center space-y-1">
                <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  Al día en este mes
                </p>
                <p className="text-[11px] text-muted-foreground">
                  No hay pagos fijos programados restantes para {MONTHS[activeMonth]}.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E4E0D8] dark:divide-white/10 border-t border-b border-[#E4E0D8] dark:border-white/10">
                {upcoming.map((u) => (
                  <div key={u.id} className="py-2.5 flex items-center gap-3">
                    <IconDisplay icon={iconFor(u)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate text-foreground">
                        {u.concept}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {u.frequency === "weekly" && typeof u.payWeekDay === "number"
                          ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][u.payWeekDay]
                          : u.payDay
                          ? `Día ${u.payDay}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono-tabular font-bold text-xs text-foreground">
                        {mask(fmt(u.amount))}
                      </p>
                      <span className="text-[10px] font-mono-tabular font-semibold text-warning">
                        {u.daysLeft === 0 ? "Hoy" : `en ${u.daysLeft}d`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Distribución de Liquidez (Efectivo vs Cuentas Bancarias) */}
          <div className="border border-[#E4E0D8] dark:border-white/10 rounded-xl p-4 space-y-3 bg-card/40">
            <h3 className="font-display-v2 text-xs uppercase tracking-wider font-bold text-muted-foreground">
              Distribución de Liquidez
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Wallet className="size-3.5 text-secondary" strokeWidth={1.5} />
                    Efectivo
                  </span>
                  <span className="font-mono-tabular font-bold text-foreground">
                    {mask(fmt(wealthBreakdown.cash))}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-300"
                    style={{
                      width: `${
                        wealthBreakdown.cash + wealthBreakdown.bank > 0
                          ? (wealthBreakdown.cash /
                              (wealthBreakdown.cash + wealthBreakdown.bank)) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Building2 className="size-3.5 text-primary" strokeWidth={1.5} />
                    Cuentas Bancarias
                  </span>
                  <span className="font-mono-tabular font-bold text-foreground">
                    {mask(fmt(wealthBreakdown.bank))}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${
                        wealthBreakdown.cash + wealthBreakdown.bank > 0
                          ? (wealthBreakdown.bank /
                              (wealthBreakdown.cash + wealthBreakdown.bank)) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
