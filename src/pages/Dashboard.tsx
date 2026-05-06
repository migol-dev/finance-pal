import { useMemo, useState } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, monthlyAmount, MONTHS, isFixedActiveInMonth, iconFor } from "@/lib/finance";
import { Eye, EyeOff, TrendingUp, TrendingDown, PiggyBank, Plus, Bell, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import appIcon from "@/assets/app-icon.png";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { IconDisplay } from "@/components/app/IconDisplay";

export default function Dashboard() {
  const { fixedItems, transactions, goals, debts, activeYear, activeMonth } = useFinance();
  const [hide, setHide] = useState(false);

  const monthStats = useMemo(() => {
    let income = 0, expense = 0, saving = 0;
    for (const i of fixedItems) {
      if (!isFixedActiveInMonth(i, activeYear, activeMonth)) continue;
      const m = monthlyAmount(i);
      if (i.type === "income_fixed") income += m;
      else if (i.type === "saving_fixed") saving += m;
      else expense += m;
    }
    for (const t of transactions) {
      const d = new Date(t.date);
      if (d.getMonth() !== activeMonth || d.getFullYear() !== activeYear) continue;
      if (t.type === "income") income += t.amount;
      else if (t.type === "saving") saving += t.amount;
      else expense += t.amount;
    }
    // Debts owed to you: prestar dinero = sale capital (gasto); abono recibido = entra capital (ingreso)
    for (const d of debts) {
      const dd = new Date(d.date);
      if (dd.getFullYear() === activeYear && dd.getMonth() === activeMonth) {
        expense += d.amount;
      }
      for (const p of d.payments) {
        const pd = new Date(p.date);
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
  const isCurrentMonth = today.getFullYear() === activeYear && today.getMonth() === activeMonth;

  const upcoming = useMemo(() => {
    if (!isCurrentMonth) return [];
    const day = today.getDate();
    return fixedItems
      .filter((i) => isFixedActiveInMonth(i, activeYear, activeMonth) && i.payDay && i.type !== "income_fixed")
      .map((i) => ({ ...i, daysLeft: ((i.payDay! - day + 30) % 30) }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 3);
  }, [fixedItems, activeYear, activeMonth, isCurrentMonth, today]);

  const recent = useMemo(() => transactions
    .filter((t) => { const d = new Date(t.date); return d.getMonth() === activeMonth && d.getFullYear() === activeYear; })
    .slice(0, 4), [transactions, activeMonth, activeYear]);

  const mainGoal = goals[0];
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

      <section className="px-5 mt-5 grid grid-cols-2 gap-3">
        <Link to="/movimientos?new=expense" className="rounded-2xl bg-card border border-border p-4 shadow-soft active:scale-95 transition flex items-center gap-3">
          <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"><Plus className="size-5" /></div>
          <div><p className="text-sm font-bold">Gasto</p><p className="text-[11px] text-muted-foreground">Registrar</p></div>
        </Link>
        <Link to="/movimientos?new=income" className="rounded-2xl bg-card border border-border p-4 shadow-soft active:scale-95 transition flex items-center gap-3">
          <div className="size-10 rounded-xl bg-success/10 text-success flex items-center justify-center"><Plus className="size-5" /></div>
          <div><p className="text-sm font-bold">Ingreso</p><p className="text-[11px] text-muted-foreground">Registrar</p></div>
        </Link>
      </section>

      {!hasAnyData && (
        <section className="px-5 mt-6">
          <div className="rounded-3xl gradient-mesh border border-border p-6 text-center">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-bold text-base">Bienvenido a Finance Pal</p>
            <p className="text-xs text-muted-foreground mt-1">Empieza creando tus ingresos, gastos fijos y metas en <Link to="/ajustes" className="text-primary font-semibold">Ajustes</Link>, o registra un movimiento ahora.</p>
          </div>
        </section>
      )}

      {mainGoal && (
        <section className="px-5 mt-6">
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
                <p className="text-3xl font-extrabold">{Math.round((mainGoal.saved / mainGoal.target) * 100)}%</p>
                <p className="text-[10px] opacity-80 uppercase tracking-wide">completado</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/25 overflow-hidden mt-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (mainGoal.saved / mainGoal.target) * 100)}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </Link>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="px-5 mt-6">
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
                  <p className="text-xs text-muted-foreground">Día {u.payDay} del mes</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{mask(fmt(u.amount))}</p>
                  <p className="text-[10px] text-warning font-semibold">en {u.daysLeft}d</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="px-5 mt-6">
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
                  <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</p>
                </div>
                <p className={`font-bold text-sm ${t.type === "income" ? "text-success" : t.type === "saving" ? "text-secondary" : "text-destructive"}`}>
                  {t.type === "income" ? "+" : "-"}{mask(fmt(t.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-2.5">
      <div className="flex items-center gap-1 opacity-90">{icon}<span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span></div>
      <p className="text-sm font-bold mt-0.5 truncate">{value}</p>
    </div>
  );
}
