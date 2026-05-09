import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, monthlyAmount, MONTHS, isFixedActiveInMonth, iconFor, fmtDate, parseDateLocal } from "@/lib/finance";
import { Eye, EyeOff, TrendingUp, TrendingDown, PiggyBank, Plus, Bell, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "@/lib/framer";
const appIcon = "/icon-512.webp";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { IconDisplay } from "@/components/app/IconDisplay";

export default function Dashboard() {
  const fixedItems = useFinance((s) => s.fixedItems);
  const transactions = useFinance((s) => s.transactions);
  const goals = useFinance((s) => s.goals);
  const debts = useFinance((s) => s.debts);
  const activeYear = useFinance((s) => s.activeYear);
  const activeMonth = useFinance((s) => s.activeMonth);
  const ensureScheduledTransactions = useFinance((s) => s.ensureScheduledTransactions);

  useEffect(() => {
    try { ensureScheduledTransactions(); } catch (e) { /* ignore */ }
  }, [ensureScheduledTransactions]);
  const [hide, setHide] = useState(false);

  const monthStats = useMemo(() => {
    let income = 0, expense = 0, saving = 0;
    const today = new Date();
    const isViewingCurrentMonth = today.getFullYear() === activeYear && today.getMonth() === activeMonth;
    const pad = (n: number) => String(n).padStart(2, "0");
    const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const txYmd = (ds?: string) => {
      if (!ds) return "";
      const dd = parseDateLocal(ds);
      return ymd(dd);
    };

    // 1) Count actual transactions first (these are authoritative)
    for (const t of transactions) {
      const d = parseDateLocal(t.date);
      if (d.getMonth() !== activeMonth || d.getFullYear() !== activeYear) continue;

      if (t.type === "income") {
        // Only count as income if it's NOT a goal withdrawal (category "Meta")
        if (t.category !== "Meta") income += t.amount;
        else {
          // If it IS a goal withdrawal, it effectively reduces the "saving" of this month
          // or just acts as neutral capital movement.
          // To make the Net and Saving Rate accurate:
          saving -= t.amount;
        }
      }
      else if (t.type === "saving") saving += t.amount;
      else expense += t.amount;
    }

    

    // 2) Add fixed items only for occurrences that DO NOT have a recorded transaction
    const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
    for (const i of fixedItems) {
      if (!isFixedActiveInMonth(i, activeYear, activeMonth)) continue;
      const start = parseDateLocal(i.startDate);
      const end = parseDateLocal(i.endDate);

      // Weekly with explicit weekday: check each occurrence date and only add when there's no tx
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

      // Monthly/periodic with selected payDay: consider that single occurrence
      if (typeof i.payDay === "number") {
        const day = Math.min(i.payDay, daysInMonth);
        const dt = new Date(activeYear, activeMonth, day);
        const startISO = ymd(start);
        const endISO = ymd(end);
        const dtISO = ymd(dt);
        if (dtISO < startISO || dtISO > endISO) continue;
        if (isViewingCurrentMonth && i.payDay > today.getDate()) continue; // hasn't happened yet
        const occISO = dtISO;
        const already = transactions.some((t) => t.fixedId === i.id && txYmd(t.date) === occISO);
        if (!already) {
          if (i.type === "income_fixed") income += i.amount;
          else if (i.type === "saving_fixed") saving += i.amount;
          else expense += i.amount;
        }
        continue;
      }

      // No specific day selected: treat as monthly-equivalent, but skip if any tx already recorded for this fixed item in the month
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
    // Debts owed to you: prestar dinero = sale capital (gasto); abono recibido = entra capital (ingreso)
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
    const savingRate = income > 0 ? (saving / income) * 100 : 0;
    return { income, expense, saving, net, savingRate };
  }, [fixedItems, transactions, debts, activeMonth, activeYear]);

  const today = new Date();
  const todayDate = today.getDate();
  const todayWeekday = today.getDay();
  const isCurrentMonth = today.getFullYear() === activeYear && today.getMonth() === activeMonth;

  const upcoming = useMemo(() => {
    if (!isCurrentMonth) return [];
    return fixedItems
      .filter((i) => isFixedActiveInMonth(i, activeYear, activeMonth) && (typeof i.payDay === "number" || typeof i.payWeekDay === "number") && i.type !== "income_fixed")
      .map((i) => {
        let daysLeft = 999;
        if (typeof i.payDay === "number") {
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
          const todayWeek = todayWeekday;
          daysLeft = (i.payWeekDay - todayWeek + 7) % 7;
        }
        return { ...i, daysLeft } as any;
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3);
  }, [fixedItems, activeYear, activeMonth, isCurrentMonth, todayDate, todayWeekday]);

  const recent = useMemo(() => {
    return transactions
      .filter((t) => { const d = parseDateLocal(t.date); return d.getMonth() === activeMonth && d.getFullYear() === activeYear; })
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime())
      .slice(0, 4);
  }, [transactions, activeMonth, activeYear]);

  const mainGoal = goals.find((g) => g.pinned) ?? goals[0];
  const progressPercent = mainGoal ? (mainGoal.target > 0 ? Math.round((mainGoal.saved / mainGoal.target) * 100) : 0) : 0;
  const mask = (s: string) => hide ? "•••••" : s;
  const hasAnyData = fixedItems.length > 0 || transactions.length > 0;

  return (
    <div>
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="" width={40} height={40} className="size-10 rounded-2xl shadow-glow" />
          <div>
            <p className="text-xs text-muted-foreground">Hola 👋</p>
            <p className="text-sm font-semibold">{MONTHS[activeMonth]} {activeYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/anual" aria-label="Resumen anual" className="size-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition">
            <BarChart3 className="size-4" />
          </Link>
          <button onClick={() => setHide((h) => !h)} className="size-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition">
            {hide ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </header>

      <div className="px-5 mt-2 flex justify-center">
        <MonthSwitcher />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-3 rounded-3xl gradient-primary text-primary-foreground p-6 shadow-glow relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-primary-glow/40 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 size-32 rounded-full bg-secondary/40 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest opacity-80 font-semibold">Neto del mes</p>
          <p className="text-5xl font-extrabold tracking-tight mt-1">{mask(fmt(monthStats.net))}</p>
          <div className="grid grid-cols-3 gap-3 mt-6">
            <MiniStat icon={<TrendingUp className="size-3.5" />} label="Ingresos" value={mask(fmt(monthStats.income))} />
            <MiniStat icon={<TrendingDown className="size-3.5" />} label="Gastos" value={mask(fmt(monthStats.expense))} />
            <MiniStat icon={<PiggyBank className="size-3.5" />} label="Ahorro" value={mask(fmt(monthStats.saving))} />
          </div>
        </div>
      </motion.section>

      <section className="px-5 mt-5">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Tasa de ahorro</span>
            <span className="text-sm font-bold text-success">{monthStats.savingRate.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, monthStats.savingRate)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full gradient-success rounded-full"
            />
          </div>
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="px-5 mt-5 grid grid-cols-2 gap-3"
      >
        <Link to="/movimientos?new=expense" className="rounded-2xl bg-card border border-border p-4 shadow-soft active:scale-95 transition flex items-center gap-3">
          <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"><Plus className="size-5" /></div>
          <div><p className="text-sm font-bold">Gasto</p><p className="text-[11px] text-muted-foreground">Registrar</p></div>
        </Link>
        <Link to="/movimientos?new=income" className="rounded-2xl bg-card border border-border p-4 shadow-soft active:scale-95 transition flex items-center gap-3">
          <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center"><Plus className="size-5" /></div>
          <div><p className="text-sm font-bold">Ingreso</p><p className="text-[11px] text-muted-foreground">Registrar</p></div>
        </Link>
      </motion.section>

      {!hasAnyData && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-5 mt-6"
        >
          <div className="rounded-3xl gradient-mesh border border-border p-6 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-bold text-base">Bienvenido a Finance Pal</p>
            <p className="text-xs text-muted-foreground mt-1">Empieza creando tus ingresos, gastos fijos y metas en <Link to="/ajustes" className="text-primary font-semibold">Ajustes</Link>, o registra un movimiento ahora.</p>
          </div>
        </motion.section>
      )}

      {mainGoal && (
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="px-5 mt-6"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold">Meta principal</h2>
            <Link to="/metas" className="text-xs font-semibold text-primary">Ver todas →</Link>
          </div>
          <Link to="/metas" className={`block rounded-3xl p-5 text-primary-foreground shadow-pop ${mainGoal.color} relative overflow-hidden`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1"><IconDisplay icon={iconFor(mainGoal)} size="lg" className="bg-white/20" /></div>
                <p className="font-bold text-lg mt-1">{mainGoal.name}</p>
                <p className="text-xs opacity-90">{mask(fmt(mainGoal.saved))} de {mask(fmt(mainGoal.target))}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold">{progressPercent}%</p>
                <p className="text-[10px] opacity-80 uppercase tracking-wide">completado</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/25 overflow-hidden mt-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progressPercent)}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </Link>
        </motion.section>
      )}

      {upcoming.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-5 mt-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <Bell className="size-4 text-warning" />
            <h2 className="text-base font-bold">Próximos pagos</h2>
          </div>
          <div className="space-y-2">
            {upcoming.map((u) => (
              <div key={u.id} className="rounded-2xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
                <IconDisplay icon={iconFor(u)} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.concept}</p>
                  <p className="text-xs text-muted-foreground">{u.payDay ? `Día ${u.payDay} del mes` : (typeof u.payWeekDay === "number" ? ["Dom","Lun","Mar","Mie","Jue","Vie","Sáb"][u.payWeekDay] : "")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{mask(fmt(u.amount))}</p>
                  <p className="text-[10px] text-warning font-semibold">en {u.daysLeft}d</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="px-5 mt-6 mb-24"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold">Movimientos recientes</h2>
          <Link to="/movimientos" className="text-xs font-semibold text-primary">Ver todos →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Sin movimientos en {MONTHS[activeMonth]}. Registra tu primer gasto o ingreso ✨</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((t) => (
              <div key={t.id} className="rounded-2xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
                <IconDisplay icon={iconFor(t)} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{t.concept}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(t.date)}</p>
                </div>
                <p className={`font-bold text-sm ${t.type === "income" ? "text-success" : t.type === "saving" ? "text-secondary" : "text-destructive"}`}>
                  {t.type === "income" ? "+" : "-"}{mask(fmt(t.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}

import { memo } from "react";

const MiniStat = memo(function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-2.5">
      <div className="flex items-center gap-1 opacity-90">{icon}<span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span></div>
      <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
});
