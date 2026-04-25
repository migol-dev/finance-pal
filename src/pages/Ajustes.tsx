import { useState } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, monthlyAmount, TYPE_LABEL, FREQ_LABEL, emojiFor, ItemType, Frequency, Priority } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Plus, Trash2, Power, Smartphone, Database, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Ajustes() {
  const { fixedItems, addFixed, removeFixed, toggleFixed, resetAll } = useFinance();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | ItemType>("all");

  const filtered = fixedItems.filter((i) => tab === "all" || i.type === tab);

  return (
    <div>
      <Header title="Ajustes" subtitle="Configura tus fijos del mes" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow h-11"><Plus className="size-4 mr-1" />Agregar</Button></DialogTrigger>
          <DialogContent className="rounded-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuevo concepto fijo</DialogTitle></DialogHeader>
            <NewFixedForm onSave={(i) => { addFixed(i); setOpen(false); toast.success("Agregado"); }} />
          </DialogContent>
        </Dialog>
      } />

      <div className="px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {([
          { k: "all", label: "Todos" },
          { k: "income_fixed", label: "Ingresos" },
          { k: "expense_fixed", label: "Gastos fijos" },
          { k: "expense_variable", label: "Variables" },
          { k: "saving_fixed", label: "Ahorros" },
        ] as const).map((f) => (
          <button key={f.k} onClick={() => setTab(f.k)}
            className={`px-4 h-9 rounded-full text-xs font-semibold whitespace-nowrap transition ${tab === f.k ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-5 mt-4 space-y-2">
        {filtered.map((i) => (
          <motion.div key={i.id} layout className="rounded-2xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-muted flex items-center justify-center text-xl">{emojiFor(i.category)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{i.concept}</p>
                {!i.active && <span className="text-[9px] uppercase font-bold bg-muted px-1.5 py-0.5 rounded">Pausado</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">{TYPE_LABEL[i.type]} • {FREQ_LABEL[i.frequency]}{i.payDay ? ` • día ${i.payDay}` : ""}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${i.type === "income_fixed" ? "text-success" : i.type === "saving_fixed" ? "text-secondary" : "text-destructive"}`}>{fmt(i.amount)}</p>
              <p className="text-[10px] text-muted-foreground">{fmt(monthlyAmount(i))}/mes</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => toggleFixed(i.id)} className="text-muted-foreground hover:text-foreground p-1"><Power className="size-4" /></button>
              <button onClick={() => removeFixed(i.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="px-5 mt-8 space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Aplicación</h2>
        <InfoRow icon={<Smartphone className="size-4" />} title="App nativa Android" desc="Configurada con Capacitor. Sigue las instrucciones para compilar." />
        <InfoRow icon={<Database className="size-4" />} title="Almacenamiento local" desc="Tus datos se guardan en tu dispositivo. Privado y sin nube." />
        <button onClick={() => { if (confirm("¿Borrar todos los datos? No se puede deshacer.")) { resetAll(); toast("Datos borrados"); } }}
          className="w-full rounded-2xl bg-destructive/10 text-destructive p-4 flex items-center gap-3 font-semibold text-sm hover:bg-destructive/15 transition">
          <RotateCcw className="size-4" /> Restablecer todo
        </button>
      </section>
    </div>
  );
}

function InfoRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-start gap-3">
      <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div><p className="font-semibold text-sm">{title}</p><p className="text-xs text-muted-foreground mt-0.5">{desc}</p></div>
    </div>
  );
}

function NewFixedForm({ onSave }: { onSave: (i: { type: ItemType; category: string; concept: string; amount: number; frequency: Frequency; active: boolean; startDate: string; endDate: string; priority: Priority; payDay?: number; note?: string }) => void }) {
  const [type, setType] = useState<ItemType>("expense_fixed");
  const [category, setCategory] = useState("Otros");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [priority, setPriority] = useState<Priority>("medium");
  const [payDay, setPayDay] = useState("");

  const year = new Date().getFullYear();

  return (
    <form onSubmit={(e) => { e.preventDefault(); const a = parseFloat(amount); if (!a || !concept) return;
      onSave({ type, category, concept, amount: a, frequency, active: true, startDate: `${year}-01-01`, endDate: `${year}-12-31`, priority, payDay: payDay ? parseInt(payDay) : undefined });
    }} className="space-y-3">
      <div>
        <Label className="text-xs">Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v as ItemType)}>
          <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="income_fixed">💰 Ingreso fijo</SelectItem>
            <SelectItem value="expense_fixed">🧾 Gasto fijo</SelectItem>
            <SelectItem value="expense_variable">🛍️ Gasto variable</SelectItem>
            <SelectItem value="saving_fixed">🐷 Ahorro fijo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Concepto</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Netflix" className="h-11 rounded-2xl" /></div>
      <div><Label className="text-xs">Categoría</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-2xl" /></div>
      <div><Label className="text-xs">Monto</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-xl font-bold rounded-2xl" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Frecuencia</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
              <SelectItem value="one_time">Una vez</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Prioridad</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs">Día de pago (opcional, 1–28)</Label><Input type="number" min="1" max="28" value={payDay} onChange={(e) => setPayDay(e.target.value)} className="h-11 rounded-2xl" /></div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">Guardar</Button>
    </form>
  );
}
