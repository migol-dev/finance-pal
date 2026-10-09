import { memo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  FixedItem,
  ItemType,
  Frequency,
  Priority,
  IconRef,
  PaymentMethod,
  CATEGORY_EMOJI,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_EMOJI,
  FREQ_LABEL,
  TYPE_LABEL,
  monthlyAmount,
  fmt,
} from "@/lib/finance";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, CalendarClock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

function FixedForm({
  initial,
  onSave,
}: {
  initial: FixedItem | null;
  onSave: (i: Omit<FixedItem, "id">) => void;
}) {
  const cats = Object.keys(CATEGORY_EMOJI);
  const [type, setType] = useState<ItemType>(initial?.type ?? "expense_fixed");
  const [category, setCategory] = useState(initial?.category ?? "Otros");
  const [concept, setConcept] = useState(initial?.concept ?? "");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "monthly");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [payDay, setPayDay] = useState(initial?.payDay ? String(initial.payDay) : "");
  const [payWeekDay, setPayWeekDay] = useState(initial?.payWeekDay !== undefined ? String(initial.payWeekDay) : "none");
  const [note, setNote] = useState(initial?.note ?? "");
  const [icon, setIcon] = useState<IconRef | undefined>(initial?.icon);
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayLocal = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? todayLocal);
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? `${new Date().getFullYear() + 5}-12-31`);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "transfer");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const a = parseFloat(amount);
        if (!a || !concept) {
          toast.error("Completa concepto y monto");
          return;
        }
        onSave({
          type,
          category,
          concept,
          amount: a,
          frequency,
          active: initial?.active ?? true,
          startDate: new Date(`${startDate}T12:00:00`).toISOString(),
          endDate: new Date(`${endDate}T12:00:00`).toISOString(),
          priority,
          payDay: payDay ? parseInt(payDay) : undefined,
          payWeekDay: payWeekDay !== "none" ? parseInt(payWeekDay) : undefined,
          note: note || undefined,
          icon,
          paymentMethod,
        });
      }}
      className="space-y-3"
    >
      <div className="flex justify-center">
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      <div>
        <Label className="text-xs">Tipo de concepto</Label>
        <Select value={type} onValueChange={(v) => setType(v as ItemType)}>
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="income_fixed">💰 Ingreso fijo</SelectItem>
            <SelectItem value="expense_fixed">🧾 Gasto fijo</SelectItem>
            <SelectItem value="expense_variable">🛍️ Gasto variable</SelectItem>
            <SelectItem value="saving_fixed">🐷 Ahorro fijo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Concepto</Label>
        <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej. Netflix o Renta" className="h-11 rounded-2xl" />
      </div>
      <div>
        <Label className="text-xs">Categoría</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cats.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_EMOJI[c]} {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Monto</Label>
        <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-xl font-bold rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Frecuencia</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="biweekly">Quincenal</SelectItem>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="annual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Prioridad</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Día del mes (1-31)</Label>
          <Input type="number" min="1" max="31" value={payDay} onChange={(e) => setPayDay(e.target.value)} placeholder="Ej. 15" className="h-11 rounded-2xl" />
        </div>
        <div>
          <Label className="text-xs">Día de semana</Label>
          <Select value={payWeekDay} onValueChange={setPayWeekDay}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No aplica</SelectItem>
              <SelectItem value="1">Lunes</SelectItem>
              <SelectItem value="2">Martes</SelectItem>
              <SelectItem value="3">Miércoles</SelectItem>
              <SelectItem value="4">Jueves</SelectItem>
              <SelectItem value="5">Viernes</SelectItem>
              <SelectItem value="6">Sábado</SelectItem>
              <SelectItem value="0">Domingo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Método de pago habitual</Label>
        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["transfer", "cash", "card", "other"] as PaymentMethod[]).map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_EMOJI[m]} {PAYMENT_METHOD_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Nota adicional</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" className="h-11 rounded-2xl" />
      </div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">
        {initial ? "Guardar cambios" : "Crear concepto fijo"}
      </Button>
    </form>
  );
}

