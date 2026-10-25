import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  fmt,
  iconFor,
  IconRef,
  Debt,
  DebtPayment,
  PaymentMethod,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_EMOJI,
  fmtDate,
  Account,
  isIOweDebt,
} from "@/lib/finance";
import { Header } from "@/components/app/Header";
import {
  Plus,
  Pencil,
  Trash2,
  HandCoins,
  CheckCircle2,
  Search,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

const localDateNow = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function totalDebtPaid(d: Debt): number {
  return (d.payments ?? []).reduce((a, p) => a + p.amount, 0);
}

function getDebtAmortization(d: Debt) {
  const paid = totalDebtPaid(d);
  const pending = Math.max(0, d.amount - paid);
  const pct = d.amount > 0 ? Math.min(100, (paid / d.amount) * 100) : 0;
  const settled = pending <= 0.0001;
  return { paid, pending, pct, settled };
}

export function DeudasV2() {
  const { debts, accounts, addDebt, updateDebt, removeDebt, addDebtPayment, removeDebtPayment } = useFinanceData();
  const [params] = useSearchParams();

  // Filtros
  const [directionFilter, setDirectionFilter] = useState<"all" | "me_deben" | "yo_debo">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "settled">("all");
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Selección y Master-Detail
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Modales
  const [openNewModal, setOpenNewModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [deleteDebt, setDeleteDebt] = useState<Debt | null>(null);
  const [deletePayment, setDeletePayment] = useState<{ debtId: string; paymentId: string; amount: number } | null>(null);

  // Deep-linking desde URL (?id=...)
  useEffect(() => {
    const id = params.get("id");
    if (id && debts.some((d) => d.id === id)) {
      setSelectedId(id);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setIsMobileDrawerOpen(true);
      }
    }
  }, [params, debts]);

  // Totales globales desglosados
  const totals = useMemo(() => {
    let totalLent = 0;
    let collectedLent = 0;
    let totalBorrowed = 0;
    let paidBorrowed = 0;

    debts.forEach((d) => {
      const { paid } = getDebtAmortization(d);
      if (isIOweDebt(d)) {
        totalBorrowed += d.amount;
        paidBorrowed += paid;
      } else {
        totalLent += d.amount;
        collectedLent += paid;
      }
    });

    const pendingToCollect = Math.max(0, totalLent - collectedLent);
    const pendingToPay = Math.max(0, totalBorrowed - paidBorrowed);
    const netBalance = pendingToCollect - pendingToPay;

    return {
      totalLent,
      collectedLent,
      pendingToCollect,
      totalBorrowed,
      paidBorrowed,
      pendingToPay,
      netBalance,
    };
  }, [debts]);

  // Desglose por persona
  const perPerson = useMemo(() => {
    const map = new Map<
      string,
      {
        person: string;
        total: number;
        paid: number;
        pending: number;
        count: number;
        settled: number;
      }
    >();

    debts.forEach((d) => {
      const key = d.person.trim().toLowerCase();
      const cur = map.get(key) ?? {
        person: d.person,
        total: 0,
        paid: 0,
        pending: 0,
        count: 0,
        settled: 0,
      };
      const { paid, pending, settled } = getDebtAmortization(d);
      cur.total += d.amount;
      cur.paid += paid;
      cur.pending += pending;
      cur.count += 1;
      if (settled) cur.settled += 1;
      map.set(key, cur);
    });

    return Array.from(map.values()).sort((a, b) => b.pending - a.pending);
  }, [debts]);

  // Lista filtrada
  const visibleDebts = useMemo(() => {
    return debts.filter((d) => {
      const { settled } = getDebtAmortization(d);
      const isOwe = isIOweDebt(d);

      if (directionFilter === "me_deben" && isOwe) return false;
      if (directionFilter === "yo_debo" && !isOwe) return false;

      if (statusFilter === "pending" && settled) return false;
      if (statusFilter === "settled" && !settled) return false;

      if (personFilter && d.person.trim().toLowerCase() !== personFilter) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        if (!d.person.toLowerCase().includes(q) && !d.concept.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [debts, directionFilter, statusFilter, personFilter, query]);

  const selectedDebt = useMemo(() => {
    return debts.find((d) => d.id === selectedId) || null;
  }, [debts, selectedId]);

  const handleSelectDebt = (d: Debt) => {
    setSelectedId(d.id);
    if (window.innerWidth < 1024) {
      setIsMobileDrawerOpen(true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-24 text-foreground">
      {/* Cabecera Principal */}
      <Header
        title="Deudas y Préstamos"
        subtitle="Control de amortización, cobros y pagos a terceros"
        action={
          <Button
            onClick={() => setOpenNewModal(true)}
            className="rounded-xl gradient-primary text-primary-foreground border-0 shadow-glow h-10 text-xs sm:text-sm px-3 sm:px-4 font-medium"
          >
            <Plus className="size-4 mr-1.5" />
            <span>Nueva Deuda</span>
          </Button>
        }
      />

      {/* Resumen Global De-boxed (Warm Editorial Wealth - Anti-AI Law 1 & 3) */}
      <section className="px-4 sm:px-6 mb-6">
        <div className="py-4 border-y border-[#E4E0D8] dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Focal figure: Balance Neto de Deudas */}
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Balance Neto de Deudas
            </span>
            <div className="flex items-baseline gap-3 mt-1 flex-wrap">
              <span
                className={`text-3xl sm:text-4xl font-extrabold font-mono-tabular tracking-tight ${
                  totals.netBalance > 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : totals.netBalance < 0
                    ? "text-rose-700 dark:text-rose-400"
                    : "text-foreground"
                }`}
              >
                {totals.netBalance > 0 ? `+${fmt(totals.netBalance)}` : fmt(totals.netBalance)}
              </span>
              <span
                className={`text-xs font-semibold font-mono-tabular px-2.5 py-0.5 rounded-full border ${
                  totals.netBalance >= 0
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                }`}
              >
                {totals.netBalance >= 0 ? "A tu favor" : "En contra"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Diferencia neta entre activos y pasivos por cobrar y pagar
            </p>
          </div>

          {/* Cifras de Por Cobrar y Por Pagar con divisor hairline */}
          <div className="grid grid-cols-2 gap-6 sm:gap-8 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-[#E4E0D8] dark:border-white/10 md:pl-8 shrink-0">
            {/* Por Cobrar */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowDownLeft className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                Me deben (Por cobrar)
              </span>
              <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400 mt-1">
                {fmt(totals.pendingToCollect)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cobrado <span className="font-mono-tabular font-medium">{fmt(totals.collectedLent)}</span> de <span className="font-mono-tabular">{fmt(totals.totalLent)}</span>
              </p>
            </div>

            {/* Por Pagar */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowUpRight className="size-3.5 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />
                Mis deudas (Por pagar)
                <span className="sr-only">Yo debo (Por pagar)</span>
              </span>
              <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-rose-700 dark:text-rose-400 mt-1">
                {fmt(totals.pendingToPay)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Abonado <span className="font-mono-tabular font-medium">{fmt(totals.paidBorrowed)}</span> de <span className="font-mono-tabular">{fmt(totals.totalBorrowed)}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Píldoras por Persona (si existen deudas) */}
      {perPerson.length > 0 && (
        <section className="px-4 sm:px-6 mb-5" aria-label="Filtro por persona">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Contactos con deuda
            </span>
            {personFilter && (
              <button
                onClick={() => setPersonFilter(null)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Limpiar filtro de persona
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {perPerson.map((p) => {
              const key = p.person.trim().toLowerCase();
              const active = personFilter === key;
              const allSettled = p.settled === p.count;
              return (
                <button
                  key={key}
                  onClick={() => setPersonFilter(active ? null : key)}
                  className={`shrink-0 rounded-xl border p-2.5 min-w-[140px] text-left transition active:scale-[0.98] ${
                    active
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-[#E4E0D8] dark:border-white/10 bg-card hover:border-primary/40 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-xs truncate flex-1">{p.person}</p>
                    {allSettled && (
                      <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {p.count} {p.count === 1 ? "registro" : "registros"}
                  </p>
                  <p className="text-xs font-bold font-mono-tabular mt-1 text-foreground">
                    {fmt(p.pending)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Filtros Contextuales De-boxed */}
      <section className="px-4 sm:px-6 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Píldoras de Dirección ("Todas", "Me deben", "Yo debo") */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-muted/40 border border-[#E4E0D8] dark:border-white/10">
            {(
              [
                { k: "all", label: "Todas" },
                { k: "me_deben", label: "Me deben" },
                { k: "yo_debo", label: "Yo debo" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.k}
                onClick={() => setDirectionFilter(tab.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  directionFilter === tab.k
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Píldoras de Estado ("Todas", "Pendientes", "Saldadas") */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-muted/40 border border-[#E4E0D8] dark:border-white/10">
            {(
              [
                { k: "all", label: "Todos los estados" },
                { k: "pending", label: "Pendientes" },
                { k: "settled", label: "Saldadas" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.k}
                onClick={() => setStatusFilter(tab.k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === tab.k
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buscador reactivo */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por persona, concepto o motivo..."
            className="pl-9 pr-9 h-10 rounded-xl bg-card border-[#E4E0D8] dark:border-white/10 text-xs sm:text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </section>

      {/* Contenedor Principal Master-Detail (12 Columnas en lg:) */}
      <main className="px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA (col-span-7): Lista de Deudas con Amortización */}
          <section className="lg:col-span-7 space-y-3" aria-label="Lista de deudas">
            {debts.length === 0 ? (
              /* Estado Vacío Sin Deudas (Anti-AI Law 5: Sin circular bubble badge) */
              <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-10 text-center flex flex-col items-center justify-center">
                <HandCoins className="size-8 text-muted-foreground mb-3" strokeWidth={1.5} />
                <h3 className="font-display-v2 text-lg font-semibold tracking-tight text-foreground mb-1">
                  Sin deudas ni préstamos
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
                  Lleva el control de lo que debes y te deben fácilmente. Registra tu primer préstamo o compromiso financiero.
                </p>
                <Button
                  onClick={() => setOpenNewModal(true)}
                  className="rounded-xl gradient-primary text-primary-foreground border-0 shadow-glow h-9 text-xs font-medium"
                >
                  Registrar primera deuda
                </Button>
              </div>
            ) : visibleDebts.length === 0 ? (
              /* Estado Vacío Filtros */
              <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-8 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-muted-foreground mb-3">
                  No se encontraron deudas con los filtros seleccionados.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDirectionFilter("all");
                    setStatusFilter("all");
                    setPersonFilter(null);
                    setQuery("");
                  }}
                  className="text-xs rounded-lg"
                >
                  Restablecer filtros
                </Button>
              </div>
            ) : (
              visibleDebts.map((d) => {
                const { paid, pending, pct, settled } = getDebtAmortization(d);
                const isOwe = isIOweDebt(d);
                const isSelected = selectedId === d.id;

                return (
                  <div
                    key={d.id}
                    onClick={() => handleSelectDebt(d)}
                    className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 active:scale-[0.99] ${
                      isSelected
                        ? "border-primary bg-primary/[0.03] ring-1 ring-primary shadow-xs"
                        : "border-[#E4E0D8] dark:border-white/10 bg-card hover:border-primary/40 hover:bg-muted/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <IconDisplay icon={iconFor({ icon: d.icon, category: "Otros" })} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm font-bold truncate ${
                                settled ? "line-through text-muted-foreground" : "text-foreground"
                              }`}
                            >
                              {d.person}
                            </h4>
                            {/* Badge de Dirección */}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                isOwe
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {isOwe ? (
                                <>
                                  <ArrowUpRight className="size-2.5" /> Yo debo
                                </>
                              ) : (
                                <>
                                  <ArrowDownLeft className="size-2.5" /> Me deben
                                </>
                              )}
                            </span>
                            {settled && (
                              <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.2 rounded-full flex items-center gap-0.5">
                                <CheckCircle2 className="size-2.5" /> Saldada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{d.concept}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-mono-tabular text-foreground">
                          {fmt(pending)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">Saldo pendiente</p>
                      </div>
                    </div>

                    {/* Barra de Progreso de Amortización */}
                    <div className="space-y-1 mt-3 pt-2.5 border-t border-[#E4E0D8]/60 dark:border-white/5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          Amortizado: <span className="font-mono-tabular font-medium text-foreground">{fmt(paid)}</span> de{" "}
                          <span className="font-mono-tabular">{fmt(d.amount)}</span>
                        </span>
                        <span className="font-mono-tabular font-semibold text-foreground">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden relative">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            settled
                              ? "bg-emerald-600"
                              : isOwe
                              ? "bg-rose-600"
                              : "bg-emerald-600"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Vencimiento si existe */}
                    {d.dueDate && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2">
                        <Calendar className="size-3" />
                        <span>Vence: {fmtDate(d.dueDate)}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {/* COLUMNA DERECHA (col-span-5): Panel Inspector Master-Detail en Escritorio (Desktop lg:) */}
          <aside className="hidden lg:block lg:col-span-5 sticky top-20" aria-label="Inspector de deuda">
            {selectedDebt ? (
              <DebtInspectorContent
                debt={selectedDebt}
                accounts={accounts}
                onClose={() => setSelectedId(null)}
                onEdit={() => setEditingDebt(selectedDebt)}
                onDelete={() => setDeleteDebt(selectedDebt)}
                onAddPayment={(payment) => addDebtPayment(selectedDebt.id, payment)}
                onDeletePayment={(paymentId, amount) =>
                  setDeletePayment({ debtId: selectedDebt.id, paymentId, amount })
                }
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-10 text-center flex flex-col items-center justify-center bg-card/40">
                <SlidersHorizontal className="size-8 text-muted-foreground mb-3" strokeWidth={1.5} />
                <h4 className="font-display-v2 text-base font-semibold text-foreground mb-1">
                  Inspector de Amortización
                </h4>
                <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                  Selecciona una deuda de la lista para registrar abonos con un toque, consultar el historial de pagos o editar sus valores.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Drawer Móvil (< lg) */}
      <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <DrawerContent className="max-h-[88dvh] overflow-y-auto px-4 pb-8">
          <DrawerHeader className="text-left px-0 pt-4 pb-2">
            <DrawerTitle className="font-display-v2 text-lg">Detalle de Deuda</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Amortización, abonos e historial
            </DrawerDescription>
          </DrawerHeader>
          {selectedDebt && (
            <DebtInspectorContent
              debt={selectedDebt}
              accounts={accounts}
              onClose={() => setIsMobileDrawerOpen(false)}
              onEdit={() => {
                setIsMobileDrawerOpen(false);
                setEditingDebt(selectedDebt);
              }}
              onDelete={() => {
                setIsMobileDrawerOpen(false);
                setDeleteDebt(selectedDebt);
              }}
              onAddPayment={(payment) => addDebtPayment(selectedDebt.id, payment)}
              onDeletePayment={(paymentId, amount) =>
                setDeletePayment({ debtId: selectedDebt.id, paymentId, amount })
              }
            />
          )}
        </DrawerContent>
      </Drawer>

      {/* Modal para Nueva Deuda / Editar Deuda */}
      <Dialog
        open={openNewModal || !!editingDebt}
        onOpenChange={(v) => {
          if (!v) {
            setOpenNewModal(false);
            setEditingDebt(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display-v2 text-lg">
              {editingDebt ? "Editar deuda" : "Nueva deuda o préstamo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingDebt
                ? "Modifica los datos del registro"
                : "Especifica si prestaste dinero o si contrajiste una deuda"}
            </DialogDescription>
          </DialogHeader>
          <DebtEditorForm
            initial={editingDebt}
            accounts={accounts}
            onSave={async (payload) => {
              try {
                if (editingDebt) {
                  await updateDebt(editingDebt.id, payload);
                  toast.success("Deuda actualizada correctamente");
                } else {
                  await addDebt(payload);
                  toast.success("Deuda registrada exitosamente");
                }
                setOpenNewModal(false);
                setEditingDebt(null);
              } catch (e: any) {
                toast.error(e.message || "Error al guardar la deuda");
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmación para Eliminar Deuda */}
      <ElegantConfirm
        open={!!deleteDebt}
        onOpenChange={(v) => !v && setDeleteDebt(null)}
        title="¿Eliminar deuda?"
        description={
          <span className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar la deuda de{" "}
            <span className="font-bold text-foreground">"{deleteDebt?.person}"</span>? Se eliminarán
            también todos sus abonos registrados.
          </span>
        }
        onConfirm={async () => {
          if (deleteDebt) {
            try {
              await removeDebt(deleteDebt.id);
              toast.success("Deuda eliminada");
              if (selectedId === deleteDebt.id) setSelectedId(null);
            } catch (e: any) {
              toast.error(e.message || "Error al eliminar");
            }
            setDeleteDebt(null);
          }
        }}
        icon={Trash2}
        iconColor="bg-destructive"
      />

      {/* Confirmación para Eliminar Abono */}
      <ElegantConfirm
        open={!!deletePayment}
        onOpenChange={(v) => !v && setDeletePayment(null)}
        title="¿Eliminar abono?"
        description={
          <span className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar el abono de{" "}
            <span className="font-bold font-mono-tabular text-foreground">
              {fmt(deletePayment?.amount ?? 0)}
            </span>
            ? Esto aumentará el saldo pendiente de amortización.
          </span>
        }
        onConfirm={async () => {
          if (deletePayment) {
            try {
              await removeDebtPayment(deletePayment.debtId, deletePayment.paymentId);
              toast.success("Abono eliminado");
            } catch (e: any) {
              toast.error(e.message || "Error al eliminar abono");
            }
            setDeletePayment(null);
          }
        }}
        icon={Trash2}
        iconColor="bg-destructive"
      />
    </div>
  );
}

/** Componente Inspector / Detalle de Deuda (Desktop & Mobile Drawer) */
function DebtInspectorContent({
  debt,
  accounts,
  onClose,
  onEdit,
  onDelete,
  onAddPayment,
  onDeletePayment,
}: {
  debt: Debt;
  accounts: Account[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddPayment: (p: Omit<DebtPayment, "id">) => Promise<void>;
  onDeletePayment: (paymentId: string, amount: number) => void;
}) {
  const { paid, pending, pct, settled } = getDebtAmortization(debt);
  const isOwe = isIOweDebt(debt);

  // Formulario de Abono Rápido
  const [amount, setAmount] = useState(String(pending > 0 ? pending : ""));
  const [date, setDate] = useState(localDateNow());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [accountId, setAccountId] = useState<string | undefined>(debt.accountId ?? accounts[0]?.id);
  const [note, setNote] = useState("");
  const [receiptData, setReceiptData] = useState<string | undefined>(undefined);
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Actualizar monto sugerido y cuenta si cambia la deuda seleccionada
  useEffect(() => {
    setAmount(String(pending > 0 ? pending : ""));
    setAccountId(debt.accountId ?? accounts[0]?.id);
    setReceiptData(undefined);
  }, [debt.id, debt.accountId, pending, accounts]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseFloat(amount);
    if (!a || a <= 0) {
      toast.error("Ingresa un monto válido para el abono");
      return;
    }

    setIsSubmittingPay(true);
    try {
      await onAddPayment({
        amount: a,
        date: new Date(`${date}T12:00:00`).toISOString(),
        paymentMethod,
        accountId: accountId || undefined,
        note: note.trim() || undefined,
        receipt: receiptData,
      });
      toast.success("¡Abono registrado exitosamente!");
      setNote("");
      setReceiptData(undefined);
    } catch (err: any) {
      toast.error(err.message || "Error al registrar el abono");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-card p-5 shadow-xs space-y-5">
      {/* Cabecera del Inspector */}
      <div className="flex items-start justify-between pb-3 border-b border-[#E4E0D8] dark:border-white/10">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isOwe
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
              }`}
            >
              {isOwe ? "Yo debo dinero" : "Me deben dinero"}
            </span>
            {settled && (
              <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.2 rounded-full">
                Saldada
              </span>
            )}
          </div>
          <h3 className="font-display-v2 text-xl font-bold tracking-tight text-foreground truncate">
            {debt.person}
          </h3>
          <p className="text-xs text-muted-foreground truncate">{debt.concept}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={onEdit} className="h-8 text-xs rounded-lg gap-1">
            <Pencil className="size-3" strokeWidth={1.5} />
            <span>Editar</span>
          </Button>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Cerrar panel"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Montos y Progreso de Amortización */}
      <div className="p-4 rounded-xl bg-muted/40 border border-[#E4E0D8]/60 dark:border-white/5 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground font-medium">Saldo pendiente</span>
          <span className="text-2xl font-bold font-mono-tabular tracking-tight text-foreground">
            {fmt(pending)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            style={{ width: `${pct}%` }}
            className={`h-full rounded-full transition-all duration-500 ${
              settled ? "bg-emerald-600" : isOwe ? "bg-rose-600" : "bg-emerald-600"
            }`}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
          <span>
            Abonado: <span className="font-mono-tabular font-medium text-foreground">{fmt(paid)}</span>
          </span>
          <span>
            Total: <span className="font-mono-tabular font-medium text-foreground">{fmt(debt.amount)}</span>
          </span>
        </div>
      </div>

      {/* Formulario de Abono Rápido (si no está saldada) */}
      {!settled && (
        <form onSubmit={handlePaySubmit} className="space-y-3 pt-1">
          <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
            <HandCoins className="size-3.5 text-primary" />
            Registrar Abono
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Monto</Label>
              <Input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-9 font-mono-tabular text-sm font-semibold rounded-lg"
              />
            </div>
            <div>
              <Label className="text-[11px]">Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Método</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {PAYMENT_METHOD_EMOJI[k]} {PAYMENT_METHOD_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Cuenta</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[11px]">Nota o concepto del abono (opcional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Transferencia quincenal..."
              className="h-9 text-xs rounded-lg"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[11px]">Comprobante de abono (opcional)</Label>
              {receiptData && (
                <button
                  type="button"
                  onClick={() => setReceiptData(undefined)}
                  className="text-[10px] text-destructive hover:underline"
                >
                  Quitar archivo
                </button>
              )}
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") {
                      setReceiptData(reader.result);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="h-9 text-xs rounded-lg file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {receiptData && (
              <img
                src={receiptData}
                alt="Vista previa del comprobante"
                className="mt-1.5 rounded-lg max-h-24 object-contain border border-[#E4E0D8] dark:border-white/10"
              />
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmittingPay}
            className="w-full h-9 rounded-lg gradient-primary text-primary-foreground font-medium text-xs border-0 shadow-glow"
          >
            {isSubmittingPay ? "Registrando..." : "Abonar ahora"}
          </Button>
        </form>
      )}

      {/* Historial de Abonos Tabular */}
      <div className="space-y-2 pt-2 border-t border-[#E4E0D8] dark:border-white/10">
        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground flex items-center justify-between">
          <span>Historial de abonos</span>
          <span className="font-mono-tabular text-[10px]">
            {(debt.payments ?? []).length} {debt.payments?.length === 1 ? "abono" : "abonos"}
          </span>
        </span>

        {(!debt.payments || debt.payments.length === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-xl">
            Sin abonos registrados aún
          </p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {debt.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-[#E4E0D8]/40 dark:border-white/5"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{PAYMENT_METHOD_EMOJI[p.paymentMethod ?? "other"]}</span>
                    <span className="text-xs font-bold font-mono-tabular text-foreground">
                      {fmt(p.amount)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {fmtDate(p.date)} {p.note ? `• ${p.note}` : ""}
                  </p>
                  {p.receipt && (
                    <button
                      type="button"
                      onClick={() => setViewReceipt(p.receipt!)}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-medium mt-0.5"
                    >
                      <FileText className="size-3" strokeWidth={1.5} />
                      <span>Ver comprobante</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onDeletePayment(p.id, p.amount)}
                  className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition shrink-0"
                  title="Eliminar abono"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Visualizar Comprobante de Abono */}
      <Dialog open={!!viewReceipt} onOpenChange={(v) => !v && setViewReceipt(null)}>
        <DialogContent className="max-w-md p-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Comprobante de abono</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Comprobante adjunto al pago
            </DialogDescription>
          </DialogHeader>
          {viewReceipt && (
            <img
              src={viewReceipt}
              alt="Comprobante completo"
              className="w-full max-h-[70vh] object-contain rounded-lg border border-[#E4E0D8] dark:border-white/10"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Zona de Peligro / Eliminar */}
      <div className="pt-2 border-t border-[#E4E0D8] dark:border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg justify-center"
        >
          <Trash2 className="size-3.5 mr-1.5" />
          <span>Eliminar registro de deuda</span>
        </Button>
      </div>
    </div>
  );
}

/** Formulario para Crear / Editar Deuda */
function DebtEditorForm({
  initial,
  accounts,
  onSave,
}: {
  initial: Debt | null;
  accounts: Account[];
  onSave: (payload: Omit<Debt, "id" | "payments">) => Promise<void>;
}) {
  const [direction, setDirection] = useState<"me_deben" | "yo_debo">(
    initial ? (isIOweDebt(initial) ? "yo_debo" : "me_deben") : "me_deben"
  );
  const [person, setPerson] = useState(initial?.person ?? "");
  const [concept, setConcept] = useState(initial?.concept ?? "");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? localDateNow());
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) ?? "");
  const [accountId, setAccountId] = useState<string | undefined>(initial?.accountId);
  const [note, setNote] = useState(
    initial?.note ? initial.note.replace(/\[yo_debo\]/g, "").trim() : ""
  );
  const [icon, setIcon] = useState<IconRef | undefined>(initial?.icon);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!person.trim() || !parsedAmount || parsedAmount <= 0) {
      toast.error("Por favor completa el nombre de la persona y un monto válido");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanNote = note.trim();
      const finalNote = direction === "yo_debo" ? (cleanNote ? `${cleanNote} [yo_debo]` : "[yo_debo]") : cleanNote;

      await onSave({
        person: person.trim(),
        concept: concept.trim() || (direction === "yo_debo" ? "Deuda adquirida" : "Préstamo"),
        amount: parsedAmount,
        date: new Date(`${date}T12:00:00`).toISOString(),
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined,
        note: finalNote || undefined,
        accountId: accountId || undefined,
        icon,
        type: direction,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      {/* Selector de Dirección */}
      <div>
        <Label className="text-xs mb-1.5 block">¿Quién debe el dinero?</Label>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/40 border border-[#E4E0D8] dark:border-white/10">
          <button
            type="button"
            onClick={() => setDirection("me_deben")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              direction === "me_deben"
                ? "bg-card text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownLeft className="size-3.5" />
            <span>Me deben dinero</span>
          </button>
          <button
            type="button"
            onClick={() => setDirection("yo_debo")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              direction === "yo_debo"
                ? "bg-card text-rose-700 dark:text-rose-400 shadow-xs border border-rose-500/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpRight className="size-3.5" />
            <span>Yo debo dinero</span>
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Persona o Entidad</Label>
          <Input
            autoFocus
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            placeholder="Ej. Juan Pérez o Banco"
            className="h-10 rounded-xl text-xs sm:text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Concepto</Label>
          <Input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Ej. Préstamo vacaciones"
            className="h-10 rounded-xl text-xs sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Monto Total</Label>
          <Input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-10 rounded-xl font-mono-tabular font-bold text-sm sm:text-base"
          />
        </div>
        <div>
          <Label className="text-xs">Cuenta asociada (opcional)</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-10 rounded-xl text-xs sm:text-sm">
              <SelectValue placeholder="Seleccionar cuenta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Fecha del préstamo/deuda</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-xl text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Fecha de vencimiento (opcional)</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-10 rounded-xl text-xs"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Nota adicional</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notas o condiciones del acuerdo..."
          className="h-10 rounded-xl text-xs"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm border-0 shadow-glow"
      >
        {isSubmitting ? "Guardando..." : initial ? "Actualizar deuda" : "Registrar deuda"}
      </Button>
    </form>
  );
}
