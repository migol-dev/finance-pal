import { useEffect, useMemo, useState } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, CATEGORY_EMOJI, MONTHS, iconFor, IconRef, Transaction } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Plus, Trash2, Search, Pencil } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { IconDisplay } from "@/components/app/IconDisplay";
import { IconPicker } from "@/components/app/IconPicker";

type TxType = "income" | "expense" | "saving";

export default function Movimientos() {
  const { transactions, addTx, updateTx, removeTx, activeYear, activeMonth } = useFinance();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [type, setType] = useState<TxType>("expense");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TxType>("all");

  useEffect(() => {
    const n = params.get("new");
    if (n === "income" || n === "expense" || n === "saving") {
      setType(n as TxType); setEditing(null); setOpen(true);
      params.delete("new"); setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const inMonth = useMemo(() => transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === activeYear && d.getMonth() === activeMonth;
  }), [transactions, activeYear, activeMonth]);

  const filtered = useMemo(() => inMonth
    .filter((t) => filter === "all" || t.type === filter)
    .filter((t) => !query || t.concept.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase())),
    [inMonth, filter, query]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    filtered.forEach((t) => {
      const k = new Date(t.date).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
      (g[k] ||= []).push(t);
    });
    return g;
  }, [filtered]);

  const openEdit = (t: Transaction) => { setEditing(t); setType(t.type); setOpen(true); };
  const openNew = () => { setEditing(null); setOpen(true); };

  return (
    <div>
      <Header title="Movimientos" subtitle={`${MONTHS[activeMonth]} ${activeYear}`} action={
        <Button onClick={openNew} className="rounded-2xl gradient-primary text-primary-foreground shadow-glow border-0 h-11"><Plus className="size-4 mr-1" />Nuevo</Button>
      } />

      <div className="px-5 mb-3 flex justify-center"><MonthSwitcher /></div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle></DialogHeader>
          <TxForm
            initial={editing ?? { type, date: new Date(activeYear, activeMonth, Math.min(new Date().getDate(), 28)).toISOString() }}
            onSave={(t) => {
              if (editing) { updateTx(editing.id, t); toast.success("Actualizado"); }
              else { addTx(t as Omit<Transaction, "id">); toast.success("Movimiento agregado"); }
              setOpen(false); setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="px-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar concepto o categoría..." className="pl-9 h-11 rounded-2xl bg-card border-border" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { k: "all", label: "Todo" },
            { k: "expense", label: "Gastos" },
            { k: "income", label: "Ingresos" },
            { k: "saving", label: "Ahorros" },
          ].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k as typeof filter)}
              className={`px-4 h-9 rounded-full text-xs font-semibold whitespace-nowrap transition ${filter === f.k ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">
        {Object.keys(grouped).length === 0 && (
          <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-8 text-center">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm text-muted-foreground">Sin movimientos en {MONTHS[activeMonth]} {activeYear}</p>
          </div>
        )}
        <AnimatePresence>
          {Object.entries(grouped).map(([day, items]) => (
            <motion.section key={day} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">{day}</p>
              <div className="space-y-2">
                {items.map((t) => (
                  <motion.div key={t.id} layout className="rounded-2xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
                    <IconDisplay icon={iconFor(t)} />
                    <button onClick={() => openEdit(t)} className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-sm truncate">{t.concept}</p>
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    </button>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${t.type === "income" ? "text-success" : t.type === "saving" ? "text-secondary" : "text-destructive"}`}>
                        {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => openEdit(t)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="size-4" /></button>
                      <button onClick={() => { if (confirm("¿Eliminar este movimiento?")) { removeTx(t.id); toast("Eliminado"); } }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TxForm({ initial, onSave }: { initial: Partial<Transaction> & { type: TxType }; onSave: (t: Omit<Transaction, "id">) => void }) {
  const [type, setType] = useState<TxType>(initial.type);
  const [category, setCategory] = useState(initial.category ?? "Otros");
  const [concept, setConcept] = useState(initial.concept ?? "");
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : "");
  const [date, setDate] = useState((initial.date ?? new Date().toISOString()).slice(0, 10));
  const [note, setNote] = useState(initial.note ?? "");
  const [icon, setIcon] = useState<IconRef | undefined>(initial.icon);
  const cats = Object.keys(CATEGORY_EMOJI);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const a = parseFloat(amount);
      if (!a || !concept) { toast.error("Completa monto y concepto"); return; }
      onSave({ type, category, concept, amount: a, date: new Date(date).toISOString(), note: note || undefined, icon });
    }} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {(["expense", "income", "saving"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`h-12 rounded-2xl text-sm font-semibold capitalize transition ${type === t ? (t === "income" ? "gradient-success text-white" : t === "saving" ? "gradient-ocean text-white" : "gradient-primary text-white") + " shadow-glow" : "bg-muted text-muted-foreground"}`}>
            {t === "income" ? "Ingreso" : t === "saving" ? "Ahorro" : "Gasto"}
          </button>
        ))}
      </div>
      <div className="flex justify-center"><IconPicker value={icon} onChange={setIcon} /></div>
      <div>
        <Label className="text-xs">Monto</Label>
        <Input autoFocus type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-14 text-2xl font-bold rounded-2xl" />
      </div>
      <div>
        <Label className="text-xs">Concepto</Label>
        <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Café con amigos" className="h-11 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Categoría</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {cats.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Fecha</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Nota (opcional)</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalles..." className="h-11 rounded-2xl" />
      </div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">Guardar</Button>
    </form>
  );
}