export const FijosSection = memo(function FijosSection({ onBack }: SectionProps) {
  const { fixedItems, addFixed, updateFixed, removeFixed, toggleFixed } = useFinanceData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedItem | null>(null);
  const [tab, setTab] = useState<"all" | ItemType>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<FixedItem | null>(null);

  const filtered = fixedItems.filter((i) => tab === "all" || i.type === tab);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (i: FixedItem) => { setEditing(i); setOpen(true); };

  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Conceptos Fijos"
        description="Configura ingresos periódicos, suscripciones y gastos recurrentes para proyecciones"
        icon={CalendarClock}
        iconColorClass="bg-violet-500/10 text-violet-500"
        onBack={onBack}
      />

      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Listado recurrente</h2>
        <Button
          size="sm"
          onClick={openNew}
          className="rounded-xl h-9 text-xs font-semibold gradient-primary text-primary-foreground border-0"
        >
          <Plus className="size-3.5 mr-1.5" /> Nuevo concepto
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(
          [
            { k: "all", label: "Todos" },
            { k: "income_fixed", label: "Ingresos" },
            { k: "expense_fixed", label: "Gastos fijos" },
            { k: "expense_variable", label: "Variables" },
            { k: "saving_fixed", label: "Ahorros" },
          ] as const
        ).map((f) => (
          <button
            key={f.k}
            onClick={() => setTab(f.k)}
            className={`px-3.5 h-8.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              tab === f.k ? "gradient-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center shadow-soft">
            <p className="text-sm text-muted-foreground">No hay conceptos fijos en esta categoría.</p>
            <Button onClick={openNew} variant="outline" className="rounded-xl text-xs mt-3">
              <Plus className="size-3.5 mr-1.5" /> Agregar primero
            </Button>
          </div>
        ) : (
          filtered.map((item) => {
            const mAmount = monthlyAmount(item.amount, item.frequency);
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-2xl bg-muted/70 text-foreground flex items-center justify-center shrink-0">
                    {item.icon ? <IconDisplay icon={item.icon} className="size-5.5" /> : <span>{CATEGORY_EMOJI[item.category] ?? "📄"}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-foreground truncate">{item.concept}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {FREQ_LABEL[item.frequency]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {TYPE_LABEL[item.type]} • {fmt(item.amount)} ({fmt(mAmount)}/mes)
                      {item.payDay && ` • Día ${item.payDay}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={item.active}
                    onCheckedChange={() => toggleFixed(item.id)}
                    aria-label={`Alternar estado activo de ${item.concept}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(item)}
                    className="size-8 p-0 rounded-xl"
                    aria-label={`Editar ${item.concept}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteConfirm(item)}
                    className="size-8 p-0 rounded-xl text-destructive hover:bg-destructive/10"
                    aria-label={`Eliminar ${item.concept}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar concepto fijo" : "Nuevo concepto fijo"}</DialogTitle>
            <DialogDescription className="sr-only">Formulario para crear o editar un concepto fijo</DialogDescription>
          </DialogHeader>
          <FixedForm
            initial={editing}
            onSave={(i) => {
              if (editing) {
                updateFixed(editing.id, i);
                toast.success("Concepto actualizado");
              } else {
                addFixed(i);
                toast.success("Concepto agregado");
              }
              setOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ElegantConfirm
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
        title="¿Eliminar concepto recurrente?"
        description={
          <span className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar <span className="font-bold text-foreground">"{deleteConfirm?.concept}"</span>? Dejará de proyectarse en tu presupuesto.
          </span>
        }
        onConfirm={() => {
          if (deleteConfirm) {
            removeFixed(deleteConfirm.id);
            setDeleteConfirm(null);
            toast.success("Concepto eliminado");
          }
        }}
        icon={Trash2}
        iconColor="bg-destructive"
        confirmText="Sí, eliminar"
      />
    </div>
  );
});

export default FijosSection;
