import { useState, useMemo } from "react";
import {
  X,
  ExternalLink,
  CalendarDays,
  Star,
  Pencil,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "@/lib/framer";
import { toast } from "sonner";
import { IconDisplay } from "@/components/app/IconDisplay";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import { PillTabs } from "@/components/app/PillTabs";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SimpleAreaChart from "@/components/ui/SimpleAreaChart";
import {
  fmt,
  fmt2,
  fmtDate,
  parseGoalDeadline,
  iconFor,
  Goal,
  Account,
} from "@/lib/finance";
import { cn } from "@/lib/utils";
import {
  startOfDay,
  daysBetween,
  ymd,
  normalizeUrl,
  paceFor,
  actualAt,
  statusFor,
} from "./types";

interface GoalDetailContentProps {
  goal: Goal;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onContribute: (amount: number, date?: string, accountId?: string) => void;
  onTogglePin: () => void;
  accounts: Account[];
}

export function GoalDetailContent({
  goal,
  onClose,
  onEdit,
  onDelete,
  onContribute,
  onTogglePin,
  accounts,
}: GoalDetailContentProps) {
  const [tab, setTab] = useState<"resumen" | "calendario" | "simular">("resumen");
  const [confirmOpen, setConfirmOpen] = useState<{ amount: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const status = statusFor(goal);
  const url = normalizeUrl(goal.purchaseUrl);
  const parsedDeadline = parseGoalDeadline(goal.deadline);

  const handleQuickAdd = (amount: number) => {
    setConfirmOpen({ amount });
  };

  return (
    <div className={cn("h-full w-full overflow-y-auto no-scrollbar rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 text-white relative", goal.color)}>
      {/* Single, accessible close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar detalles"
        className="absolute top-4 right-4 size-11 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-md z-20 transition active:scale-95 focus:outline-none"
      >
        <X className="size-5" />
      </button>

      <div className="pb-8">
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 pr-14 min-w-0">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir link de compra de ${goal.name}`}
              className="relative group active:scale-95 transition shrink-0"
            >
              <IconDisplay icon={iconFor(goal)} size="lg" className="bg-white/20 ring-4 ring-white/10" />
              <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-white text-foreground flex items-center justify-center shadow-lg">
                <ExternalLink className="size-3.5" />
              </span>
            </a>
          ) : (
            <IconDisplay icon={iconFor(goal)} size="lg" className="bg-white/20 shadow-xl shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-black truncate leading-tight">{goal.name}</h2>
            <p className="text-xs font-bold opacity-80 flex items-center gap-1.5 mt-0.5">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>{parsedDeadline ? fmtDate(parsedDeadline) : "Sin fecha límite"}</span>
            </p>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-[28px] p-5 sm:p-6 mb-4 border border-white/10 shadow-soft">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <p className="text-3xl sm:text-4xl font-black tabular-nums break-words">{fmt(goal.saved)}</p>
            <p className="text-sm font-bold opacity-75 tabular-nums">de {fmt(goal.target)}</p>
          </div>
          <div className="h-3 rounded-full bg-black/20 overflow-hidden mb-2 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2 }}
              className="h-full bg-white rounded-full shadow-glow"
            />
          </div>
          <div className="flex justify-between items-center text-xs">
            <p className="font-black tabular-nums">{pct.toFixed(1)}%</p>
            <StatusBanner status={status} />
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button
            type="button"
            onClick={onTogglePin}
            aria-label={goal.pinned ? "Desanclar meta de destacados" : "Fijar meta como destacada"}
            className={cn(
              "h-12 sm:h-14 rounded-2xl flex items-center justify-center transition active:scale-90",
              goal.pinned ? "bg-white text-foreground" : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            <Star className={cn("size-5 sm:size-6", goal.pinned ? "fill-current" : "")} />
          </button>
          <button
            type="button"
            aria-label="Editar meta"
            onClick={onEdit}
            className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition text-white"
          >
            <Pencil className="size-5 sm:size-6" />
          </button>
          <button
            type="button"
            aria-label="Eliminar meta"
            onClick={() => setDeleteConfirm(true)}
            className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center active:scale-90 transition text-white"
          >
            <Trash2 className="size-5 sm:size-6" />
          </button>
          <ContribCustom onAdd={(v, acc) => onContribute(v, undefined, acc)} accounts={accounts} />
        </div>

        {/* Quick Add Row */}
        <div className="flex gap-2 mb-5">
          <ContributeBtn label="+ $100" onClick={() => handleQuickAdd(100)} />
          <ContributeBtn label="+ $500" onClick={() => handleQuickAdd(500)} />
          <ContribCustom negative onAdd={(v, acc) => onContribute(-v, undefined, acc)} accounts={accounts} />
        </div>

        {/* Confirmations */}
        <ElegantConfirm
          open={!!confirmOpen}
          onOpenChange={(v) => !v && setConfirmOpen(null)}
          title="¿Confirmar aporte?"
          description={
            <span className="text-sm text-muted-foreground block">
              Vas a añadir <span className="font-bold text-foreground">{fmt(confirmOpen?.amount ?? 0)}</span> a tu meta <span className="font-bold text-foreground">"{goal.name}"</span>.
            </span>
          }
          onConfirm={() => {
            if (confirmOpen) {
              const defaultAccountId = accounts[0]?.id;
              onContribute(confirmOpen.amount, undefined, defaultAccountId);
            }
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
          description={
            <span className="text-sm text-muted-foreground">
              ¿Estás seguro de que quieres eliminar <span className="font-bold text-foreground">"{goal.name}"</span>? Esta acción no se puede deshacer.
            </span>
          }
          onConfirm={onDelete}
          icon={Trash2}
          iconColor="bg-destructive"
        />

        {/* Tabs */}
        <PillTabs<"resumen" | "calendario" | "simular">
          className="mb-4 bg-black/15 p-1 rounded-2xl"
          ariaLabel={`Vistas de meta ${goal.name}`}
          tabs={["resumen", "calendario", "simular"]}
          value={tab}
          onChange={setTab}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "resumen" && <ResumenTab goal={goal} />}
            {tab === "calendario" && <CalendarioTab goal={goal} onContribute={onContribute} accounts={accounts} />}
            {tab === "simular" && <SimularTab goal={goal} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatusBanner({ status }: { status: ReturnType<typeof statusFor> }) {
  if (!status) return null;
  if (status.kind === "done") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-0.5">
        <CheckCircle2 className="size-3.5 shrink-0" />
        <span className="text-[10px] font-bold">🎉 Cumplida</span>
      </div>
    );
  }
  if (status.kind === "behind") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-destructive/40 ring-1 ring-white/40 px-2.5 py-0.5 animate-pulse">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span className="text-[10px] font-bold">Atrasado</span>
      </div>
    );
  }
  if (status.kind === "ahead") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-0.5">
        <Sparkles className="size-3.5 shrink-0" />
        <span className="text-[10px] font-bold">¡Adelantado!</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5">
      <CheckCircle2 className="size-3.5 shrink-0" />
      <span className="text-[10px] font-bold">Al ritmo</span>
    </div>
  );
}

function ResumenTab({ goal }: { goal: Goal }) {
  const pace = paceFor(goal);
  const data = useMemo(() => {
    const parsedDl = parseGoalDeadline(goal.deadline);
    if (!parsedDl) return [] as { label: string; ideal: number; actual: number | null }[];
    const start = startOfDay(new Date(goal.createdAt ?? new Date().toISOString()));
    const dl = startOfDay(parsedDl);
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
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-3.5 space-y-3">
      {pace && pace.remaining > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <PaceBox label="Por día" value={fmt2(pace.perDay)} />
            <PaceBox label="Por semana" value={fmt2(pace.perWeek)} />
            <PaceBox label="Por mes" value={fmt2(pace.perMonth)} />
          </div>
          <p className="text-[10px] text-center opacity-80 tabular-nums">
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
        <p className="text-[11px] text-center opacity-80 py-2">
          Añade una fecha límite para ver el plan recomendado y el gráfico.
        </p>
      )}
    </div>
  );
}

function CalendarioTab({
  goal,
  onContribute,
  accounts,
}: {
  goal: Goal;
  onContribute: (amount: number, date?: string, accountId?: string) => void;
  accounts: Account[];
}) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | undefined>(accounts[0]?.id);
  const pace = paceFor(goal);

  const contribsByDay = useMemo(() => {
    const m = new Map<string, number>();
    (goal.contributions ?? []).forEach((c) => {
      const k = ymd(startOfDay(new Date(c.date)));
      m.set(k, (m.get(k) ?? 0) + c.amount);
    });
    return m;
  }, [goal.contributions]);

  const contribDays = useMemo(
    () => Array.from(contribsByDay.keys()).map((k) => new Date(`${k}T12:00:00`)),
    [contribsByDay]
  );

  const recommended = pace?.perDay ?? 0;
  const dayKey = selected ? ymd(startOfDay(selected)) : null;
  const dayContrib = dayKey ? contribsByDay.get(dayKey) ?? 0 : 0;

  return (
    <div className="rounded-2xl bg-card text-card-foreground p-3.5 space-y-3 shadow-soft">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        modifiers={{ contributed: contribDays }}
        modifiersClassNames={{ contributed: "ring-2 ring-success rounded-md font-bold" }}
        className="p-0 pointer-events-auto mx-auto"
      />
      {selected && (
        <div className="rounded-xl bg-muted p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">{fmtDate(selected)}</span>
            {dayContrib > 0 && <span className="text-success font-bold">+{fmt(dayContrib)}</span>}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Recomendado:</span>
            <span className="font-bold text-foreground tabular-nums">{recommended > 0 ? fmt2(recommended) : "—"}</span>
          </div>
          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cuenta origen</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 rounded-xl mt-1 text-xs">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={recommended > 0 ? recommended.toFixed(0) : "Monto"}
              className="h-10 rounded-xl"
            />
            <Button
              type="button"
              onClick={() => {
                const v = parseFloat(amount) || recommended;
                if (!v) { toast.error("Ingresa un monto"); return; }
                const d = new Date(selected);
                d.setHours(12, 0, 0, 0);
                onContribute(v, d.toISOString(), accountId);
                setAmount("");
                toast.success(`Aporte de ${fmt(v)} registrado`);
              }}
              className="h-10 rounded-xl gradient-primary text-primary-foreground border-0 font-bold shrink-0"
            >
              <Plus className="size-4 mr-1" />
              <span>Registrar</span>
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
    const parsedDl = parseGoalDeadline(goal.deadline);
    if (!parsedDl) return [] as any[];
    const start = startOfDay(new Date(goal.createdAt ?? new Date().toISOString()));
    const dl = startOfDay(parsedDl);
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
        simulado: Math.round(Math.min(sim, goal.target * 2)),
      });
    }
    return arr;
  }, [goal, perDay]);

  const projection = useMemo(() => {
    const today = startOfDay(new Date());
    const parsedDl = parseGoalDeadline(goal.deadline);
    if (!parsedDl) return null;
    const dl = startOfDay(parsedDl);
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
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm p-3.5 space-y-3">
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span>Aporte por día</span>
          <span className="font-extrabold tabular-nums">{fmt2(perDay)}</span>
        </div>
        <Slider
          min={0}
          max={Math.max(1000, Math.round((recommended || 100) * 4))}
          step={10}
          value={[perDay]}
          onValueChange={(v) => setPerDay(v[0])}
          className="mt-2"
        />
        {recommended > 0 && (
          <p className="text-[10px] opacity-80 mt-1 tabular-nums">Recomendado: {fmt2(recommended)} / día</p>
        )}
      </div>

      {projection && (
        <div className="rounded-xl bg-white/20 p-2.5 text-[11px] space-y-0.5">
          <div className="flex justify-between">
            <span>Proyección a la fecha límite:</span>
            <span className="font-bold tabular-nums">{fmt(projection.projected)}</span>
          </div>
          {projection.surplus >= 0 ? (
            <p className="font-bold">
              ✅ Llegas {projection.hitDate ? `el ${fmtDate(projection.hitDate)}` : "a tiempo"} con {fmt(projection.surplus)} extra
            </p>
          ) : (
            <p className="font-bold">⚠️ Te faltarán {fmt(Math.abs(projection.surplus))}</p>
          )}
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
      <p className="text-micro uppercase tracking-wide opacity-80 truncate">{label}</p>
      <p className="text-xs font-extrabold leading-tight truncate tabular-nums">{value}</p>
    </div>
  );
}

function ContributeBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 h-9 rounded-xl bg-white/25 hover:bg-white/35 backdrop-blur-sm text-xs font-bold transition active:scale-95"
    >
      {label}
    </button>
  );
}

