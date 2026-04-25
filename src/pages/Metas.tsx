import { useState } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PALETTES = ["gradient-sunset", "gradient-ocean", "gradient-secondary", "gradient-success", "gradient-primary"];
const EMOJIS = ["🏍️","🛟","🏠","✈️","🎓","💍","💻","📱","🚗","🎮","🎁","🐾"];

export default function Metas() {
  const { goals, addGoal, removeGoal, contributeGoal } = useFinance();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Header title="Metas" subtitle="Sueños con plan" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow h-11"><Plus className="size-4 mr-1" />Nueva</Button></DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle>Nueva meta</DialogTitle></DialogHeader>
            <NewGoalForm onSave={(g) => { addGoal(g); setOpen(false); toast.success("Meta creada ✨"); }} />
          </DialogContent>
        </Dialog>
      } />

      <div className="px-5 space-y-4">
        {goals.length === 0 && (
          <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-8 text-center">
            <p className="text-4xl mb-2">🎯</p>
            <p className="text-sm text-muted-foreground">Crea tu primera meta de ahorro</p>
          </div>
        )}
        {goals.map((g, i) => {
          const pct = Math.min(100, (g.saved / g.target) * 100);
          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`rounded-3xl p-5 text-primary-foreground shadow-pop relative overflow-hidden ${g.color}`}>
              <div className="absolute -top-8 -right-8 size-32 rounded-full bg-white/20 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-4xl">{g.emoji}</p>
                    <p className="font-bold text-lg mt-1">{g.name}</p>
                    {g.deadline && <p className="text-[11px] opacity-80">📅 {new Date(g.deadline).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</p>}
                  </div>
                  <button onClick={() => removeGoal(g.id)} className="size-9 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition"><Trash2 className="size-4" /></button>
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
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ContributeBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex-1 h-9 rounded-xl bg-white/25 hover:bg-white/35 backdrop-blur-sm text-xs font-bold transition active:scale-95">{label}</button>;
}

function ContribCustom({ onAdd }: { onAdd: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="size-9 rounded-xl bg-white/25 hover:bg-white/35 text-xs font-bold transition">···</button></DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>Aportar a meta</DialogTitle></DialogHeader>
        <Input autoFocus type="number" value={v} onChange={(e) => setV(e.target.value)} placeholder="Monto" className="h-14 text-2xl font-bold rounded-2xl" />
        <Button onClick={() => { const n = parseFloat(v); if (n) { onAdd(n); setOpen(false); setV(""); toast.success("¡Aporte registrado!"); } }} className="h-12 rounded-2xl gradient-primary text-primary-foreground border-0 font-bold">Aportar</Button>
      </DialogContent>
    </Dialog>
  );
}

function NewGoalForm({ onSave }: { onSave: (g: { name: string; target: number; saved: number; emoji: string; color: string; deadline?: string }) => void }) {
  const [name, setName] = useState(""); const [target, setTarget] = useState(""); const [emoji, setEmoji] = useState("🎯"); const [color, setColor] = useState(PALETTES[0]); const [deadline, setDeadline] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); const t = parseFloat(target); if (!t || !name) return; onSave({ name, target: t, saved: 0, emoji, color, deadline: deadline || undefined }); }} className="space-y-3">
      <div><Label className="text-xs">Nombre</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Vacaciones a Cancún" className="h-11 rounded-2xl" /></div>
      <div><Label className="text-xs">Monto objetivo</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" className="h-12 text-xl font-bold rounded-2xl" /></div>
      <div><Label className="text-xs">Fecha límite (opcional)</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-11 rounded-2xl" /></div>
      <div>
        <Label className="text-xs">Emoji</Label>
        <div className="flex gap-2 flex-wrap mt-1">
          {EMOJIS.map((e) => <button key={e} type="button" onClick={() => setEmoji(e)} className={`size-10 rounded-xl text-xl transition ${emoji === e ? "bg-primary/15 ring-2 ring-primary" : "bg-muted"}`}>{e}</button>)}
        </div>
      </div>
      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-1">
          {PALETTES.map((p) => <button key={p} type="button" onClick={() => setColor(p)} className={`flex-1 h-10 rounded-xl ${p} transition ${color === p ? "ring-4 ring-offset-2 ring-primary" : ""}`} />)}
        </div>
      </div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">Crear meta</Button>
    </form>
  );
}
