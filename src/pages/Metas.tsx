import { useMemo, useState } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, fmt2, iconFor, IconRef, Goal, fmtDate, parseDateLocal } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Plus, Trash2, Pencil, Minus, CalendarDays, ExternalLink, Sparkles, AlertTriangle, CheckCircle2, Star, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "@/lib/framer";
import { toast } from "sonner";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";
import SimpleAreaChart from "@/components/ui/SimpleAreaChart";
import { cn } from "@/lib/utils";
import { PillTabs } from "@/components/app/PillTabs";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

const PALETTES = ["gradient-sunset", "gradient-ocean", "gradient-secondary", "gradient-success", "gradient-primary"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysBetween(a: Date, b: Date) { return Math.max(0, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000)); }
function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function normalizeUrl(u?: string) {
  if (!u) return undefined;
  const t = u.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Pace required to reach goal on time (per day/week/month). */
function paceFor(goal: Goal) {
  if (!goal.deadline) return null;
  const remaining = Math.max(0, goal.target - goal.saved);
  const today = startOfDay(new Date());
  const dl = startOfDay(new Date(`${goal.deadline}T12:00:00`));
  const days = Math.max(1, daysBetween(today, dl) || 1);
  return {
    remaining, days,
    perDay: remaining / days,
    perWeek: remaining / (days / 7),
    perMonth: remaining / (days / 30),
    overdue: dl < today,
  };
}

/** Returns the cumulative ideal vs actual amount at a given date. */
function expectedAt(goal: Goal, date: Date) {
  if (!goal.deadline) return goal.target;
  const start = startOfDay(parseDateLocal(goal.createdAt ?? new Date().toISOString()));
  const dl = startOfDay(new Date(`${goal.deadline}T12:00:00`));
  const total = Math.max(1, daysBetween(start, dl));
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, date)));
  return (goal.target * elapsed) / total;
}

function actualAt(goal: Goal, date: Date) {
  const end = startOfDay(date).getTime();
  const initial = (goal.contributions && goal.contributions.length > 0)
    ? 0
    : goal.saved; // legacy goal without log → use current saved as baseline
  const sum = (goal.contributions ?? []).reduce((acc, c) => {
    const t = startOfDay(parseDateLocal(c.date)).getTime();
    return t <= end ? acc + c.amount : acc;
  }, 0);
  return Math.max(0, initial + sum);
}

/** Status: ahead / on-track / behind compared to ideal at today's date. */
function statusFor(goal: Goal) {
  if (!goal.deadline) return null;
  const today = new Date();
  const ideal = expectedAt(goal, today);
  const actual = actualAt(goal, today);
  const diff = actual - ideal;
  const tolerance = Math.max(50, goal.target * 0.02);
  if (goal.saved >= goal.target) return { kind: "done" as const, diff };
  if (diff < -tolerance) return { kind: "behind" as const, diff };
  if (diff > tolerance) return { kind: "ahead" as const, diff };
  return { kind: "ontrack" as const, diff };
}

