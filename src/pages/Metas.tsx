import { useMemo, useState } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, fmt2, iconFor, IconRef, Goal } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Plus, Trash2, Pencil, Minus, CalendarDays, ExternalLink, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Line } from "recharts";
import { cn } from "@/lib/utils";
import { PillTabs } from "@/components/app/PillTabs";

const PALETTES = ["gradient-sunset", "gradient-ocean", "gradient-secondary", "gradient-success", "gradient-primary"];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function daysBetween(a: Date, b: Date) { return Math.max(0, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000)); }
function ymd(d: Date) { return d.toISOString().slice(0, 10); }
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
  const start = startOfDay(new Date(goal.createdAt ?? new Date().toISOString()));
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
    const t = startOfDay(new Date(c.date)).getTime();
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

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (g: Goal) => { setEditing(g); setOpen(true); };

  return (
    <div>
      <Header title="Metas" subtitle="Sueños con plan" action={
        <Button onClick={openNew} className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow h-11"><Plus className="size-4 mr-1" />Nueva</Button>
      } />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar meta" : "Nueva meta"}</DialogTitle></DialogHeader>
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
        {goals.map((g, i) => (
          <GoalCard key={g.id} goal={g} index={i}
            onEdit={() => openEdit(g)}
            onDelete={() => { if (confirm(`¿Eliminar "${g.name}"?`)) removeGoal(g.id); }}
            onContribute={(amt, date) => contributeGoal(g.id, amt, date)}
          />
        ))}
      </div>
    </div>
  );
}

function GoalCard({ goal, index, onEdit, onDelete, onContribute }: {
  goal: Goal; index: number; onEdit: () => void; onDelete: () => void;
  onContribute: (amount: number, date?: string) => void;
}) {
  const [tab, setTab] = useState<"resumen" | "calendario" | "simular">("resumen");
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const status = statusFor(goal);
  const url = normalizeUrl(goal.purchaseUrl);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`rounded-3xl p-5 text-primary-foreground shadow-pop relative overflow-hidden ${goal.color}`}>
      <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer"
                title="Abrir link de compra"
                className="relative group active:scale-95 transition">
                <IconDisplay icon={iconFor(goal)} size="lg" className="bg-white/20 ring-2 ring-white/40" />
                <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-white text-[10px] flex items-center justify-center shadow">
                  <ExternalLink className="size-3 text-foreground" />
                </span>
              </a>
            ) : (
              <IconDisplay icon={iconFor(goal)} size="lg" className="bg-white/20" />
            )}
            <div className="min-w-0">
              <p className="font-bold text-lg truncate">{goal.name}</p>
              {goal.deadline && (
                <p className="text-[11px] opacity-80">📅 {new Date(`${goal.deadline}T12:00:00`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} className="size-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition"><Pencil className="size-4" /></button>
            <button onClick={onDelete} className="size-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition"><Trash2 className="size-4" /></button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-extrabold">{fmt(goal.saved)}</p>
            <p className="text-xs opacity-80">de {fmt(goal.target)}</p>
          </div>
          <div className="h-2.5 rounded-full bg-white/25 overflow-hidden mt-2">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2 }} className="h-full bg-white rounded-full" />
          </div>
          <p className="text-xs font-semibold mt-1 opacity-90">{pct.toFixed(1)}% completado</p>
        </div>

        <StatusBanner status={status} />

        <div className="flex gap-2 mt-4">
          <ContributeBtn label="+ $100" onClick={() => onContribute(100)} />
          <ContributeBtn label="+ $500" onClick={() => onContribute(500)} />
          <ContributeBtn label="+ $1,000" onClick={() => onContribute(1000)} />
          <ContribCustom onAdd={(v) => onContribute(v)} />
          <ContribCustom negative onAdd={(v) => onContribute(-v)} />
        </div>

        {/* Tabs */}
        <PillTabs<"resumen" | "calendario" | "simular">
          className="mt-4"
          ariaLabel={`Vistas de meta ${goal.name}`}
          tabs={["resumen", "calendario", "simular"]}
          value={tab}
          onChange={setTab}
        />

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }} className="mt-3">
            {tab === "resumen" && <ResumenTab goal={goal} />}
            {tab === "calendario" && <CalendarioTab goal={goal} onContribute={onContribute} />}
            {tab === "simular" && <SimularTab goal={goal} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StatusBanner({ status }: { status: ReturnType<typeof statusFor> }) {
  if (!status) return null;
  if (status.kind === "done") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/25 px-3 py-2">
        <CheckCircle2 className="size-4 shrink-0" />
        <p className="text-xs font-bold">🎉 Meta cumplida</p>
      </div>
    );
  }
  if (status.kind === "behind") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-destructive/30 ring-1 ring-white/40 px-3 py-2 animate-pulse">
        <AlertTriangle className="size-4 shrink-0" />
        <p className="text-xs font-bold">Vas atrasado por {fmt(Math.abs(status.diff))}. Acelera el ritmo.</p>
      </div>
    );
  }
  if (status.kind === "ahead") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/25 px-3 py-2">
        <Sparkles className="size-4 shrink-0" />
        <p className="text-xs font-bold">¡Vas adelantado por {fmt(status.diff)}!</p>
      </div>
    );
  }
  return (
    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2">
      <CheckCircle2 className="size-4 shrink-0" />
      <p className="text-xs font-bold">Vas al ritmo del plan</p>
    </div>
  );
}

function ResumenTab({ goal }: { goal: Goal }) {
  const pace = paceFor(goal);
  const data = useMemo(() => {
    if (!goal.deadline) return [] as { label: string; ideal: number; actual: number | null }[];
    const start = startOfDay(new Date(goal.createdAt ?? new Date().toISOString()));
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
        label: date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
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
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ffffff22" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#ffffffcc", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, goal.target]} />
              <Tooltip
                contentStyle={{ background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 11 }}
                formatter={(v: any) => v == null ? "—" : fmt(Number(v))}
              />
              <ReferenceLine y={goal.target} stroke="#ffffff88" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="ideal" name="Plan ideal" stroke="#fff" strokeWidth={2} fill={`url(#g-${goal.id})`} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#fff" strokeWidth={2} dot={{ r: 3, fill: "#fff" }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
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
      const k = ymd(startOfDay(new Date(c.date)));
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
            <span className="font-semibold">{selected.toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "long" })}</span>
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
    const start = startOfDay(new Date(goal.createdAt ?? new Date().toISOString()));
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
        label: date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
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
            ? <p className="font-bold">✅ Llegas {projection.hitDate ? `el ${projection.hitDate.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}` : "a tiempo"} con {fmt(projection.surplus)} extra</p>
            : <p className="font-bold">⚠️ Te faltarán {fmt(Math.abs(projection.surplus))}</p>}
        </div>
      )}

      {data.length > 0 && (
        <div className="h-40 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`sim-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ffffff22" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#ffffffcc", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, Math.max(goal.target, ...data.map((d: any) => d.simulado))]} />
              <Tooltip contentStyle={{ background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 12, color: "#fff", fontSize: 11 }} formatter={(v: any) => fmt(Number(v))} />
              <ReferenceLine y={goal.target} stroke="#ffffff88" strokeDasharray="3 3" label={{ value: "Meta", fill: "#fff", fontSize: 9 }} />
              <Area type="monotone" dataKey="ideal" name="Ideal" stroke="#ffffff88" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
              <Area type="monotone" dataKey="simulado" name="Simulado" stroke="#fff" strokeWidth={2.5} fill={`url(#sim-${goal.id})`} />
            </AreaChart>
          </ResponsiveContainer>
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
