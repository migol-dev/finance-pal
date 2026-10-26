import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  fmt,
  CATEGORY_EMOJI,
  MONTHS,
  iconFor,
  emojiFor,
  getCategoriesMap,
  IconRef,
  Transaction,
  PaymentMethod,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_EMOJI,
  fmtDate,
  parseDateLocal,
  Account,
  DebtPayment,
  isIOweDebt,
} from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { IconDisplay } from "@/components/app/IconDisplay";
import { IconPicker } from "@/components/app/IconPicker";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import { CategorySelectWithCreate } from "@/components/app/CategorySelectWithCreate";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  X,
  Receipt,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  SlidersHorizontal,
  Wallet,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "@/lib/framer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

export type TxType = "income" | "expense" | "saving" | "transfer";

export type MovimientoRow =
  | (Transaction & { _virtual?: false; _debtId?: undefined })
  | {
      id: string;
      type: "income" | "expense" | "saving";
      category: string;
      concept: string;
      amount: number;
      date: string;
      note?: string;
      icon?: IconRef;
      paymentMethod?: PaymentMethod;
      accountId?: string;
      transferToAccountId?: string;
      externalPayee?: { clabe?: string; bank?: string; name?: string };
      receipt?: string;
      _virtual: true;
      _debtId: string;
    };

const FILTER_TABS = [
  { k: "all", label: "Todo" },
  { k: "expense", label: "Gastos" },
  { k: "income", label: "Ingresos" },
  { k: "saving", label: "Ahorros" },
  { k: "transfer", label: "Traspasos" },
] as const;

const DATE_PRESETS: {
  key: "all" | "today" | "yesterday" | "last7" | "last30" | "custom";
  label: string;
}[] = [
  { key: "all", label: "Mes activo" },
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "last7", label: "7 días" },
  { key: "last30", label: "30 días" },
  { key: "custom", label: "Personalizado" },
];

