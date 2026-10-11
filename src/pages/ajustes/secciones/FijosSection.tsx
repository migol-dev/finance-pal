import { memo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  FixedItem,
  ItemType,
  Frequency,
  Priority,
  IconRef,
  PaymentMethod,
  Account,
  CATEGORY_EMOJI,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_EMOJI,
  FREQ_LABEL,
  TYPE_LABEL,
  monthlyAmount,
  iconFor,
  fmt,
  parseDateLocal,
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

const WEEKDAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function toLocalInputDate(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const dt = parseDateLocal(raw);
  if (isNaN(dt.getTime())) return fallback;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function FixedForm({
  initial,
  accounts,
  onSave,
}: {
  initial: FixedItem | null;
  accounts: Account[];
  onSave: (i: Omit<FixedItem, "id">) => void;
}) {
  const cats = Object.keys(CATEGORY_EMOJI);
  const initialFreq: Frequency = initial?.frequency
    ? ((initial.frequency as string) === "annual" ? "yearly" : initial.frequency)
    : "monthly";
  const [type, setType] = useState<ItemType>(initial?.type ?? "expense_fixed");
  const [category, setCategory] = useState(initial?.category ?? "Otros");
  const [concept, setConcept] = useState(initial?.concept ?? "");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [frequency, setFrequency] = useState<Frequency>(initialFreq);
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [payDay, setPayDay] = useState(
    initial?.payDay ? String(initial.payDay) : String(new Date().getDate()),
  );
  const [payWeekDay, setPayWeekDay] = useState(
    initial?.payWeekDay !== undefined ? String(initial.payWeekDay) : String(new Date().getDay()),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [icon, setIcon] = useState<IconRef | undefined>(initial?.icon);
  const pad = (n: number) => String(n).padStart(2, "0");
  const firstDayOfMonth = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-01`;
  const defaultEndDate = `${new Date().getFullYear() + 5}-12-31`;
  const [startDate, setStartDate] = useState(() =>
    toLocalInputDate(initial?.startDate, firstDayOfMonth),
  );
  const [endDate, setEndDate] = useState(() =>
    toLocalInputDate(initial?.endDate, defaultEndDate),
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? "transfer",
  );
  const [accountId, setAccountId] = useState<string>(initial?.accountId ?? "none");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const a = parseFloat(amount);
        if (!Number.isFinite(a) || a <= 0 || !concept.trim()) {
          toast.error("Completa concepto y monto");
          return;
        }
        const rawDay = parseInt(payDay, 10);
        const parsedPayDay = Number.isFinite(rawDay) ? Math.min(31, Math.max(1, rawDay)) : undefined;
        const rawWeekDay = payWeekDay !== "none" ? parseInt(payWeekDay, 10) : NaN;
        const parsedPayWeekDay =
          Number.isFinite(rawWeekDay) && rawWeekDay >= 0 && rawWeekDay <= 6 ? rawWeekDay : undefined;

        const safeStartStr = /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : firstDayOfMonth;
        const safeEndStr = /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : defaultEndDate;
        const startDt = new Date(`${safeStartStr}T12:00:00`);
        const endDt = new Date(`${safeEndStr}T12:00:00`);
        const finalStartISO = isNaN(startDt.getTime())
          ? new Date(`${firstDayOfMonth}T12:00:00`).toISOString()
          : startDt.toISOString();
        const finalEndISO = isNaN(endDt.getTime())
          ? new Date(`${defaultEndDate}T12:00:00`).toISOString()
          : endDt.toISOString();

        onSave({
          type,
          category,
          concept: concept.trim(),
          amount: a,
          frequency,
          active: initial?.active ?? true,
          startDate: finalStartISO,
          endDate: finalEndISO,
          priority,
          payDay: frequency === "weekly" ? undefined : (parsedPayDay ?? new Date().getDate()),
          payWeekDay: frequency === "weekly" ? (parsedPayWeekDay ?? new Date().getDay()) : undefined,
          note: note.trim() || undefined,
          icon,
          paymentMethod,
          accountId: accountId !== "none" ? accountId : undefined,
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
              <SelectItem value="bimonthly">Bimestral</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="fourmonthly">Cuatrimestral</SelectItem>
              <SelectItem value="biannual">Semestral</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
              <SelectItem value="one_time">Una vez</SelectItem>
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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Fecha de inicio</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 rounded-2xl" />
        </div>
        <div>
          <Label className="text-xs">Fecha de fin</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 rounded-2xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
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
          <Label className="text-xs">Cuenta asociada</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Automática</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
  const { fixedItems, accounts, addFixed, updateFixed, removeFixed, toggleFixed } = useFinanceData();
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
            const mAmount = monthlyAmount(item);
            const freqLabel =
              FREQ_LABEL[item.frequency] ??
              ((item.frequency as string) === "annual" ? "Anual" : item.frequency);
            return (
              <div
                key={item.id}
                className="rounded-2xl bg-card border border-border p-4 shadow-soft flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconDisplay icon={iconFor(item)} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-foreground truncate">{item.concept}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        {freqLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {TYPE_LABEL[item.type]} • {fmt(item.amount)} ({fmt(mAmount)}/mes)
                      {item.frequency === "weekly" && typeof item.payWeekDay === "number"
                        ? ` • ${WEEKDAY_NAMES[item.payWeekDay]}`
                        : item.payDay
                        ? ` • Día ${item.payDay}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between min-[380px]:justify-end gap-2 shrink-0 w-full min-[380px]:w-auto pt-2 min-[380px]:pt-0 border-t min-[380px]:border-t-0 border-border/50">
                  <Switch
                    checked={item.active}
                    onCheckedChange={() => toggleFixed(item.id)}
                    aria-label={`Alternar estado activo de ${item.concept}`}
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(item)}
                      className="size-9 min-[380px]:size-8 p-0 rounded-xl"
                      aria-label={`Editar ${item.concept}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(item)}
                      className="size-9 min-[380px]:size-8 p-0 rounded-xl text-destructive hover:bg-destructive/10"
                      aria-label={`Eliminar ${item.concept}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="rounded-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar concepto fijo" : "Nuevo concepto fijo"}</DialogTitle>
            <DialogDescription className="sr-only">Formulario para crear o editar un concepto fijo</DialogDescription>
          </DialogHeader>
          <FixedForm
            initial={editing}
            accounts={accounts}
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
