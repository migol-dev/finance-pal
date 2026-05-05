import { useMemo, useState } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, fmt2, iconFor, IconRef, Goal } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Plus, Trash2, Pencil, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

const PALETTES = ["gradient-sunset", "gradient-ocean", "gradient-secondary", "gradient-success", "gradient-primary"];

/** Compute how much to set aside per day/week/month to reach the goal on time. */
function paceFor(goal: Goal) {
  if (!goal.deadline) return null;
  const remaining = Math.max(0, goal.target - goal.saved);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(`${goal.deadline}T12:00:00`);
  const days = Math.max(1, Math.ceil((dl.getTime() - today.getTime()) / 86400000));
  if (remaining <= 0) return { remaining: 0, days, perDay: 0, perWeek: 0, perMonth: 0, overdue: dl < today };
  return {
    remaining,
    days,
    perDay: remaining / days,
    perWeek: remaining / (days / 7),
    perMonth: remaining / (days / 30),
    overdue: dl < today,
  };
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
        {goals.map((g, i) => {
          const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-3xl p-5 text-primary-foreground shadow-pop relative overflow-hidden ${g.color}`}>
              <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/20 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <IconDisplay icon={iconFor(g)} size="lg" className="bg-white/20" />
                    <div className="min-w-0">
                      <p className="font-bold text-lg truncate">{g.name}</p>
                      {g.deadline && <p className="text-[11px] opacity-80">📅 {new Date(g.deadline).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(g)} className="size-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition"><Pencil className="size-4" /></button>
                    <button onClick={() => { if (confirm(`¿Eliminar "${g.name}"?`)) removeGoal(g.id); }} className="size-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition"><Trash2 className="size-4" /></button>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-extrabold">{fmt(g.saved)}</p>
                    <p className="text-xs opacity-80">de {fmt(g.target)}</p>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/25 overflow-hidden mt-2">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2 }} className="h-full bg-white rounded-full" />
                  </div>
                  <p className="text-xs font-semibold mt-1 opacity-90">{pct.toFixed(1)}% completado</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <ContributeBtn label="+ $100" onClick={() => contributeGoal(g.id, 100)} />
                  <ContributeBtn label="+ $500" onClick={() => contributeGoal(g.id, 500)} />
                  <ContributeBtn label="+ $1,000" onClick={() => contributeGoal(g.id, 1000)} />
                  <ContribCustom onAdd={(v) => contributeGoal(g.id, v)} />
                  <ContribCustom negative onAdd={(v) => contributeGoal(g.id, -v)} />
                </div>
                <GoalInsights goal={g} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function GoalInsights({ goal }: { goal: Goal }) {
  const pace = paceFor(goal);
  const data = useMemo(() => {
    if (!goal.deadline) return [] as { label: string; ideal: number; actual: number }[];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const dl = new Date(`${goal.deadline}T12:00:00`);
    const totalDays = Math.max(1, Math.ceil((dl.getTime() - start.getTime()) / 86400000));
    const steps = 8;
    const arr: { label: string; ideal: number; actual: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const date = new Date(start.getTime() + totalDays * t * 86400000);
      const ideal = goal.saved + (goal.target - goal.saved) * t;
      arr.push({
        label: date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }),
        ideal: Math.round(ideal),
        actual: i === 0 ? goal.saved : NaN,
      });
    }
    return arr;
  }, [goal]);

  if (!pace) return null;

  return (
    <div className="mt-4 rounded-2xl bg-white/15 backdrop-blur-sm p-3 space-y-3">
      {pace.remaining <= 0 ? (
        <p className="text-xs font-bold text-center">🎉 ¡Meta cumplida!</p>
      ) : (
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
        <div className="h-32 -mx-1">
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
                formatter={(v: number) => fmt(v)}
              />
              <ReferenceLine y={goal.target} stroke="#ffffff88" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="ideal" name="Plan ideal" stroke="#fff" strokeWidth={2} fill={`url(#g-${goal.id})`} />
              <Area type="monotone" dataKey="actual" name="Actual" stroke="#fff" strokeDasharray="4 4" fillOpacity={0} />
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

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const t = parseFloat(target);
      const s = parseFloat(saved) || 0;
      if (!t || !name) { toast.error("Completa nombre y monto"); return; }
      onSave({ name, target: t, saved: s, emoji: icon.kind === "emoji" ? icon.value : "🎯", color, deadline: deadline || undefined, icon });
    }} className="space-y-3">
      <div className="flex justify-center"><IconPicker value={icon} onChange={setIcon} /></div>
      <div><Label className="text-xs">Nombre</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Vacaciones a Cancún" className="h-11 rounded-2xl" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Objetivo</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold rounded-2xl" /></div>
        <div><Label className="text-xs">Ya ahorrado</Label><Input type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" className="h-12 text-lg font-bold rounded-2xl" /></div>
      </div>
      <div><Label className="text-xs">Fecha límite (opcional)</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-11 rounded-2xl" /></div>
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
