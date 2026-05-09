import { useMemo, useState } from "react";
import { useFinance } from "@/store/finance-store";
import { fmt, iconFor, IconRef, Debt, PaymentMethod, PAYMENT_METHOD_LABEL, PAYMENT_METHOD_EMOJI, fmtDate } from "@/lib/finance";

const localDateNow = () => { const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
import { Header } from "@/components/app/Header";
import { Plus, Pencil, Trash2, HandCoins, CheckCircle2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "@/lib/framer";
import { toast } from "sonner";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";

function totalPaid(d: Debt) { return d.payments.reduce((a, p) => a + p.amount, 0); }

export default function Deudas() {
  const { debts, addDebt, updateDebt, removeDebt, addDebtPayment, removeDebtPayment } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [payOpen, setPayOpen] = useState<Debt | null>(null);
  const [detail, setDetail] = useState<Debt | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "settled">("all");
  const [query, setQuery] = useState("");
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  const totals = useMemo(() => {
    let owed = 0, paid = 0;
    debts.forEach((d) => { owed += d.amount; paid += totalPaid(d); });
    return { owed, paid, pending: owed - paid };
  }, [debts]);

  /** Aggregate by person */
  const perPerson = useMemo(() => {
    const map = new Map<string, { person: string; total: number; paid: number; pending: number; count: number; settled: number }>();
    debts.forEach((d) => {
      const key = d.person.trim().toLowerCase();
      const cur = map.get(key) ?? { person: d.person, total: 0, paid: 0, pending: 0, count: 0, settled: 0 };
      const p = totalPaid(d);
      cur.total += d.amount; cur.paid += p; cur.pending += d.amount - p; cur.count += 1;
      if (d.amount - p <= 0.0001) cur.settled += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.pending - a.pending);
  }, [debts]);

  const visible = useMemo(() => debts.filter((d) => {
    const paid = totalPaid(d);
    const settled = d.amount - paid <= 0.0001;
    if (filter === "pending" && settled) return false;
    if (filter === "settled" && !settled) return false;
    if (personFilter && d.person.trim().toLowerCase() !== personFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!d.person.toLowerCase().includes(q) && !d.concept.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [debts, filter, personFilter, query]);

  return (
    <div>
      <Header title="Me deben" subtitle="Rastrea quién te debe dinero" action={
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow h-11"><Plus className="size-4 mr-1" />Nueva</Button>
      } />

      <div className="px-5 grid grid-cols-3 gap-2">
        <SumCard label="Total" value={fmt(totals.owed)} tone="primary" />
        <SumCard label="Cobrado" value={fmt(totals.paid)} tone="success" />
        <SumCard label="Pendiente" value={fmt(totals.pending)} tone="warning" />
      </div>

      {perPerson.length > 0 && (
        <section className="px-5 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Por persona</h2>
            {personFilter && (
              <button onClick={() => setPersonFilter(null)} className="text-[11px] text-primary font-semibold">Limpiar filtro</button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {perPerson.map((p) => {
              const key = p.person.trim().toLowerCase();
              const active = personFilter === key;
              const allSettled = p.settled === p.count;
              return (
                <button key={key} onClick={() => setPersonFilter(active ? null : key)}
                  className={`shrink-0 rounded-2xl border-2 p-3 min-w-[160px] text-left transition ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-glow"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm truncate flex-1">{p.person}</p>
                    {allSettled && <CheckCircle2 className={`size-3.5 shrink-0 ${active ? "text-primary-foreground" : "text-success"}`} />}
                  </div>
                  <p className={`text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.count} deuda{p.count !== 1 ? "s" : ""}</p>
                  <div className="mt-1.5 space-y-0.5">
                    <div className="flex justify-between text-[11px]"><span className={active ? "text-primary-foreground/80" : "text-muted-foreground"}>Pendiente</span><span className="font-extrabold">{fmt(p.pending)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className={active ? "text-primary-foreground/80" : "text-muted-foreground"}>Prestado</span><span className="font-semibold">{fmt(p.total)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className={active ? "text-primary-foreground/80" : "text-muted-foreground"}>Abonos</span><span className={`font-semibold ${active ? "text-primary-foreground" : "text-success"}`}>{fmt(p.paid)}</span></div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="px-5 mt-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar persona o concepto..." className="pl-9 h-11 rounded-2xl bg-card border-border" />
        </div>
        <div className="flex gap-2">
          {([
            { k: "all", label: "Todas" },
            { k: "pending", label: "Pendientes" },
            { k: "settled", label: "Saldadas" },
          ] as const).map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={`flex-1 h-9 rounded-full text-xs font-bold transition ${
                filter === f.k
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar deuda" : "Nueva deuda"}</DialogTitle></DialogHeader>
            <DialogDescription className="sr-only">Formulario para registrar o editar una deuda</DialogDescription>
          <DebtForm initial={editing} onSave={(d) => {
            if (editing) { updateDebt(editing.id, d); toast.success("Actualizado"); }
            else { addDebt(d); toast.success("Deuda registrada"); }
            setOpen(false); setEditing(null);
          }} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!payOpen} onOpenChange={(v) => { if (!v) setPayOpen(null); }}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Registrar abono</DialogTitle></DialogHeader>
          <DialogDescription className="sr-only">Formulario para registrar un abono a la deuda</DialogDescription>
          {payOpen && <PaymentForm debt={payOpen} onSave={(p) => { addDebtPayment(payOpen.id, p); toast.success("Abono registrado"); setPayOpen(null); }} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(v) => { if (!v) setDetail(null); }}>
        <DialogContent className="rounded-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historial de abonos</DialogTitle></DialogHeader>
          <DialogDescription className="sr-only">Listado de abonos registrados para esta deuda</DialogDescription>
          {detail && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{detail.person} • {detail.concept}</p>
              {detail.payments.length === 0 && <p className="text-sm text-center py-6 text-muted-foreground">Sin abonos aún</p>}
              {detail.payments.map((p) => (
                <div key={p.id} className="rounded-2xl bg-muted p-3 flex items-center gap-3">
                  <span className="text-2xl">{PAYMENT_METHOD_EMOJI[p.paymentMethod ?? "other"]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{fmt(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.date)} • {PAYMENT_METHOD_LABEL[p.paymentMethod ?? "other"]}</p>
                    {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                  </div>
                  <button onClick={() => { if (confirm("¿Eliminar abono?")) { removeDebtPayment(detail.id, p.id); setDetail({ ...detail, payments: detail.payments.filter((x) => x.id !== p.id) }); } }} className="text-destructive p-1"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="px-5 mt-4 space-y-3">
        {debts.length === 0 && (
          <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-8 text-center">
            <p className="text-4xl mb-2">🤝</p>
            <p className="text-sm text-muted-foreground">Aún no hay deudas registradas</p>
          </div>
        )}
        {debts.length > 0 && visible.length === 0 && (
          <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No hay deudas con ese filtro</p>
          </div>
        )}
        {visible.map((d) => {
          const paid = totalPaid(d);
          const pct = d.amount > 0 ? Math.min(100, (paid / d.amount) * 100) : 0;
          const pending = d.amount - paid;
          const settled = pending <= 0.0001;
          return (
            <motion.div key={d.id} layout className={`rounded-3xl border p-4 shadow-soft transition ${settled ? "bg-success/10 border-success/50" : "bg-card border-border"}`}>
              <div className="flex items-center gap-3">
                <IconDisplay icon={iconFor({ icon: d.icon, category: "Otros" })} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-bold truncate ${settled ? "line-through text-muted-foreground" : "text-foreground"}`}>{d.person}</p>
                    {settled && <span className="shrink-0 text-[9px] uppercase font-bold bg-success text-success-foreground px-2 py-0.5 rounded-full flex items-center gap-0.5"><CheckCircle2 className="size-2.5" />Saldada</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{d.concept}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => { setEditing(d); setOpen(true); }} className="text-muted-foreground hover:text-primary p-1"><Pencil className="size-4" /></button>
                  <button onClick={() => { if (confirm(`¿Eliminar deuda de ${d.person}?`)) removeDebt(d.id); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-extrabold">{fmt(pending)}</p>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden mt-1.5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full gradient-success rounded-full" />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                  <span>Pagado {fmt(paid)}</span>
                  <span>de {fmt(d.amount)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button disabled={settled} onClick={() => setPayOpen(d)} className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground border-0 font-bold text-sm disabled:opacity-50"><HandCoins className="size-4 mr-1" />{settled ? "Saldada" : "Registrar abono"}</Button>
                <Button variant="secondary" onClick={() => setDetail(d)} className="h-10 rounded-xl text-sm">Ver ({d.payments.length})</Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SumCard({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" }) {
  const map = { primary: "gradient-primary", success: "gradient-success", warning: "gradient-sunset" };
  return (
    <div className={`rounded-2xl p-3 text-primary-foreground shadow-pop ${map[tone]}`}>
      <p className="text-[10px] uppercase font-bold opacity-90">{label}</p>
      <p className="text-sm font-extrabold mt-0.5 truncate">{value}</p>
    </div>
  );
}

function DebtForm({ initial, onSave }: { initial: Debt | null; onSave: (d: Omit<Debt, "id" | "payments">) => void }) {
  const [person, setPerson] = useState(initial?.person ?? "");
  const [concept, setConcept] = useState(initial?.concept ?? "");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? localDateNow());
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [icon, setIcon] = useState<IconRef | undefined>(initial?.icon);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const a = parseFloat(amount);
      if (!a || !person) { toast.error("Completa nombre y monto"); return; }
      onSave({ person, concept: concept || "Préstamo", amount: a, date: new Date(`${date}T12:00:00`).toISOString(), dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined, note: note || undefined, icon });
    }} className="space-y-3">
      <div className="flex justify-center"><IconPicker value={icon} onChange={setIcon} /></div>
      <div><Label className="text-xs">Persona</Label><Input autoFocus value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Ej. Juan" className="h-11 rounded-2xl" /></div>
      <div><Label className="text-xs">Concepto</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Préstamo viaje" className="h-11 rounded-2xl" /></div>
      <div><Label className="text-xs">Monto</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-xl font-bold rounded-2xl" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl" /></div>
        <div><Label className="text-xs">Vence (opcional)</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11 rounded-2xl" /></div>
      </div>
      <div><Label className="text-xs">Nota</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-11 rounded-2xl" /></div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">{initial ? "Guardar cambios" : "Registrar"}</Button>
    </form>
  );
}

function PaymentForm({ debt, onSave }: { debt: Debt; onSave: (p: { amount: number; date: string; note?: string; paymentMethod?: PaymentMethod }) => void }) {
  const pending = debt.amount - totalPaid(debt);
  const [amount, setAmount] = useState(String(pending > 0 ? pending : ""));
  const [date, setDate] = useState(localDateNow());
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const a = parseFloat(amount);
      if (!a) { toast.error("Ingresa el monto"); return; }
      onSave({ amount: a, date: new Date(`${date}T12:00:00`).toISOString(), note: note || undefined, paymentMethod });
    }} className="space-y-3">
      <p className="text-xs text-muted-foreground">Pendiente: <span className="font-bold text-foreground">{fmt(pending)}</span></p>
      <div><Label className="text-xs">Monto</Label><Input autoFocus type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-xl font-bold rounded-2xl" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl" /></div>
        <div>
          <Label className="text-xs">Método</Label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((k) => (
                <SelectItem key={k} value={k}>{PAYMENT_METHOD_EMOJI[k]} {PAYMENT_METHOD_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-xs">Nota</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-11 rounded-2xl" /></div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">Guardar abono</Button>
    </form>
  );
}