function ContribCustom({
  onAdd,
  negative,
  accounts,
}: {
  onAdd: (v: number, accountId?: string) => void;
  negative?: boolean;
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  const [accountId, setAccountId] = useState<string | undefined>(accounts[0]?.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={negative ? "Retirar monto personalizado" : "Aporte personalizado"}
        className={cn(
          "rounded-2xl bg-white/25 hover:bg-white/35 font-bold transition flex items-center justify-center active:scale-95",
          negative ? "size-9 rounded-xl text-xs" : "h-12 sm:h-14 w-full text-base"
        )}
      >
        {negative ? <Minus className="size-4" /> : "···"}
      </button>
      <DialogContent className="rounded-3xl max-w-sm">
        <DialogHeader>
          <DialogTitle>{negative ? "Retirar de meta" : "Aportar a meta"}</DialogTitle>
          <DialogDescription className="sr-only">Formulario para registrar monto a la meta</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs">Monto</Label>
            <Input
              autoFocus
              type="number"
              inputMode="decimal"
              value={v}
              onChange={(e) => setV(e.target.value)}
              placeholder="0.00"
              className="h-14 text-2xl font-bold rounded-2xl"
            />
          </div>
          <div>
            <Label className="text-xs">{negative ? "Cuenta destino" : "Cuenta origen"}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-12 rounded-2xl">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => {
              const n = parseFloat(v);
              if (n) {
                onAdd(n, accountId);
                setOpen(false);
                setV("");
                toast.success(negative ? "Retiro registrado" : "¡Aporte registrado!");
              }
            }}
            className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 font-bold"
          >
            {negative ? "Retirar" : "Aportar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
