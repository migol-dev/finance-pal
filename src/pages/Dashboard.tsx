import { useMemo, useState, useEffect, memo, type ReactNode } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, monthlyAmount, MONTHS, isFixedActiveInMonth, iconFor, fmtDate, parseDateLocal, computeBalances, cashTotalFromDenominations } from "@/lib/finance";
import { Eye, EyeOff, TrendingUp, TrendingDown, PiggyBank, Plus, Bell, BarChart3, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "@/lib/framer";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { IconDisplay } from "@/components/app/IconDisplay";

export default function Dashboard() {
  const fixedItems = useFinance((s) => s.fixedItems);
  const transactions = useFinance((s) => s.transactions);
  const accounts = useFinance((s) => s.accounts);
  const goals = useFinance((s) => s.goals);
  const debts = useFinance((s) => s.debts);
  const activeYear = useFinance((s) => s.activeYear);
  const activeMonth = useFinance((s) => s.activeMonth);
  const profile = useFinance((s) => s.profile);
  const ensureScheduledTransactions = useFinance((s) => s.ensureScheduledTransactions);

  useEffect(() => {
    try { ensureScheduledTransactions(); } catch (e) { }
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

    for (const t of transactions) {
      const d = parseDateLocal(t.date);
      if (d.getMonth() !== activeMonth || d.getFullYear() !== activeYear) continue;
      const isInternalTransfer = t.type === "transfer" || (t.transferToAccountId && accounts.some((a) => a.id === t.transferToAccountId));
      if (isInternalTransfer) continue;
      if (t.type === "income") {
        if (t.category !== "Meta") income += t.amount;
        else saving -= t.amount;
      }
      else if (t.type === "saving") saving += t.amount;
      else expense += t.amount;
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

      if (typeof i.payDay === "number") {
        const day = Math.min(i.payDay, daysInMonth);
        const dt = new Date(activeYear, activeMonth, day);
        const startISO = ymd(start);
        const endISO = ymd(end);
        const dtISO = ymd(dt);
        if (dtISO < startISO || dtISO > endISO) continue;
        if (isViewingCurrentMonth && i.payDay > today.getDate()) continue;
        const occISO = dtISO;
        const already = transactions.some((t) => t.fixedId === i.id && txYmd(t.date) === occISO);
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

    for (const t of transactions) {
      if (parseDateLocal(t.date) <= endOfMonth) {
        const isInternalTransfer = t.type === "transfer" || (t.transferToAccountId && accounts.some((a) => a.id === t.transferToAccountId));
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

    return {
      income: Math.max(0, income),
      expense: Math.max(0, expense),
      saving: Math.max(0, saving),
      net,
      cumulativeNet,
      savingRate
    };
  }, [fixedItems, transactions, debts, accounts, activeMonth, activeYear]);

  const balances = useMemo(() => {
    const endOfMonth = new Date(activeYear, activeMonth + 1, 0, 23, 59, 59);
    return computeBalances(accounts, transactions, debts, endOfMonth);
  }, [accounts, transactions, debts, activeMonth, activeYear]);
  const cashBankBreakdown = useMemo(() => {
    let cash = 0, bank = 0;
    for (const a of accounts) {
      const bal = balances[a.id] ?? (a.initialBalance ?? 0);
      if (a.type === "cash") {
        if (a.denominations && a.denominations.length > 0) cash += cashTotalFromDenominations(a.denominations);
        else cash += bal;
      } else {
        bank += bal;
      }
    }
    return { cash, bank };
  }, [accounts, balances]);

  const upcoming = useMemo(() => {
    const today = new Date();
    const todayWeekday = today.getDay();
    const isCurrentMonth = today.getFullYear() === activeYear && today.getMonth() === activeMonth;
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
          daysLeft = (i.payWeekDay - todayWeekday + 7) % 7;
        }
        return { ...i, daysLeft } as any;
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3);
  }, [fixedItems, activeYear, activeMonth]);

  const recent = useMemo(() => {
    return transactions
      .filter((t) => { const d = parseDateLocal(t.date); return d.getMonth() === activeMonth && d.getFullYear() === activeYear; })
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime())
      .slice(0, 8);
  }, [transactions, activeMonth, activeYear]);

  const mainGoal = goals.find((g) => g.pinned) ?? goals[0];
  const progressPercent = mainGoal ? (mainGoal.target > 0 ? Math.round((mainGoal.saved / mainGoal.target) * 100) : 0) : 0;
  const mask = (s: string) => hide ? "•••••" : s;
  const hasAnyData = fixedItems.length > 0 || transactions.length > 0;
  const greet = profile.name ? `Hola, ${profile.name.split(" ")[0]}` : "Bienvenido";

  return (
    <div>
      <header className="px-5 lg:px-6 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl gradient-primary shadow-glow flex items-center justify-center">
            <Wallet className="size-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{greet}</p>
            <p className="text-xs text-muted-foreground">{MONTHS[activeMonth]} {activeYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/anual" aria-label="Resumen anual" className="size-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition">
            <BarChart3 className="size-4" />
          </Link>
          <button onClick={() => setHide((h) => !h)} className="size-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition">
            {hide ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </header>

      <div className="px-5 mt-2 flex justify-center">
        <MonthSwitcher />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mx-5 mt-3 rounded-2xl gradient-primary text-primary-foreground p-5 shadow-glow relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-6 size-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Neto acumulado</p>
          <p className="text-4xl font-extrabold tracking-tight mt-1">{mask(fmt(monthStats.cumulativeNet))}</p>
          <div className="grid grid-cols-3 gap-2 mt-5">
            <MiniStat icon={<TrendingUp className="size-3.5" />} label="Ingresos" value={mask(fmt(monthStats.income))} />
            <MiniStat icon={<TrendingDown className="size-3.5" />} label="Gastos" value={mask(fmt(monthStats.expense))} />
            <MiniStat icon={<PiggyBank className="size-3.5" />} label="Ahorro" value={mask(fmt(monthStats.saving))} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/10 p-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Efectivo</div>
              <div className="font-bold mt-0.5 text-sm">{mask(fmt(cashBankBreakdown.cash))}</div>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5 text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Cuentas</div>
              <div className="font-bold mt-0.5 text-sm">{mask(fmt(cashBankBreakdown.bank))}</div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="lg:grid lg:grid-cols-2 2xl:grid-cols-3 lg:gap-5 lg:px-5 lg:mt-5">
        <div className="min-w-0">
          <section className="px-5 lg:px-0 mt-5">
            <div className="rounded-xl bg-card border border-border p-4 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Tasa de ahorro</span>
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
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="px-5 lg:px-0 mt-6 mb-24 lg:mb-0"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold">Movimientos recientes</h2>
              <Link to="/movimientos" className="text-xs font-semibold text-primary hover:text-primary/80 transition">Ver todos →</Link>
            </div>
            {recent.length === 0 ? (
              <div className="rounded-xl bg-muted/50 border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">Sin movimientos en {MONTHS[activeMonth]}. Registra tu primer gasto o ingreso</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((t) => (
                  <div key={t.id} className="rounded-xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
                    <IconDisplay icon={iconFor(t)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.concept}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(t.date)}</p>
                    </div>
                    <p className={`font-bold text-sm ${t.type === "income" ? "text-success" : t.type === "saving" ? "text-secondary" : t.type === "transfer" ? "text-primary" : "text-destructive"}`}>
                      {t.type === "income" ? "+" : t.type === "transfer" ? "⇄" : "-"}{mask(fmt(t.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </div>

        <div className="min-w-0">
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="px-5 lg:px-0 mt-5 lg:mt-0 grid grid-cols-2 gap-3"
          >
            <Link to="/movimientos?new=expense" className="rounded-xl bg-card border border-border p-4 shadow-soft active:scale-[0.98] transition flex items-center gap-3 hover:border-destructive/30">
              <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"><Plus className="size-5" /></div>
              <div><p className="text-sm font-bold">Gasto</p><p className="text-[11px] text-muted-foreground">Registrar</p></div>
            </Link>
            <Link to="/movimientos?new=income" className="rounded-xl bg-card border border-border p-4 shadow-soft active:scale-[0.98] transition flex items-center gap-3 hover:border-success/30">
              <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center"><Plus className="size-5" /></div>
              <div><p className="text-sm font-bold">Ingreso</p><p className="text-[11px] text-muted-foreground">Registrar</p></div>
            </Link>
          </motion.section>

          {!hasAnyData && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="px-5 lg:px-0 mt-6"
            >
              <div className="rounded-xl gradient-mesh border border-border p-6 text-center">
                <p className="text-4xl mb-2">🎉</p>
                <p className="font-bold text-base">Bienvenido a Finance Pal</p>
                <p className="text-sm text-muted-foreground mt-1">Empieza creando tus ingresos, gastos fijos y metas en <Link to="/ajustes" className="text-primary font-semibold hover:underline">Ajustes</Link>, o registra un movimiento ahora.</p>
              </div>
            </motion.section>
          )}

          {mainGoal && (
            <motion.section
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="px-5 lg:px-0 mt-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-extrabold">Meta principal</h2>
                <Link to="/metas" className="text-xs font-semibold text-primary hover:text-primary/80 transition">Ver todas →</Link>
              </div>
              <Link to="/metas" className={`block rounded-xl p-5 text-primary-foreground shadow-pop ${mainGoal.color || "gradient-primary"} relative overflow-hidden`}>
                <div className="absolute -top-8 -right-8 size-28 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="mb-1"><IconDisplay icon={iconFor(mainGoal)} size="md" className="bg-white/20" /></div>
                      <p className="font-bold text-base mt-1">{mainGoal.name}</p>
                      <p className="text-xs opacity-80">{mask(fmt(mainGoal.saved))} de {mask(fmt(mainGoal.target))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold">{progressPercent}%</p>
                      <p className="text-[10px] opacity-70 uppercase tracking-wider">completado</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden mt-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, progressPercent)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              </Link>
            </motion.section>
          )}

          {upcoming.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="px-5 lg:px-0 mt-6 mb-24 lg:mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Bell className="size-4 text-warning" />
                <h2 className="text-sm font-extrabold">Próximos pagos</h2>
              </div>
              <div className="space-y-2">
                {upcoming.map((u) => (
                  <div key={u.id} className="rounded-xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
                    <IconDisplay icon={iconFor(u)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{u.concept}</p>
                      <p className="text-xs text-muted-foreground">{u.payDay ? `Día ${u.payDay}` : (typeof u.payWeekDay === "number" ? ["Dom","Lun","Mar","Mie","Jue","Vie","Sáb"][u.payWeekDay] : "")}</p>
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
        </div>

        <div className="hidden 2xl:block min-w-0 mt-5 lg:mt-0">
          <div className="space-y-4">
            <Link to="/anual" className="block rounded-xl bg-card border border-border p-4 shadow-soft hover:bg-muted/40 transition">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <BarChart3 className="size-4" />
              </div>
              <p className="font-bold text-sm">Resumen anual</p>
              <p className="text-xs text-muted-foreground mt-1">Ingresos, gastos y más</p>
            </Link>

            <div className="rounded-xl bg-card border border-border p-4 shadow-soft">
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Distribución</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">Efectivo</span>
                    <span className="font-bold">{mask(fmt(cashBankBreakdown.cash))}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${
                      cashBankBreakdown.cash + cashBankBreakdown.bank > 0
                        ? (cashBankBreakdown.cash / (cashBankBreakdown.cash + cashBankBreakdown.bank)) * 100
                        : 0
                    }%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">Cuentas</span>
                    <span className="font-bold">{mask(fmt(cashBankBreakdown.bank))}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-primary" style={{ width: `${
                      cashBankBreakdown.cash + cashBankBreakdown.bank > 0
                        ? (cashBankBreakdown.bank / (cashBankBreakdown.cash + cashBankBreakdown.bank)) * 100
                        : 0
                    }%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl gradient-mesh border border-border p-4 text-center">
              <p className="text-xs font-bold text-muted-foreground">Neto acumulado</p>
              <p className="text-2xl font-extrabold mt-1">{mask(fmt(monthStats.cumulativeNet))}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MiniStat = memo(function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-1 opacity-90 mb-0.5">{icon}<span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span></div>
      <p className="text-sm font-bold truncate">{value}</p>
    </div>
  );
});