export function MovimientosV2() {
  const {
    transactions,
    addTx,
    updateTx,
    removeTx,
    removeDebt,
    removeDebtPayment,
    activeYear,
    activeMonth,
    debts,
    accounts,
    customCategories = [],
    syncFiltersToURL,
    setSyncFiltersToURL,
  } = useFinanceData();

  const categoriesMap = useMemo(
    () => getCategoriesMap(customCategories),
    [customCategories]
  );

  const [params, setParams] = useSearchParams();

  // Estados de filtros
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TxType>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<
    "all" | "today" | "yesterday" | "last7" | "last30" | "custom"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Estados de selección e inspección
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Estados de creación
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newDefaultType, setNewDefaultType] = useState<TxType>("expense");

  // Confirmación de eliminación
  const [deleteConfirm, setDeleteConfirm] = useState<MovimientoRow | null>(null);

  // Sincronización desde URL params
  useEffect(() => {
    const n = params.get("new");
    if (n === "income" || n === "expense" || n === "saving" || n === "transfer") {
      setNewDefaultType(n as TxType);
      setIsNewModalOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }

    const qsync = params.get("sync");
    if (syncFiltersToURL || qsync === "1" || qsync === "true") {
      const q = params.get("q") ?? "";
      const f = (params.get("filter") as TxType | "all") ?? "all";
      const acc = params.get("account") ?? "all";
      const cat = params.get("category") ?? "all";
      const dp = (params.get("datePreset") as "all" | "today" | "yesterday" | "last7" | "last30" | "custom") ?? "all";
      const df = params.get("dateFrom") ?? "";
      const dt = params.get("dateTo") ?? "";
      setQuery(q);
      setFilter(f);
      setAccountFilter(acc);
      setCategoryFilter(cat);
      setDatePreset(dp);
      setDateFrom(df);
      setDateTo(dt);
      if (qsync === "1" || qsync === "true") setSyncFiltersToURL(true);
    }
  }, [params, setParams, syncFiltersToURL, setSyncFiltersToURL]);

  // Sincronización hacia URL params
  useEffect(() => {
    if (!syncFiltersToURL) return;
    const np = new URLSearchParams();
    if (query) np.set("q", query);
    if (filter !== "all") np.set("filter", filter);
    if (accountFilter !== "all") np.set("account", accountFilter);
    if (categoryFilter !== "all") np.set("category", categoryFilter);
    if (datePreset !== "all") np.set("datePreset", datePreset);
    if (dateFrom) np.set("dateFrom", dateFrom);
    if (dateTo) np.set("dateTo", dateTo);
    np.set("sync", "1");
    setParams(np, { replace: true });
  }, [filter, accountFilter, categoryFilter, query, datePreset, dateFrom, dateTo, syncFiltersToURL, setParams]);

  // Transacciones regulares del mes activo
  const inMonth = useMemo(() => {
    return transactions.filter((t) => {
      const d = parseDateLocal(t.date);
      return d.getFullYear() === activeYear && d.getMonth() === activeMonth;
    });
  }, [transactions, activeYear, activeMonth]);

  // Generador de filas virtuales de deudas
  const buildDebtRows = useCallback(
    (onlyMonth: boolean) => {
      const rows: MovimientoRow[] = [];
      debts.forEach((d) => {
        const isYoDebo = isIOweDebt(d);
        const dd = parseDateLocal(d.date);
        if (!onlyMonth || (dd.getFullYear() === activeYear && dd.getMonth() === activeMonth)) {
          rows.push({
            id: `debt-${d.id}`,
            type: isYoDebo ? "income" : "expense",
            category: "Deudas",
            concept: isYoDebo ? `Deuda con ${d.person}` : `Préstamo a ${d.person}`,
            amount: d.amount,
            date: d.date,
            note: d.concept,
            icon: d.icon,
            accountId: d.accountId,
            _virtual: true,
            _debtId: d.id,
          });
        }
        (d.payments || []).forEach((p: DebtPayment) => {
          const pd = parseDateLocal(p.date);
          if (!onlyMonth || (pd.getFullYear() === activeYear && pd.getMonth() === activeMonth)) {
            rows.push({
              id: `pay-${d.id}-${p.id}`,
              type: isYoDebo ? "expense" : "income",
              category: "Deudas",
              concept: isYoDebo ? `Pago a ${d.person}` : `Abono a ${d.person}`,
              amount: p.amount,
              date: p.date,
              note: p.note,
              icon: d.icon,
              paymentMethod: p.paymentMethod,
              accountId: p.accountId,
              _virtual: true,
              _debtId: d.id,
            });
          }
        });
      });
      return rows;
    },
    [debts, activeYear, activeMonth]
  );

  // Si datePreset es "all", restringir al mes activo de la cabecera.
  // Si datePreset es específico (hoy, ayer, 7d, 30d, personalizado), buscar sobre el universo completo de fechas.
  const allRows: MovimientoRow[] = useMemo(() => {
    if (datePreset === "all") {
      return [...inMonth.map((t) => t as MovimientoRow), ...buildDebtRows(true)];
    }
    return [...transactions.map((t) => t as MovimientoRow), ...buildDebtRows(false)];
  }, [datePreset, inMonth, transactions, buildDebtRows]);

  // Filtrado de movimientos
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (datePreset && datePreset !== "all") {
      const today = new Date();
      if (datePreset === "today") {
        startDate = dateOnly(today);
        endDate = dateOnly(today);
      } else if (datePreset === "yesterday") {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        startDate = dateOnly(y);
        endDate = dateOnly(y);
      } else if (datePreset === "last7") {
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        startDate = dateOnly(s);
        endDate = dateOnly(today);
      } else if (datePreset === "last30") {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        startDate = dateOnly(s);
        endDate = dateOnly(today);
      } else if (datePreset === "custom" && dateFrom) {
        const d1 = dateOnly(parseDateLocal(dateFrom));
        const d2 = dateTo ? dateOnly(parseDateLocal(dateTo)) : d1;
        startDate = d1 <= d2 ? d1 : d2;
        endDate = d1 <= d2 ? d2 : d1;
      }
    }

    return allRows
      .filter((t) => filter === "all" || t.type === filter)
      .filter((t) => accountFilter === "all" || t.accountId === accountFilter)
      .filter((t) => categoryFilter === "all" || t.category === categoryFilter)
      .filter((t) => {
        if (!q) return true;
        const pmLabel = t.paymentMethod
          ? PAYMENT_METHOD_LABEL[t.paymentMethod] ?? ""
          : "";
        return (
          (t.concept || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.note || "").toLowerCase().includes(q) ||
          (t.externalPayee?.name || "").toLowerCase().includes(q) ||
          pmLabel.toLowerCase().includes(q)
        );
      })
      .filter((t) => {
        if (!startDate || !endDate) return true;
        const d = dateOnly(parseDateLocal(t.date));
        return d >= startDate && d <= endDate;
      })
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
  }, [allRows, filter, accountFilter, categoryFilter, query, datePreset, dateFrom, dateTo]);

  // Agrupación cronológica por día
  const groupedDays = useMemo(() => {
    const groups: {
      dateKey: string;
      displayDate: string;
      items: MovimientoRow[];
      dailyNet: number;
    }[] = [];

    const map = new Map<string, MovimientoRow[]>();

    filtered.forEach((item) => {
      const key = item.date.slice(0, 10);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    map.forEach((items, key) => {
      const d = parseDateLocal(key);
      const dayNum = d.getDate();
      const monthName = MONTHS[d.getMonth()] ?? "";
      const year = d.getFullYear();
      const displayDate = `${dayNum} de ${monthName}, ${year}`;

      // Cálculo del subtotal neto del día
      const dailyNet = items.reduce((acc, t) => {
        if (t.type === "income") return acc + t.amount;
        if (t.type === "expense" || t.type === "saving") return acc - t.amount;
        return acc; // traspaso no altera neto global
      }, 0);

      groups.push({
        dateKey: key,
        displayDate,
        items,
        dailyNet,
      });
    });

    return groups;
  }, [filtered]);

  // Transacción actualmente seleccionada
  const selectedRow = useMemo(() => {
    if (!selectedId) return null;
    return allRows.find((r) => r.id === selectedId) ?? null;
  }, [allRows, selectedId]);

  // Si la transacción seleccionada cambia o se deselecciona, resetear modo edición
  useEffect(() => {
    setIsEditingSelected(false);
  }, [selectedId]);

  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);

  const secondaryActiveCount = useMemo(() => {
    let count = 0;
    if (accountFilter !== "all") count += 1;
    if (categoryFilter !== "all") count += 1;
    if (datePreset !== "all") count += 1;
    if (filter === "saving" || filter === "transfer") count += 1;
    return count;
  }, [accountFilter, categoryFilter, datePreset, filter]);

  const hasActiveFilters =
    filter !== "all" ||
    accountFilter !== "all" ||
    categoryFilter !== "all" ||
    datePreset !== "all" ||
    query.trim() !== "";

  const resetFilters = () => {
    setFilter("all");
    setAccountFilter("all");
    setCategoryFilter("all");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setQuery("");
  };

  const handleSelectRow = (row: MovimientoRow) => {
    setSelectedId(row.id);
    // En pantallas móviles abrir el drawer
    if (window.innerWidth < 1024) {
      setIsMobileDrawerOpen(true);
    }
  };

  const handleOpenNew = (initialType: TxType = "expense") => {
    setNewDefaultType(initialType);
    setIsNewModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-12 text-foreground font-sans">
      {/* Cabecera Principal */}
      <Header
        title="Movimientos"
        subtitle={`${MONTHS[activeMonth]} ${activeYear}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleOpenNew("expense")}
              className="h-9 px-2.5 sm:px-3.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs shadow-sm hover:opacity-90 active:scale-[0.98] transition-transform duration-100 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center gap-1.5 shrink-0"
            >
              <Plus className="size-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Nuevo movimiento</span>
              <span className="sm:hidden">Movimiento</span>
            </Button>
          </div>
        }
      />

      {/* Selector de Mes Central */}
      <div className="px-4 sm:px-6 mb-4 flex justify-center">
        <MonthSwitcher />
      </div>

      {/* Contenedor de Filtros De-boxed (Dos niveles con bandeja desplegable elástica) */}
      <section className="px-4 sm:px-6 mb-6 space-y-3" aria-label="Filtros de movimientos">
        {/* Nivel 1: Fila Principal (Buscador + Tipos Básicos + Botón Más filtros + Limpiar) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Barra de Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por concepto, categoría o método..."
              className="pl-9 pr-9 h-10 text-xs rounded-xl bg-card/60 border-[#E4E0D8] dark:border-white/10 focus-visible:ring-1 focus-visible:ring-primary/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-6 rounded-lg text-xs text-muted-foreground hover:text-foreground flex items-center justify-center"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Píldoras de Tipo Primarias (Todo, Gastos, Ingresos) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-[#E4E0D8] dark:border-white/10">
              {FILTER_TABS.slice(0, 3).map((tab) => {
                const isActive = filter === tab.k;
                return (
                  <button
                    key={tab.k}
                    type="button"
                    onClick={() => setFilter(tab.k as typeof filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-[0.98] ${
                      isActive
                        ? "bg-foreground text-background shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
              {/* Si está seleccionado Ahorros o Traspasos, mostrarlo aquí como pill activa */}
              {(filter === "saving" || filter === "transfer") && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-foreground text-background shadow-xs flex items-center gap-1"
                >
                  <span>{filter === "saving" ? "Ahorros" : "Traspasos"}</span>
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Botón Elástico 'Más filtros' con Contador de Filtros Activos */}
            <button
              type="button"
              onClick={() => setIsMoreFiltersOpen((prev) => !prev)}
              aria-expanded={isMoreFiltersOpen}
              className={`h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                secondaryActiveCount > 0 || isMoreFiltersOpen
                  ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                  : "bg-card border-[#E4E0D8] dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={1.75} />
              <span>Más filtros</span>
              {secondaryActiveCount > 0 && (
                <span className="size-4 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center font-mono-tabular">
                  {secondaryActiveCount}
                </span>
              )}
              {isMoreFiltersOpen ? (
                <ChevronUp className="size-3.5 opacity-70" />
              ) : (
                <ChevronDown className="size-3.5 opacity-70" />
              )}
            </button>

            {/* Botón Limpiar Filtros cuando hay filtros activos */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                aria-label="Limpiar filtros"
                className="h-10 px-3 rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-card/60 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 active:scale-[0.98] transition"
                title="Restablecer todos los filtros"
              >
                <X className="size-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Limpiar filtros</span>
                <span className="sm:hidden">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Nivel 2: Bandeja Desplegable (Cuentas, Categorías, Rango de Fechas, Tipos secundarios) */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isMoreFiltersOpen
              ? "max-h-[1200px] opacity-100"
              : "max-h-0 opacity-0 pointer-events-none -mt-3"
          )}
        >
          <div className="p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-[#E4E0D8] dark:border-white/10 space-y-4 shadow-soft">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Selector de Cuenta */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Wallet className="size-3 text-primary" strokeWidth={1.75} /> Cuenta
                    </Label>
                    <Select value={accountFilter} onValueChange={setAccountFilter}>
                      <SelectTrigger className="w-full h-9 text-xs rounded-xl border-[#E4E0D8] dark:border-white/10 bg-background/80">
                        <SelectValue placeholder="Todas las cuentas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las cuentas</SelectItem>
                        {accounts.map((a: Account) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} ({a.type === "cash" ? "Efectivo" : "Banco"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selector de Categoría */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Receipt className="size-3 text-primary" strokeWidth={1.75} /> Categoría
                    </Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full h-9 text-xs rounded-xl border-[#E4E0D8] dark:border-white/10 bg-background/80">
                        <SelectValue placeholder="Todas las categorías" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {Object.entries(categoriesMap).map(([cat, emoji]) => (
                          <SelectItem key={cat} value={cat}>
                            {emoji} {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipos Adicionales (Ahorros / Traspasos) */}
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Otros tipos
                    </Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFilter(filter === "saving" ? "all" : "saving")}
                        className={`flex-1 h-9 px-3 rounded-xl text-xs font-medium border transition-all ${
                          filter === "saving"
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                            : "bg-background/80 border-[#E4E0D8] dark:border-white/10 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Ahorros
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilter(filter === "transfer" ? "all" : "transfer")}
                        className={`flex-1 h-9 px-3 rounded-xl text-xs font-medium border transition-all ${
                          filter === "transfer"
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                            : "bg-background/80 border-[#E4E0D8] dark:border-white/10 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Traspasos
                      </button>
                    </div>
                  </div>
                </div>

                {/* Presets de Fecha */}
                <div className="pt-2 border-t border-[#E4E0D8]/60 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Periodo de búsqueda
                    </Label>
                    {datePreset !== "all" && (
                      <button
                        type="button"
                        onClick={() => {
                          setDatePreset("all");
                          setDateFrom("");
                          setDateTo("");
                        }}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Restablecer a mes activo
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {DATE_PRESETS.map((preset) => {
                      const isActive = datePreset === preset.key;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => {
                            setDatePreset(preset.key);
                            if (!isMoreFiltersOpen) setIsMoreFiltersOpen(true);
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-medium transition-all active:scale-[0.98] ${
                            isActive
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "bg-muted/40 border border-[#E4E0D8]/70 dark:border-white/10 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Fechas personalizadas */}
                  {datePreset === "custom" && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2">
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-xs text-muted-foreground w-12 sm:w-auto">Desde:</span>
                        <Input
                          type="date"
                          aria-label="Fecha desde"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="h-9 w-full sm:w-40 text-xs rounded-xl bg-background"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <span className="text-xs text-muted-foreground w-12 sm:w-auto">Hasta:</span>
                        <Input
                          type="date"
                          aria-label="Fecha hasta"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="h-9 w-full sm:w-40 text-xs rounded-xl bg-background"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
        </div>
      </section>

      {/* Contenedor Principal Master-Detail (12 Columnas en lg:) */}
      <main className="px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUMNA IZQUIERDA (col-span-7): Feed Cronológico Agrupado */}
          <section className="lg:col-span-7 space-y-6" aria-label="Lista cronológica de transacciones">
            {groupedDays.length === 0 ? (
              /* Estado Vacío Editorial */
              <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-10 text-center flex flex-col items-center justify-center">
                <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mb-3 text-muted-foreground">
                  <Receipt className="size-6" strokeWidth={1.5} />
                </div>
                <h3 className="font-display-v2 text-lg font-semibold tracking-tight text-foreground mb-1">
                  Sin movimientos registrados
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
                  {hasActiveFilters
                    ? "No se encontraron transacciones que coincidan con los filtros aplicados. Prueba restablecerlos."
                    : `No hay registros en ${MONTHS[activeMonth]} de ${activeYear}. Comienza añadiendo tus gastos o ingresos.`}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs rounded-lg">
                    Restablecer filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleOpenNew("expense")}
                    className="text-xs rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    Crear primer movimiento
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedDays.map(({ dateKey, displayDate, items, dailyNet }) => {
                  const isPositive = dailyNet > 0;
                  const isNegative = dailyNet < 0;

                  return (
                    <div key={dateKey} className="space-y-2">
                      {/* Cabecera del Día con Subtotal Neto Tabular */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#E4E0D8] dark:border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {displayDate}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono-tabular">
                            ({items.length} {items.length === 1 ? "movimiento" : "movimientos"})
                          </span>
                        </div>

                        {/* Subtotal Neto del Día en JetBrains Mono */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            Subtotal:
                          </span>
                          <span
                            className={`font-mono-tabular text-xs font-semibold tabular-nums px-2 py-0.5 rounded ${
                              isPositive
                                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
                                : isNegative
                                ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
                                : "text-muted-foreground bg-muted/40"
                            }`}
                          >
                            {isPositive ? `+${fmt(dailyNet)}` : isNegative ? `-${fmt(Math.abs(dailyNet))}` : fmt(0)}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Filas del Día */}
                      <div className="divide-y divide-[#E4E0D8]/60 dark:divide-white/5">
                        {items.map((row) => {
                          const isSelected = selectedId === row.id;
                          const acct = accounts.find((a) => a.id === row.accountId);
                          const isVirtual = row._virtual;
                          const isIncome = row.type === "income";
                          const isSaving = row.type === "saving";
                          const isTransfer = row.type === "transfer";

                          return (
                            <div
                              key={row.id}
                              onClick={() => handleSelectRow(row)}
                              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.99] ${
                                isSelected
                                  ? "bg-muted/80 ring-1 ring-primary/40 shadow-xs"
                                  : "hover:bg-muted/40"
                              }`}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleSelectRow(row);
                                }
                              }}
                              aria-label={`Ver detalles de ${row.concept}`}
                            >
                              {/* Icono e Información Izquierda */}
                              <div className="flex items-center gap-3 min-w-0 pr-3">
                                <div className="shrink-0 size-9 rounded-lg bg-card border border-[#E4E0D8] dark:border-white/10 flex items-center justify-center text-foreground shadow-2xs">
                                  <IconDisplay icon={iconFor(row)} />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                      {row.concept}
                                    </p>
                                    {isVirtual && (
                                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                                        Deuda
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate mt-0.5">
                                    <span>{row.category}</span>
                                    {acct && (
                                      <>
                                        <span>·</span>
                                        <span className="truncate">{acct.name}</span>
                                      </>
                                    )}
                                    {row.note && (
                                      <>
                                        <span>·</span>
                                        <span className="italic truncate max-w-[120px]">{row.note}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Monto y Estado Derecho */}
                              <div className="text-right shrink-0 flex items-center gap-2">
                                <p
                                  className={`font-mono-tabular text-sm font-semibold tabular-nums whitespace-nowrap ${
                                    isIncome
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : isTransfer
                                      ? "text-sky-700 dark:text-sky-400"
                                      : isSaving
                                      ? "text-blue-700 dark:text-blue-400"
                                      : "text-rose-700 dark:text-rose-400"
                                  }`}
                                >
                                  {`${isIncome ? "+" : isTransfer ? "⇄" : "-"}${fmt(row.amount)}`}
                                </p>
                                <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-foreground transition-colors hidden sm:block" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* COLUMNA DERECHA (col-span-5): Panel Inspector / Formulario Master-Detail (Desktop lg:) */}
          <aside className="hidden lg:block lg:col-span-5 sticky top-20" aria-label="Inspector de detalle">
            {selectedRow ? (
              <div className="rounded-2xl border border-[#E4E0D8] dark:border-white/10 bg-card p-5 shadow-xs space-y-5">
                {/* Cabecera del Inspector */}
                <div className="flex items-start justify-between pb-3 border-b border-[#E4E0D8] dark:border-white/10">
                  <div className="min-w-0 pr-3">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Inspector de Movimiento
                    </span>
                    <h3 className="font-display-v2 text-xl font-bold tracking-tight text-foreground truncate mt-0.5">
                      {selectedRow.concept}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!selectedRow._virtual && (
                      <Button
                        size="sm"
                        variant={isEditingSelected ? "default" : "outline"}
                        onClick={() => setIsEditingSelected(!isEditingSelected)}
                        className="h-8 text-xs rounded-lg gap-1"
                      >
                        <Pencil className="size-3" strokeWidth={1.5} />
                        {isEditingSelected ? "Ver" : "Editar"}
                      </Button>
                    )}
                    <button
                      onClick={() => setSelectedId(null)}
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      title="Cerrar panel"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Monto Prominente */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-[#E4E0D8]/60 dark:border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">Monto registrado</span>
                    <p
                      className={`font-mono-tabular text-2xl font-bold tabular-nums ${
                        selectedRow.type === "income"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : selectedRow.type === "transfer"
                          ? "text-sky-700 dark:text-sky-400"
                          : selectedRow.type === "saving"
                          ? "text-blue-700 dark:text-blue-400"
                          : "text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {`${selectedRow.type === "income" ? "+" : selectedRow.type === "transfer" ? "⇄" : "-"}${fmt(selectedRow.amount)}`}
                    </p>
                  </div>
                  <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-foreground/10 text-foreground">
                    {selectedRow.type === "income"
                      ? "Ingreso"
                      : selectedRow.type === "transfer"
                      ? "Traspaso"
                      : selectedRow.type === "saving"
                      ? "Ahorro"
                      : "Gasto"}
                  </span>
                </div>

                {/* Contenido en Modo Edición vs Modo Vista */}
                {isEditingSelected && !selectedRow._virtual ? (
                  <TransactionEditForm
                    transaction={selectedRow as Transaction}
                    accounts={accounts}
                    onSave={(updated) => {
                      updateTx(selectedRow.id, updated);
                      setIsEditingSelected(false);
                      toast.success("Movimiento actualizado");
                    }}
                    onCancel={() => setIsEditingSelected(false)}
                    onDelete={() => setDeleteConfirm(selectedRow)}
                  />
                ) : (
                  <TransactionDetailView
                    row={selectedRow}
                    accounts={accounts}
                    onDelete={() => setDeleteConfirm(selectedRow)}
                  />
                )}
              </div>
            ) : (
              /* Panel Inspector Desocupado */
              <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                  <SlidersHorizontal className="size-5" strokeWidth={1.5} />
                </div>
                <h4 className="font-display-v2 text-base font-semibold text-foreground">
                  Detalle de Movimiento
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Haz clic en cualquier transacción de la lista para inspeccionar sus datos, comprobantes o editar sus valores en tiempo real.
                </p>
                <Button
                  size="sm"
                  onClick={() => handleOpenNew("expense")}
                  className="text-xs rounded-lg bg-primary text-primary-foreground font-medium mt-1"
                >
                  <Plus className="size-3.5 mr-1" strokeWidth={1.75} />
                  Nuevo movimiento
                </Button>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* DRAWER MÓVIL (< lg): Inspección y Edición al pulsar una fila */}
      <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <DrawerContent className="lg:hidden max-h-[90dvh] px-4 pb-10">
          <DrawerHeader className="text-left px-0 pb-2">
            <DrawerTitle className="font-display-v2 text-lg font-bold line-clamp-2 break-words leading-snug">
              {selectedRow?.concept ?? "Detalle"}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Inspecciona o edita los detalles de la transacción.
            </DrawerDescription>
          </DrawerHeader>

          {selectedRow && (
            <div className="space-y-4 pt-2">
              {/* Monto en Móvil */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-[#E4E0D8]/60 dark:border-white/5">
                <span className="text-xs text-muted-foreground font-medium">Monto</span>
                <span
                  className={`font-mono-tabular text-xl font-bold tabular-nums ${
                    selectedRow.type === "income"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : selectedRow.type === "transfer"
                      ? "text-sky-700 dark:text-sky-400"
                      : selectedRow.type === "saving"
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {`${selectedRow.type === "income" ? "+" : selectedRow.type === "transfer" ? "⇄" : "-"}${fmt(selectedRow.amount)}`}
                </span>
              </div>

              {isEditingSelected && !selectedRow._virtual ? (
                <TransactionEditForm
                  transaction={selectedRow as Transaction}
                  accounts={accounts}
                  onSave={(updated) => {
                    updateTx(selectedRow.id, updated);
                    setIsEditingSelected(false);
                    setIsMobileDrawerOpen(false);
                    toast.success("Movimiento actualizado");
                  }}
                  onCancel={() => setIsEditingSelected(false)}
                  onDelete={() => {
                    setIsMobileDrawerOpen(false);
                    setDeleteConfirm(selectedRow);
                  }}
                />
              ) : (
                <div className="space-y-3">
                  <TransactionDetailView
                    row={selectedRow}
                    accounts={accounts}
                    onDelete={() => {
                      setIsMobileDrawerOpen(false);
                      setDeleteConfirm(selectedRow);
                    }}
                    onCloseDrawer={() => setIsMobileDrawerOpen(false)}
                  />
                  {!selectedRow._virtual && (
                    <Button
                      onClick={() => setIsEditingSelected(true)}
                      className="w-full text-xs rounded-lg"
                      variant="outline"
                    >
                      <Pencil className="size-3.5 mr-1.5" />
                      Editar transacción
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <DrawerFooter className="px-0 pt-3">
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full text-xs">
                Cerrar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* DIÁLOGO: Nuevo Movimiento Completo */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto p-5 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display-v2 text-lg font-bold">
              Nuevo Movimiento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registra un gasto, ingreso, ahorro o traspaso en tu cuenta.
            </DialogDescription>
          </DialogHeader>

          <TransactionCreateForm
            defaultType={newDefaultType}
            accounts={accounts}
            activeYear={activeYear}
            activeMonth={activeMonth}
            onSave={(newTx) => {
              addTx(newTx);
              setIsNewModalOpen(false);
              toast.success("Movimiento registrado");
            }}
            onCancel={() => setIsNewModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: Confirmación Elegante de Eliminación */}
      <ElegantConfirm
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
        title="¿Eliminar movimiento?"
        description={
          deleteConfirm
            ? `Se eliminará "${deleteConfirm.concept}" (${fmt(deleteConfirm.amount)}). Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Eliminar"
        destructive
        onConfirm={() => {
          if (deleteConfirm) {
            if (deleteConfirm._virtual) {
              const debtId = deleteConfirm._debtId;
              if (deleteConfirm.id.startsWith("pay-")) {
                const paymentId = deleteConfirm.id.replace(`pay-${debtId}-`, "");
                removeDebtPayment(debtId, paymentId);
              } else if (deleteConfirm.id.startsWith("debt-")) {
                removeDebt(debtId);
              }
            } else {
              removeTx(deleteConfirm.id);
            }
            if (selectedId === deleteConfirm.id) {
              setSelectedId(null);
            }
            setDeleteConfirm(null);
            toast.success("Movimiento eliminado");
          }
        }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Componente de Vista Detallada (Inspector en Modo Lectura)
// -----------------------------------------------------------------------------
function TransactionDetailView({
  row,
  accounts,
  onDelete,
  onCloseDrawer,
}: {
  row: MovimientoRow;
  accounts: Account[];
  onDelete: () => void;
  onCloseDrawer?: () => void;
}) {
  const navigate = useNavigate();
  const { customCategories = [] } = useFinanceData();
  const acct = accounts.find((a) => a.id === row.accountId);
  const isVirtual = row._virtual;
  const destAcct = !isVirtual && row.type === "transfer" && row.transferToAccountId
    ? accounts.find((a) => a.id === row.transferToAccountId)
    : undefined;
  const ext = row.externalPayee;
  const receipt = row.receipt;

  return (
    <div className="space-y-4 text-xs">
      {/* Especificaciones Clave */}
      <div className="grid grid-cols-2 gap-3 py-1">
        <div>
          <span className="text-muted-foreground block text-[11px]">Categoría</span>
          <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
            <span>{emojiFor(row.category, customCategories)}</span>
            {row.category}
          </span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px]">Fecha</span>
          <span className="font-mono-tabular font-medium text-foreground mt-0.5 block">
            {fmtDate(row.date)}
          </span>
        </div>

        <div>
          <span className="text-muted-foreground block text-[11px]">Cuenta</span>
          <span className="font-medium text-foreground mt-0.5 block truncate">
            {acct?.name ?? "No asignada"}
          </span>
        </div>

        {row.type === "transfer" && destAcct && (
          <div>
            <span className="text-muted-foreground block text-[11px]">Cuenta destino</span>
            <span className="font-medium text-foreground mt-0.5 block truncate">
              {destAcct.name}
            </span>
          </div>
        )}

        {row.paymentMethod && (
          <div>
            <span className="text-muted-foreground block text-[11px]">Método</span>
            <span className="font-medium text-foreground mt-0.5 block">
              {PAYMENT_METHOD_EMOJI[row.paymentMethod]}{" "}
              {PAYMENT_METHOD_LABEL[row.paymentMethod]}
            </span>
          </div>
        )}
      </div>

      {/* Datos de Beneficiario / CLABE si existen */}
      {ext && (ext.name || ext.bank || ext.clabe) && (
        <div className="p-3 rounded-xl bg-muted/40 space-y-1.5 border border-[#E4E0D8]/60 dark:border-white/5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Beneficiario externo
          </span>
          {ext.name && (
            <p className="text-foreground">
              <span className="text-muted-foreground">Titular:</span> {ext.name}
            </p>
          )}
          {ext.bank && (
            <p className="text-foreground">
              <span className="text-muted-foreground">Banco:</span> {ext.bank}
            </p>
          )}
          {ext.clabe && (
            <p className="font-mono-tabular text-foreground">
              <span className="text-muted-foreground">CLABE:</span> {ext.clabe}
            </p>
          )}
        </div>
      )}

      {/* Notas Adicionales */}
      {row.note && (
        <div className="p-3 rounded-xl bg-muted/30 border border-[#E4E0D8]/60 dark:border-white/5 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Nota
          </span>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{row.note}</p>
        </div>
      )}

      {/* Comprobante / Recibo */}
      {receipt && (
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
            Comprobante adjunto
          </span>
          <img
            src={receipt}
            alt="Comprobante"
            className="rounded-lg max-h-48 w-full object-contain bg-black/5 dark:bg-white/5 p-1"
          />
        </div>
      )}

      {/* Virtual de Deudas */}
      {isVirtual && (
        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 space-y-2">
          <p className="text-purple-900 dark:text-purple-200 text-xs">
            Este movimiento está vinculado al módulo de Deudas. Puedes gestionarlo o abonar directamente desde allí.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onCloseDrawer) onCloseDrawer();
              navigate(`/deudas?id=${row._debtId}`);
            }}
            className="w-full text-xs gap-1 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
          >
            <ExternalLink className="size-3" />
            Ver en Deudas
          </Button>
        </div>
      )}

      {/* Botón de Eliminación (Transacciones reales o deudas virtuales) */}
      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="w-full text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg gap-1.5"
        >
          <Trash2 className="size-3.5" strokeWidth={1.5} />
          {row._virtual
            ? row.id.startsWith("pay-")
              ? "Eliminar abono de deuda"
              : row.type === "income" || (row.concept && row.concept.startsWith("Deuda"))
              ? "Eliminar deuda"
              : "Eliminar préstamo"
            : "Eliminar movimiento"}
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Formulario de Edición en Vivo
// -----------------------------------------------------------------------------
function TransactionEditForm({
  transaction,
  accounts,
  onSave,
  onCancel,
  onDelete,
}: {
  transaction: Transaction;
  accounts: Account[];
  onSave: (tx: Omit<Transaction, "id">) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [type, setType] = useState<TxType>(transaction.type);
  const [concept, setConcept] = useState(transaction.concept);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category);
  const [date, setDate] = useState(transaction.date.slice(0, 10));
  const [accountId, setAccountId] = useState(transaction.accountId ?? "");
  const [transferToAccountId, setTransferToAccountId] = useState(transaction.transferToAccountId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction.paymentMethod ?? "card");
  const [note, setNote] = useState(transaction.note ?? "");
  const [icon, setIcon] = useState<IconRef | undefined>(transaction.icon);
  const [receipt, setReceipt] = useState<string | undefined>(transaction.receipt);

  const cashAccount = accounts.find((a: Account) => a.type === "cash");
  const bankAccounts = accounts.filter((a: Account) => a.type !== "cash");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!concept.trim()) {
      toast.error("El concepto es obligatorio");
      return;
    }
    if (!date) {
      toast.error("Selecciona una fecha válida");
      return;
    }
    const dateObj = new Date(`${date}T12:00:00`);
    if (isNaN(dateObj.getTime())) {
      toast.error("Fecha inválida");
      return;
    }
    if (type === "transfer") {
      if (!accountId) {
        toast.error("Selecciona la cuenta origen");
        return;
      }
      if (!transferToAccountId) {
        toast.error("Selecciona la cuenta destino");
        return;
      }
      if (accountId === transferToAccountId) {
        toast.error("La cuenta origen y destino no pueden ser la misma");
        return;
      }
    }

    onSave({
      type,
      concept: concept.trim(),
      amount: parsedAmount,
      category,
      date: dateObj.toISOString(),
      accountId: accountId || undefined,
      transferToAccountId: type === "transfer" ? transferToAccountId : undefined,
      paymentMethod,
      note: note.trim() || undefined,
      icon,
      externalPayee: transaction.externalPayee,
      receipt,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      {/* Botones de Tipo */}
      <div className="grid grid-cols-4 gap-1">
        {FILTER_TABS.filter((t) => t.k !== "all").map((tab) => (
          <button
            key={tab.k}
            type="button"
            onClick={() => setType(tab.k as TxType)}
            className={`py-1.5 rounded-lg text-[11px] font-medium transition ${
              type === tab.k
                ? "bg-foreground text-background font-semibold"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Selector de Icono / Emoji */}
      <div className="flex justify-center py-1">
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <div>
        <Label className="text-[11px]">Concepto</Label>
        <Input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className="h-8 text-xs rounded-lg mt-1"
          placeholder="Ej. Cena familiar"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px]">Monto</Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 text-xs rounded-lg mt-1 font-mono-tabular"
            placeholder="0.00"
          />
        </div>

        <div>
          <Label className="text-[11px]">Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-xs rounded-lg mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px]">Categoría</Label>
          <div className="mt-1">
            <CategorySelectWithCreate
              value={category}
              onChange={setCategory}
              triggerClassName="h-8 text-xs rounded-lg"
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px]">Cuenta {type === "transfer" ? "origen" : ""}</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-8 text-xs rounded-lg mt-1">
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a: Account) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {type === "transfer" ? (
        <div>
          <Label className="text-[11px]">Cuenta destino</Label>
          <Select value={transferToAccountId} onValueChange={setTransferToAccountId}>
            <SelectTrigger className="h-8 text-xs rounded-lg mt-1">
              <SelectValue placeholder="Selecciona destino" />
            </SelectTrigger>
            <SelectContent>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a: Account) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div>
          <Label className="text-[11px]">Método de pago</Label>
          <Select
            value={paymentMethod}
            onValueChange={(v) => {
              const m = v as PaymentMethod;
              setPaymentMethod(m);
              if (m === "cash" && cashAccount) {
                setAccountId(cashAccount.id);
              } else if ((m === "card" || m === "transfer") && accountId === cashAccount?.id) {
                if (bankAccounts[0]) setAccountId(bankAccounts[0].id);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs rounded-lg mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHOD_EMOJI[m]} {PAYMENT_METHOD_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-[11px]">Nota (opcional)</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-8 text-xs rounded-lg mt-1"
          placeholder="Detalles adicionales..."
        />
      </div>

      {/* Comprobante */}
      <div>
        <Label className="text-[11px]">Comprobante (opcional)</Label>
        <label
          htmlFor="edit-receipt-upload"
          className="flex items-center justify-center gap-2 h-8 px-3 rounded-lg border border-dashed border-[#E4E0D8] dark:border-white/15 bg-muted/30 hover:bg-muted/60 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition mt-1 active:scale-[0.99]"
        >
          <Upload className="size-3.5 text-primary shrink-0" strokeWidth={1.75} />
          <span className="truncate">
            {receipt ? "Comprobante adjuntado (toca para cambiar)" : "Adjuntar comprobante o imagen"}
          </span>
          <input
            id="edit-receipt-upload"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                setReceipt(typeof reader.result === "string" ? reader.result : undefined);
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
        {receipt && (
          <div className="relative mt-1.5 inline-block">
            <img
              src={receipt}
              alt="Comprobante"
              className="rounded-lg max-h-24 object-contain bg-black/5 dark:bg-white/5 p-1 border border-[#E4E0D8] dark:border-white/10"
            />
            <button
              type="button"
              onClick={() => setReceipt(undefined)}
              className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-black"
              title="Quitar comprobante"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <Trash2 className="size-3.5 mr-1" />
          Eliminar
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs">
            Cancelar
          </Button>
          <Button type="submit" size="sm" className="text-xs bg-primary text-primary-foreground font-medium">
            Guardar cambios
          </Button>
        </div>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Formulario de Creación de Nuevo Movimiento
// -----------------------------------------------------------------------------
function TransactionCreateForm({
  defaultType,
  accounts,
  activeYear,
  activeMonth,
  onSave,
  onCancel,
}: {
  defaultType: TxType;
  accounts: Account[];
  activeYear: number;
  activeMonth: number;
  onSave: (tx: Omit<Transaction, "id">) => void;
  onCancel: () => void;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const defaultDateStr = `${activeYear}-${pad(activeMonth + 1)}-${pad(Math.min(today.getDate(), 28))}`;

  const [type, setType] = useState<TxType>(defaultType);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(defaultType === "income" ? "Trabajo / Sueldo" : "Alimentación");
  const [date, setDate] = useState(defaultDateStr);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [transferToAccountId, setTransferToAccountId] = useState(accounts[1]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [note, setNote] = useState("");
  const [icon, setIcon] = useState<IconRef | undefined>(undefined);
  const [receipt, setReceipt] = useState<string | undefined>(undefined);

  const cashAccount = accounts.find((a: Account) => a.type === "cash");
  const bankAccounts = accounts.filter((a: Account) => a.type !== "cash");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (!concept.trim()) {
      toast.error("El concepto es obligatorio");
      return;
    }
    if (!date) {
      toast.error("Selecciona una fecha válida");
      return;
    }
    const dateObj = new Date(`${date}T12:00:00`);
    if (isNaN(dateObj.getTime())) {
      toast.error("Fecha inválida");
      return;
    }
    if (type === "transfer") {
      if (!accountId) {
        toast.error("Selecciona la cuenta origen");
        return;
      }
      if (!transferToAccountId) {
        toast.error("Selecciona la cuenta destino");
        return;
      }
      if (accountId === transferToAccountId) {
        toast.error("La cuenta origen y destino no pueden ser la misma");
        return;
      }
    }

    onSave({
      type,
      concept: concept.trim(),
      amount: parsedAmount,
      category,
      date: dateObj.toISOString(),
      accountId: accountId || undefined,
      transferToAccountId: type === "transfer" ? transferToAccountId : undefined,
      paymentMethod,
      note: note.trim() || undefined,
      icon,
      receipt,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs pt-1">
      {/* Botones de Selección de Tipo */}
      <div className="grid grid-cols-4 gap-1.5">
        {FILTER_TABS.filter((t) => t.k !== "all").map((tab) => (
          <button
            key={tab.k}
            type="button"
            onClick={() => {
              setType(tab.k as TxType);
              if (tab.k === "income") setCategory("Trabajo / Sueldo");
              else if (tab.k === "saving") setCategory("Ahorro e Inversión");
              else setCategory("Alimentación");
            }}
            className={`py-2 rounded-lg text-xs font-medium transition ${
              type === tab.k
                ? "bg-foreground text-background font-semibold shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Selector de Icono / Emoji */}
      <div className="flex justify-center py-1">
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <div>
        <Label className="text-xs">Concepto</Label>
        <Input
          autoFocus
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className="h-9 text-xs rounded-lg mt-1"
          placeholder={type === "transfer" ? "Traspaso entre cuentas" : "Ej. Compra de despensa"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className="text-xs">Monto ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-9 text-sm font-bold rounded-lg mt-1 font-mono-tabular"
            placeholder="0.00"
          />
        </div>

        <div>
          <Label className="text-xs">Fecha</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 text-xs rounded-lg mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <Label className="text-xs">Categoría</Label>
          <div className="mt-1">
            <CategorySelectWithCreate
              value={category}
              onChange={setCategory}
              triggerClassName="h-9 text-xs rounded-lg"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Cuenta {type === "transfer" ? "origen" : ""}</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-9 text-xs rounded-lg mt-1">
              <SelectValue placeholder="Selecciona cuenta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a: Account) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {type === "transfer" ? (
        <div>
          <Label className="text-xs">Cuenta destino</Label>
          <Select value={transferToAccountId} onValueChange={setTransferToAccountId}>
            <SelectTrigger className="h-9 text-xs rounded-lg mt-1">
              <SelectValue placeholder="Selecciona cuenta destino" />
            </SelectTrigger>
            <SelectContent>
              {accounts
                .filter((a) => a.id !== accountId)
                .map((a: Account) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div>
          <Label className="text-xs">Método de pago</Label>
          <Select
            value={paymentMethod}
            onValueChange={(v) => {
              const m = v as PaymentMethod;
              setPaymentMethod(m);
              if (m === "cash" && cashAccount) {
                setAccountId(cashAccount.id);
              } else if ((m === "card" || m === "transfer") && accountId === cashAccount?.id) {
                if (bankAccounts[0]) setAccountId(bankAccounts[0].id);
              }
            }}
          >
            <SelectTrigger className="h-9 text-xs rounded-lg mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHOD_EMOJI[m]} {PAYMENT_METHOD_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-xs">Nota (opcional)</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-9 text-xs rounded-lg mt-1"
          placeholder="Añade un detalle o referencia..."
        />
      </div>

      {/* Comprobante */}
      <div>
        <Label className="text-xs">Comprobante (opcional)</Label>
        <label
          htmlFor="new-receipt-upload"
          className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-dashed border-[#E4E0D8] dark:border-white/15 bg-muted/30 hover:bg-muted/60 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition mt-1 active:scale-[0.99]"
        >
          <Upload className="size-3.5 text-primary shrink-0" strokeWidth={1.75} />
          <span className="truncate">
            {receipt ? "Comprobante adjuntado (toca para cambiar)" : "Adjuntar imagen o comprobante"}
          </span>
          <input
            id="new-receipt-upload"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                setReceipt(typeof reader.result === "string" ? reader.result : undefined);
              };
              reader.readAsDataURL(file);
            }}
          />
        </label>
        {receipt && (
          <div className="relative mt-2 inline-block">
            <img
              src={receipt}
              alt="Comprobante"
              className="rounded-lg max-h-24 object-contain bg-black/5 dark:bg-white/5 p-1 border border-[#E4E0D8] dark:border-white/10"
            />
            <button
              type="button"
              onClick={() => setReceipt(undefined)}
              className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center text-xs hover:bg-black"
              title="Quitar comprobante"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="text-xs rounded-lg">
          Cancelar
        </Button>
        <Button type="submit" size="sm" className="text-xs rounded-lg bg-primary text-primary-foreground font-medium">
          Registrar movimiento
        </Button>
      </div>
    </form>
  );
}