export default function Metas() {
  const { goals, addGoal, updateGoal, removeGoal, contributeGoal } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailGoal = useMemo(() => goals.find(g => g.id === detailId) || null, [goals, detailId]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (g: Goal) => { setEditing(g); setOpen(true); };

  return (
    <div className="pb-24">
      <Header title="Metas" subtitle="Sueños con plan" action={
        <Button onClick={openNew} className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow h-11"><Plus className="size-4 mr-1" />Nueva</Button>
      } />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar meta" : "Nueva meta"}</DialogTitle></DialogHeader>
            <DialogDescription className="sr-only">Formulario para crear o editar una meta</DialogDescription>
          <GoalForm initial={editing} onSave={(g) => {
            if (editing) { updateGoal(editing.id, g); toast.success("Actualizado"); }
            else { addGoal(g); toast.success("Meta creada ✨"); }
            setOpen(false); setEditing(null);
          }} />
        </DialogContent>
      </Dialog>

      <div className="px-5 space-y-4">
        {goals.length === 0 && (
          <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-8 text-center">
            <p className="text-4xl mb-2">🎯</p>
            <p className="text-sm text-muted-foreground">Crea tu primera meta de ahorro</p>
          </div>
        )}
        <AnimatePresence>
          {goals.map((g, i) => (
            <GoalCompactCard key={g.id} goal={g} index={i}
              onViewMore={() => setDetailId(g.id)}
              onContribute={(amt, date) => contributeGoal(g.id, amt, date)}
            />
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={!!detailId} onOpenChange={(v) => { if(!v) setDetailId(null); }}>
        <DialogContent className="max-w-lg p-0 border-0 bg-transparent shadow-none overflow-hidden h-[95vh]">
          <DialogDescription className="sr-only">Detalle de la meta {detailGoal?.name}</DialogDescription>
          {detailGoal && (
            <div className={cn("h-full w-full overflow-y-auto no-scrollbar rounded-t-[40px] p-6 text-white relative", detailGoal.color)}>
              <button onClick={() => setDetailId(null)} className="absolute top-6 right-6 size-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md z-10">
                <X className="size-5" />
              </button>

              <GoalDetailContent
                goal={detailGoal}
                onEdit={() => { setEditing(detailGoal); setOpen(true); setDetailId(null); }}
                onDelete={() => { removeGoal(detailGoal.id); setDetailId(null); }}
                onContribute={(amt, date) => contributeGoal(detailGoal.id, amt, date)}
                onTogglePin={() => updateGoal(detailGoal.id, { pinned: !detailGoal.pinned })}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCompactCard({ goal, index, onViewMore, onContribute }: {
  goal: Goal; index: number; onViewMore: () => void;
  onContribute: (amount: number, date?: string) => void;
}) {
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const [confirmOpen, setConfirmOpen] = useState<{ amount: number } | null>(null);

  const handleQuickAdd = (amount: number) => {
    setConfirmOpen({ amount });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={cn("rounded-3xl p-5 text-primary-foreground shadow-pop relative overflow-hidden", goal.color)}>
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <IconDisplay icon={iconFor(goal)} size="lg" className="bg-white/20 shadow-inner" />
            <div>
              <p className="font-bold text-lg leading-tight">{goal.name}</p>
              <p className="text-[10px] opacity-80 font-semibold tracking-wider uppercase">{goal.pinned ? "Meta Principal" : "Meta Ahorro"}</p>
            </div>
          </div>
          <button onClick={onViewMore} className="size-10 rounded-2xl bg-white/20 flex items-center justify-center active:scale-90 transition">
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-end justify-between">
            <p className="text-2xl font-black">{fmt(goal.saved)}</p>
            <p className="text-xs font-bold opacity-80 mb-1">Objetivo: {fmt(goal.target)}</p>
          </div>
          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden relative">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-white rounded-full shadow-glow" />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter pt-1">
            <span>{pct.toFixed(1)}%</span>
            <span className="opacity-70">{fmt(goal.target - goal.saved)} restantes</span>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => handleQuickAdd(100)} className="flex-1 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-[11px] font-black border border-white/10">+100</button>
          <button onClick={() => handleQuickAdd(500)} className="flex-1 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-[11px] font-black border border-white/10">+500</button>
          <button onClick={() => handleQuickAdd(1000)} className="flex-1 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-[11px] font-black border border-white/10">+1k</button>
          <button onClick={onViewMore} className="size-10 rounded-2xl bg-white/25 hover:bg-white/35 active:scale-95 transition flex items-center justify-center border border-white/20"><Plus className="size-4" /></button>
        </div>
      </div>

      <ElegantConfirm
        open={!!confirmOpen}
        onOpenChange={(v) => !v && setConfirmOpen(null)}
        title="¿Confirmar aporte?"
        description={<p className="text-sm text-muted-foreground">Vas a añadir <span className="font-bold text-foreground">{fmt(confirmOpen?.amount ?? 0)}</span> a tu meta <span className="font-bold text-foreground">"{goal.name}"</span>.</p>}
        onConfirm={() => {
          if (confirmOpen) onContribute(confirmOpen.amount);
          setConfirmOpen(null);
          toast.success("¡Aporte registrado! 🚀");
        }}
        icon={Plus}
        iconColor={goal.color}
      />
    </motion.div>
  );
}

function GoalDetailContent({ goal, onEdit, onDelete, onContribute, onTogglePin }: {
  goal: Goal; onEdit: () => void; onDelete: () => void;
  onContribute: (amount: number, date?: string) => void;
  onTogglePin: () => void;
}) {
  const [tab, setTab] = useState<"resumen" | "calendario" | "simular">("resumen");
  const [confirmOpen, setConfirmOpen] = useState<{ amount: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const status = statusFor(goal);
  const url = normalizeUrl(goal.purchaseUrl);

  const handleQuickAdd = (amount: number) => {
    setConfirmOpen({ amount });
  };

  return (
    <div className="pb-10">
      <div className="flex items-center gap-4 mb-6 pr-12">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="relative group active:scale-95 transition">
            <IconDisplay icon={iconFor(goal)} size="lg" className="bg-white/20 ring-4 ring-white/10" />
            <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-white text-foreground flex items-center justify-center shadow-lg">
              <ExternalLink className="size-3.5" />
            </span>
          </a>
        ) : (
          <IconDisplay icon={iconFor(goal)} size="lg" className="bg-white/20 shadow-xl" />
        )}
        <div className="min-w-0">
          <h2 className="text-2xl font-black truncate">{goal.name}</h2>
          {goal.deadline && (
            <p className="text-xs font-bold opacity-80 flex items-center gap-1.5 mt-0.5">
              <CalendarDays className="size-3.5" /> {fmtDate(`${goal.deadline}T12:00:00`)}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-[32px] p-6 mb-4 border border-white/10">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-4xl font-black">{fmt(goal.saved)}</p>
          <p className="text-sm font-bold opacity-70">de {fmt(goal.target)}</p>
        </div>
        <div className="h-3 rounded-full bg-black/20 overflow-hidden mb-2">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2 }} className="h-full bg-white rounded-full" />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm font-black">{pct.toFixed(1)}%</p>
          <StatusBanner status={status} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        <button onClick={onTogglePin} className={cn("h-14 rounded-2xl flex items-center justify-center transition active:scale-90", goal.pinned ? "bg-white text-foreground" : "bg-white/10 text-white")}>
          <Star className={cn("size-6", goal.pinned ? "fill-current" : "")} />
        </button>
        <button onClick={onEdit} className="h-14 rounded-2xl bg-white/10 flex items-center justify-center active:scale-90 transition"><Pencil className="size-6" /></button>
        <button onClick={() => setDeleteConfirm(true)} className="h-14 rounded-2xl bg-white/10 flex items-center justify-center active:scale-90 transition"><Trash2 className="size-6" /></button>
        <ContribCustom onAdd={(v) => onContribute(v)} />
      </div>

      <div className="flex gap-2 mb-6">
        <ContributeBtn label="+ $100" onClick={() => handleQuickAdd(100)} />
        <ContributeBtn label="+ $500" onClick={() => handleQuickAdd(500)} />
        <ContribCustom negative onAdd={(v) => onContribute(-v)} />
      </div>

      <ElegantConfirm
        open={!!confirmOpen}
        onOpenChange={(v) => !v && setConfirmOpen(null)}
        title="¿Confirmar aporte?"
        description={<p className="text-sm text-muted-foreground">Vas a añadir <span className="font-bold text-foreground">{fmt(confirmOpen?.amount ?? 0)}</span> a tu meta <span className="font-bold text-foreground">"{goal.name}"</span>.</p>}
        onConfirm={() => {
          if (confirmOpen) onContribute(confirmOpen.amount);
          setConfirmOpen(null);
          toast.success("¡Aporte registrado! 🚀");
        }}
        icon={Plus}
        iconColor={goal.color}
      />

      <ElegantConfirm
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="¿Eliminar meta?"
        description={<p className="text-sm text-muted-foreground">¿Estás seguro de que quieres eliminar <span className="font-bold text-foreground">"{goal.name}"</span>? Esta acción no se puede deshacer.</p>}
        onConfirm={onDelete}
        icon={Trash2}
        iconColor="bg-destructive"
      />

      <PillTabs<"resumen" | "calendario" | "simular">
        className="mb-4 bg-black/10 p-1 rounded-2xl"
        ariaLabel={`Vistas de meta ${goal.name}`}
        tabs={["resumen", "calendario", "simular"]}
        value={tab}
        onChange={setTab}
      />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
          {tab === "resumen" && <ResumenTab goal={goal} />}
          {tab === "calendario" && <CalendarioTab goal={goal} onContribute={onContribute} />}
          {tab === "simular" && <SimularTab goal={goal} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatusBanner({ status }: { status: ReturnType<typeof statusFor> }) {
  if (!status) return null;
  if (status.kind === "done") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-white/25 px-3 py-1">
        <CheckCircle2 className="size-4 shrink-0" />
        <p className="text-[10px] font-bold">🎉 Cumplida</p>
      </div>
    );
  }
  if (status.kind === "behind") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-destructive/30 ring-1 ring-white/40 px-3 py-1 animate-pulse">
        <AlertTriangle className="size-4 shrink-0" />
        <p className="text-[10px] font-bold">Atrasado</p>
      </div>
    );
  }
  if (status.kind === "ahead") {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-white/25 px-3 py-1">
        <Sparkles className="size-4 shrink-0" />
        <p className="text-[10px] font-bold">¡Adelantado!</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-1">
      <CheckCircle2 className="size-4 shrink-0" />
      <p className="text-[10px] font-bold">Al ritmo</p>
    </div>
  );
}

function ResumenTab({ goal }: { goal: Goal }) {
  const pace = paceFor(goal);
  const data = useMemo(() => {
    if (!goal.deadline) return [] as { label: string; ideal: number; actual: number | null }[];
    const start = startOfDay(parseDateLocal(goal.createdAt ?? new Date().toISOString()));
    const dl = startOfDay(new Date(`${goal.deadline}T12:00:00`));
    const total = Math.max(1, daysBetween(start, dl));
    const today = startOfDay(new Date());
    const steps = 10;
    const arr: { label: string; ideal: number; actual: number | null }[] = [];
      for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const date = new Date(start.getTime() + total * t * 86400000);
      const ideal = goal.target * t;
      const actual = date <= today ? Math.round(actualAt(goal, date)) : null;
      arr.push({
        label: fmtDate(date),
        ideal: Math.round(ideal),
        actual,
      });
    }
    return arr;
  }, [goal]);

  

  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-3 space-y-3">
      {pace && pace.remaining > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <PaceBox label="Por día" value={fmt2(pace.perDay)} />
            <PaceBox label="Por semana" value={fmt2(pace.perWeek)} />
            <PaceBox label="Por mes" value={fmt2(pace.perMonth)} />
          </div>
          <p className="text-[10px] text-center opacity-80">
            {pace.overdue ? "⚠️ Fecha vencida — " : ""}
            Faltan {fmt(pace.remaining)} en {pace.days} día{pace.days === 1 ? "" : "s"}
          </p>
        </>
      )}
      {data.length > 0 && (
        <div className="h-40 -mx-1">
          <SimpleAreaChart
            data={data}
            xKey="label"
            height={160}
            maxY={goal.target}
            series={[
              { key: "ideal", label: "Plan ideal", color: "#ffffff88", type: "area", formatter: (v) => (v == null ? "—" : fmt(Number(v))) },
              { key: "actual", label: "Actual", color: "#ffffff", type: "line", formatter: (v) => fmt(Number(v)) },
            ]}
            referenceLines={[{ value: goal.target, label: "Meta" }]}
          />
        </div>
      )}
      {!goal.deadline && (
        <p className="text-[11px] text-center opacity-80">Añade una fecha límite para ver el plan recomendado y el gráfico.</p>
      )}
    </div>
  );
}

function CalendarioTab({ goal, onContribute }: { goal: Goal; onContribute: (amount: number, date?: string) => void }) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState("");
  const pace = paceFor(goal);

  const contribsByDay = useMemo(() => {
    const m = new Map<string, number>();
    (goal.contributions ?? []).forEach((c) => {
      const k = ymd(startOfDay(parseDateLocal(c.date)));
      m.set(k, (m.get(k) ?? 0) + c.amount);
    });
    return m;
  }, [goal.contributions]);

  const contribDays = useMemo(() => Array.from(contribsByDay.keys()).map((k) => new Date(`${k}T12:00:00`)), [contribsByDay]);

  const recommended = pace?.perDay ?? 0;
  const dayKey = selected ? ymd(startOfDay(selected)) : null;
  const dayContrib = dayKey ? (contribsByDay.get(dayKey) ?? 0) : 0;

  return (
    <div className="rounded-2xl bg-card text-card-foreground p-3 space-y-3 shadow-sm">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        modifiers={{ contributed: contribDays }}
        modifiersClassNames={{ contributed: "ring-2 ring-success rounded-md font-bold" }}
        className={cn("p-0 pointer-events-auto mx-auto")}
      />
      {selected && (
        <div className="rounded-xl bg-muted p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">{fmtDate(selected)}</span>
            {dayContrib > 0 && <span className="text-success font-bold">+{fmt(dayContrib)}</span>}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Recomendado:</span>
            <span className="font-bold text-foreground">{recommended > 0 ? fmt2(recommended) : "—"}</span>
          </div>
          <div className="flex gap-2">
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder={recommended > 0 ? recommended.toFixed(0) : "Monto"} className="h-10 rounded-xl" />
            <Button
              type="button"
              onClick={() => {
                const v = parseFloat(amount) || recommended;
                if (!v) { toast.error("Ingresa un monto"); return; }
                const d = new Date(selected); d.setHours(12, 0, 0, 0);
                onContribute(v, d.toISOString());
                setAmount("");
                toast.success(`Aporte de ${fmt(v)} registrado`);
              }}
              className="h-10 rounded-xl gradient-primary text-primary-foreground border-0 font-bold">
              <Plus className="size-4 mr-1" />Registrar
            </Button>
          </div>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground text-center">
        <CalendarDays className="inline size-3 mr-1" />
        Días con aporte aparecen marcados en verde
      </p>
    </div>
  );
}

function SimularTab({ goal }: { goal: Goal }) {
  const pace = paceFor(goal);
  const recommended = pace?.perDay ?? 0;
  const [perDay, setPerDay] = useState<number>(Math.max(1, Math.round(recommended || 50)));

  

  const data = useMemo(() => {
    if (!goal.deadline) return [] as any[];
    const start = startOfDay(parseDateLocal(goal.createdAt ?? new Date().toISOString()));
    const dl = startOfDay(new Date(`${goal.deadline}T12:00:00`));
    const today = startOfDay(new Date());
    const total = Math.max(1, daysBetween(start, dl));
    const steps = 12;
    const arr: any[] = [];
      for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const date = new Date(start.getTime() + total * t * 86400000);
      const ideal = goal.target * t;
      const actualUpToToday = date <= today ? actualAt(goal, date) : actualAt(goal, today);
      const futureDays = Math.max(0, daysBetween(today, date));
      const sim = actualUpToToday + perDay * futureDays;
      arr.push({
        label: fmtDate(date),
        ideal: Math.round(ideal),
        simulado: Math.round(Math.min(sim, goal.target * 1.2)),
      });
    }
    return arr;
  }, [goal, perDay]);

  // Will the simulation hit target by deadline?
  const projection = useMemo(() => {
    const today = startOfDay(new Date());
    const dl = goal.deadline ? startOfDay(new Date(`${goal.deadline}T12:00:00`)) : null;
    if (!dl) return null;
    const future = Math.max(0, daysBetween(today, dl));
    const projected = actualAt(goal, today) + perDay * future;
    const surplus = projected - goal.target;
    const remaining = Math.max(0, goal.target - actualAt(goal, today));
    const daysToHit = perDay > 0 ? Math.ceil(remaining / perDay) : Infinity;
    const hitDate = perDay > 0 && Number.isFinite(daysToHit)
      ? new Date(today.getTime() + daysToHit * 86400000)
      : null;
    return { projected, surplus, hitDate };
  }, [goal, perDay]);

  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-3 space-y-3">
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span>Aporte por día</span>
          <span className="font-extrabold">{fmt2(perDay)}</span>
        </div>
        <Slider min={0} max={Math.max(1000, Math.round((recommended || 100) * 4))} step={10}
          value={[perDay]} onValueChange={(v) => setPerDay(v[0])} className="mt-2" />
        {recommended > 0 && (
          <p className="text-[10px] opacity-80 mt-1">Recomendado: {fmt2(recommended)} / día</p>
        )}
      </div>

      {projection && (
        <div className="rounded-xl bg-white/20 p-2 text-[11px] space-y-0.5">
          <div className="flex justify-between"><span>Proyección a la fecha límite:</span><span className="font-bold">{fmt(projection.projected)}</span></div>
          {projection.surplus >= 0
            ? <p className="font-bold">✅ Llegas {projection.hitDate ? `el ${fmtDate(projection.hitDate)}` : "a tiempo"} con {fmt(projection.surplus)} extra</p>
            : <p className="font-bold">⚠️ Te faltarán {fmt(Math.abs(projection.surplus))}</p>}
        </div>
      )}

      {data.length > 0 && (
        <div className="h-40 -mx-1">
          <SimpleAreaChart
            data={data}
            xKey="label"
            height={160}
            maxY={Math.max(goal.target, ...data.map((d: any) => d.simulado))}
            series={[
              { key: "ideal", label: "Ideal", color: "#ffffff88", type: "line", formatter: (v) => fmt(Number(v)) },
              { key: "simulado", label: "Simulado", color: "#ffffff", type: "area", formatter: (v) => fmt(Number(v)) },
            ]}
            referenceLines={[{ value: goal.target, label: "Meta" }]}
          />
        </div>
      )}
    </div>
  );
}

function PaceBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/20 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-xs font-extrabold leading-tight">{value}</p>
    </div>
  );
}

function ContributeBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex-1 h-9 rounded-xl bg-white/25 hover:bg-white/35 backdrop-blur-sm text-xs font-bold transition active:scale-95">{label}</button>;
}

function ContribCustom({ onAdd, negative }: { onAdd: (v: number) => void; negative?: boolean }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="size-9 rounded-xl bg-white/25 hover:bg-white/35 text-xs font-bold transition flex items-center justify-center">
        {negative ? <Minus className="size-4" /> : "···"}
      </button>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>{negative ? "Retirar de meta" : "Aportar a meta"}</DialogTitle></DialogHeader>
        <Input autoFocus type="number" value={v} onChange={(e) => setV(e.target.value)} placeholder="Monto" className="h-14 text-2xl font-bold rounded-2xl" />
        <Button onClick={() => { const n = parseFloat(v); if (n) { onAdd(n); setOpen(false); setV(""); toast.success(negative ? "Retiro registrado" : "¡Aporte registrado!"); } }}
          className="h-12 rounded-2xl gradient-primary text-primary-foreground border-0 font-bold">{negative ? "Retirar" : "Aportar"}</Button>
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ initial, onSave }: { initial: Goal | null; onSave: (g: Omit<Goal, "id">) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial?.target ? String(initial.target) : "");
  const [saved, setSaved] = useState(initial?.saved ? String(initial.saved) : "0");
  const [icon, setIcon] = useState<IconRef>(initial?.icon ?? { kind: "emoji", value: initial?.emoji ?? "🎯" });
  const [color, setColor] = useState(initial?.color ?? PALETTES[0]);
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [purchaseUrl, setPurchaseUrl] = useState(initial?.purchaseUrl ?? "");

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const t = parseFloat(target);
      const s = parseFloat(saved) || 0;
      if (!t || !name) { toast.error("Completa nombre y monto"); return; }
      onSave({
        name, target: t, saved: s,
        emoji: icon.kind === "emoji" ? icon.value : "🎯",
        color,
        deadline: deadline || undefined,
        icon,
        purchaseUrl: purchaseUrl.trim() || undefined,
        createdAt: initial?.createdAt,
        contributions: initial?.contributions,
      });
    }} className="space-y-3">
      <div className="flex justify-center"><IconPicker value={icon} onChange={setIcon} /></div>
      <div><Label className="text-xs">Nombre</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Vacaciones a Cancún" className="h-11 rounded-2xl" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Objetivo</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold rounded-2xl" /></div>
        <div><Label className="text-xs">Ya ahorrado</Label><Input type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" className="h-12 text-lg font-bold rounded-2xl" /></div>
      </div>
      <div><Label className="text-xs">Fecha límite (opcional)</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-11 rounded-2xl" /></div>
      <div>
        <Label className="text-xs flex items-center gap-1"><ExternalLink className="size-3" /> Link de compra (opcional)</Label>
        <Input type="url" value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} placeholder="https://..." className="h-11 rounded-2xl" />
        <p className="text-[10px] text-muted-foreground mt-1">Toca el icono de la meta para abrirlo</p>
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-1">
          {PALETTES.map((p) => <button key={p} type="button" onClick={() => setColor(p)} className={`flex-1 h-10 rounded-xl ${p} transition ${color === p ? "ring-4 ring-offset-2 ring-primary" : ""}`} />)}
        </div>
      </div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">{initial ? "Guardar cambios" : "Crear meta"}</Button>
    </form>
  );
}
