import React, { useEffect, useMemo, useState } from "react";
import { useHybridData } from "@/hooks/useHybridData";
import { useFinance } from "@/store/finance-store";
import { fmt, CATEGORY_EMOJI, MONTHS, iconFor, IconRef, Transaction, PaymentMethod, PAYMENT_METHOD_LABEL, PAYMENT_METHOD_EMOJI, fmtDate, parseDateLocal, Account } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Plus, Trash2, Search, Pencil, Calendar, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "@/lib/framer";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { IconDisplay } from "@/components/app/IconDisplay";
import { IconPicker } from "@/components/app/IconPicker";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

type TxType = "income" | "expense" | "saving" | "transfer";

const DATE_PRESETS = [
  { key: "today", label: "Hoy", icon: Calendar },
  { key: "yesterday", label: "Ayer" },
  { key: "last7", label: "7 días" },
  { key: "last30", label: "30 días" },
  { key: "custom", label: "Personalizado" },
] as const;

const FILTER_TABS = [
  { k: "all", label: "Todo" },
  { k: "expense", label: "Gastos" },
  { k: "income", label: "Ingresos" },
  { k: "saving", label: "Ahorros" },
] as const;

export default function Movimientos() {
  const { transactions, addTx, updateTx, removeTx, activeYear, activeMonth, debts, accounts, removeDebt, removeDebtPayment, syncFiltersToURL, setSyncFiltersToURL } = useHybridData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [type, setType] = useState<TxType>("expense");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TxType>("all");
  const [accountFilter, setAccountFilter] = useState<string | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "all">("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "last7" | "last30" | "custom">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const resetFilters = () => {
    setAccountFilter("all"); setCategoryFilter("all"); setPaymentMethodFilter("all"); setFilter("all"); setQuery(""); setDatePreset("all"); setDateFrom(""); setDateTo("");
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasActiveFilters = filter !== "all" || accountFilter !== "all" || categoryFilter !== "all" || paymentMethodFilter !== "all" || datePreset !== "all" || query.trim() !== "";

  useEffect(() => {
    const n = params.get("new");
    if (n === "income" || n === "expense" || n === "saving") {
      setType(n as TxType); setEditing(null); setOpen(true);
      params.delete("new"); setParams(params, { replace: true });
    }
    const qsync = params.get("sync");
    if ((syncFiltersToURL || qsync === "1" || qsync === "true")) {
      const q = params.get("q") ?? "";
      const f = (params.get("filter") as any) ?? "all";
      const acc = params.get("account") ?? "all";
      const cat = params.get("category") ?? "all";
      const method = (params.get("method") as PaymentMethod) ?? "all";
      const dp = (params.get("datePreset") as any) ?? "all";
      const df = params.get("dateFrom") ?? "";
      const dt = params.get("dateTo") ?? "";
      setQuery(q); setFilter(f); setAccountFilter(acc as any);
      setCategoryFilter(cat as any); setPaymentMethodFilter(method as any);
      setDatePreset(dp); setDateFrom(df); setDateTo(dt);
      if (qsync === "1" || qsync === "true") setSyncFiltersToURL(true);
    }
  }, [params, setParams, syncFiltersToURL, setSyncFiltersToURL]);

  useEffect(() => {
    if (!syncFiltersToURL) return;
    const np = new URLSearchParams();
    if (query) np.set("q", query);
    if (filter && filter !== "all") np.set("filter", filter);
    if (accountFilter && accountFilter !== "all") np.set("account", accountFilter);
    if (categoryFilter && categoryFilter !== "all") np.set("category", categoryFilter);
    if (paymentMethodFilter && paymentMethodFilter !== "all") np.set("method", paymentMethodFilter as string);
    if (datePreset && datePreset !== "all") np.set("datePreset", datePreset);
    if (dateFrom) np.set("dateFrom", dateFrom);
    if (dateTo) np.set("dateTo", dateTo);
    np.set("sync", "1");
    setParams(np, { replace: true });
  }, [filter, accountFilter, categoryFilter, paymentMethodFilter, query, datePreset, dateFrom, dateTo, syncFiltersToURL, setParams]);

  useEffect(() => {
    if (syncFiltersToURL) return;
    const keys = ["q", "filter", "account", "category", "method", "datePreset", "dateFrom", "dateTo", "sync"];
    const np = new URLSearchParams(params);
    let changed = false;
    for (const k of keys) { if (np.has(k)) { np.delete(k); changed = true; } }
    if (changed) setParams(np, { replace: true });
  }, [syncFiltersToURL, params, setParams]);

  const inMonth = useMemo(() => transactions.filter((t) => {
    const d = parseDateLocal(t.date);
    return d.getFullYear() === activeYear && d.getMonth() === activeMonth;
  }), [transactions, activeYear, activeMonth]);

  type Row = (Transaction & { _virtual?: false }) | {
    id: string; type: "income" | "expense" | "saving"; category: string; concept: string;
    amount: number; date: string; note?: string; icon?: IconRef; paymentMethod?: PaymentMethod;
    accountId?: string; transferToAccountId?: string;
    externalPayee?: { clabe?: string; bank?: string; name?: string }; receipt?: string;
    _virtual: true; _debtId: string;
  };

  const debtRows: Row[] = useMemo(() => {
    const rows: Row[] = [];
    debts.forEach((d) => {
      const dd = parseDateLocal(d.date);
      if (dd.getFullYear() === activeYear && dd.getMonth() === activeMonth) {
        rows.push({ id: `debt-${d.id}`, type: "expense", category: "Préstamo", concept: `Préstamo a ${d.person}`, amount: d.amount, date: d.date, note: d.concept, icon: d.icon, _virtual: true, _debtId: d.id });
      }
      d.payments.forEach((p: any) => {
        const pd = parseDateLocal(p.date);
        if (pd.getFullYear() === activeYear && pd.getMonth() === activeMonth) {
          rows.push({ id: `pay-${d.id}-${p.id}`, type: "income", category: "Abono", concept: `Abono de ${d.person}`, amount: p.amount, date: p.date, note: p.note, icon: d.icon, paymentMethod: p.paymentMethod, accountId: p.accountId, _virtual: true, _debtId: d.id });
        }
      });
    });
    return rows;
  }, [debts, activeYear, activeMonth]);

  const allRows: Row[] = useMemo(() => [...inMonth.map((t) => t as Row), ...debtRows], [inMonth, debtRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let startDate: Date | undefined, endDate: Date | undefined;
    if (datePreset && datePreset !== "all") {
      const today = new Date();
      if (datePreset === "today") { startDate = dateOnly(today); endDate = dateOnly(today); }
      else if (datePreset === "yesterday") { const y = new Date(today); y.setDate(y.getDate() - 1); startDate = dateOnly(y); endDate = dateOnly(y); }
      else if (datePreset === "last7") { const s = new Date(today); s.setDate(s.getDate() - 6); startDate = dateOnly(s); endDate = dateOnly(today); }
      else if (datePreset === "last30") { const s = new Date(today); s.setDate(s.getDate() - 29); startDate = dateOnly(s); endDate = dateOnly(today); }
      else if (datePreset === "custom" && dateFrom) { startDate = dateOnly(parseDateLocal(dateFrom)); endDate = dateTo ? dateOnly(parseDateLocal(dateTo)) : startDate; }
    }
    return allRows
      .filter((t) => filter === "all" || t.type === filter)
      .filter((t) => accountFilter === "all" || (t as any).accountId === accountFilter)
      .filter((t) => categoryFilter === "all" || (t.category === categoryFilter))
      .filter((t) => paymentMethodFilter === "all" || ((t as any).paymentMethod === paymentMethodFilter))
      .filter((t) => {
        if (!q) return true;
        const pmLabel = (t as any).paymentMethod ? (PAYMENT_METHOD_LABEL as Record<string, string>)[(t as any).paymentMethod] ?? "" : "";
        return (t.concept || "").toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q) || pmLabel.toLowerCase().includes(q);
      })
      .filter((t) => {
        if (!startDate) return true;
        const d = dateOnly(parseDateLocal(t.date));
        return d >= startDate && d <= endDate;
      })
      .sort((a, b) => parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime());
  }, [allRows, filter, accountFilter, categoryFilter, paymentMethodFilter, query, datePreset, dateFrom, dateTo]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    filtered.forEach((t) => { const k = fmtDate(t.date); (g[k] ||= []).push(t); });
    return g;
  }, [filtered]);

  const openEdit = (t: Transaction) => { setEditing(t); setType(t.type); setOpen(true); };
  const openNew = () => { setEditing(null); setOpen(true); };

  return (
    <div>
      <Header title="Movimientos" subtitle={`${MONTHS[activeMonth]} ${activeYear}`} action={
        <div className="flex items-center gap-2">
          <button onClick={() => setFiltersOpen(true)} className="lg:hidden size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition relative">
            <SlidersHorizontal className="size-4" />
            {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary" />}
          </button>
          <Button onClick={openNew} className="rounded-xl gradient-primary text-primary-foreground shadow-glow border-0 h-10 text-sm"><Plus className="size-4 mr-1.5" />Nuevo</Button>
        </div>
      } />

      <div className="px-5 mb-3 flex justify-center"><MonthSwitcher /></div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto p-5">
          <DialogHeader><DialogTitle className="text-lg">{editing ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle></DialogHeader>
          <DialogDescription className="sr-only">Formulario para crear o editar un movimiento</DialogDescription>
          <TxForm
            initial={editing ?? { type, date: new Date(activeYear, activeMonth, Math.min(new Date().getDate(), 28)).toISOString() }}
            onSave={(t) => {
              if (editing) {
                if ((editing as any)._virtual) { toast.info("Edita el abono desde la sección Deudas"); navigate("/deudas"); }
                else { updateTx(editing.id, t); toast.success("Actualizado"); }
              } else { addTx(t as Omit<Transaction, "id">); toast.success("Movimiento agregado"); }
              setOpen(false); setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="px-4 sm:px-5 space-y-3">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." className="pl-9 h-10 rounded-xl bg-card border-border text-sm" />
          </div>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {FILTER_TABS.map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k as typeof filter)}
              className={`shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold transition ${filter === f.k ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >{f.label}</button>
          ))}
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {DATE_PRESETS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setDatePreset(key)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${datePreset === key ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >{Icon && <Icon className="size-3" />}{label}</button>
          ))}
        </div>

        <div className="hidden lg:flex lg:gap-3">
          <div className="flex-1">
            <Label className="text-xs font-semibold">Cuenta</Label>
            <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v)}>
              <SelectTrigger className="h-10 rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cuentas</SelectItem>
                {accounts.map((a: Account) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold">Categoría</Label>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <SelectTrigger className="h-10 rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.keys(CATEGORY_EMOJI).map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold">Método</Label>
            <Select value={paymentMethodFilter} onValueChange={(v) => setPaymentMethodFilter(v as any)}>
              <SelectTrigger className="h-10 rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>{PAYMENT_METHOD_EMOJI[m]} {PAYMENT_METHOD_LABEL[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-xs font-semibold">Fechas</Label>
            {datePreset === "custom" ? (
              <div className="flex gap-1 mt-1">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 rounded-xl text-xs" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 rounded-xl text-xs" />
              </div>
            ) : (
              <div className="h-10 rounded-xl bg-card border border-border flex items-center px-3 text-xs text-muted-foreground mt-1">
                {datePreset === "today" ? "Hoy" : datePreset === "yesterday" ? "Ayer" : datePreset === "last7" ? "Últimos 7 días" : datePreset === "last30" ? "Últimos 30 días" : "Selecciona un preset"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters dialog */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="lg:hidden rounded-2xl max-w-md mx-auto p-5">
          <DialogHeader><DialogTitle className="text-lg">Filtros</DialogTitle></DialogHeader>
          <DialogDescription className="sr-only">Filtros avanzados</DialogDescription>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Cuenta</Label>
              <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v)}>
                <SelectTrigger className="h-10 rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  {accounts.map((a: Account) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Categoría</Label>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                <SelectTrigger className="h-10 rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {Object.keys(CATEGORY_EMOJI).map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Método</Label>
              <Select value={paymentMethodFilter} onValueChange={(v) => setPaymentMethodFilter(v as any)}>
                <SelectTrigger className="h-10 rounded-xl mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>{PAYMENT_METHOD_EMOJI[m]} {PAYMENT_METHOD_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 rounded-xl" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 rounded-xl" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={resetFilters} className="rounded-xl">Limpiar</Button>
            <Button onClick={() => setFiltersOpen(false)} className="rounded-xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">Aplicar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="px-4 sm:px-5 mt-5 space-y-5">
        {Object.keys(grouped).length === 0 && (
          <div className="rounded-xl bg-muted/50 border border-dashed border-border p-8 text-center">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm text-muted-foreground">Sin movimientos en {MONTHS[activeMonth]} {activeYear}</p>
          </div>
        )}
        <div className="lg:hidden">
          <AnimatePresence>
            {Object.entries(grouped).map(([day, items]) => (
              <motion.section key={day} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 px-1">{day}</p>
                <div className="space-y-1.5">
                  {items.map((t) => {
                    const acct = accounts.find((a) => a.id === (t as any).accountId);
                    if ((t as any)._virtual) {
                      const allAccounts = useFinance.getState().accounts;
                      const vacct = accounts.find((a: Account) => a.id === (t as any).accountId) ?? allAccounts.find((a: Account) => a.id === (t as any).accountId);
                      const ext = (t as any).externalPayee as { clabe?: string; bank?: string; name?: string } | undefined;
                      const receipt = (t as any).receipt as string | undefined;
                      const isExpanded = expandedId === t.id;
                      return (
                        <motion.div key={t.id} layout className="rounded-xl bg-card border border-border shadow-soft">
                          <div className="p-3 flex items-center gap-3">
                            <IconDisplay icon={iconFor(t)} />
                            <button onClick={() => openEdit(t as Transaction)} className="flex-1 min-w-0 text-left">
                              <p className="font-semibold text-sm truncate">{t.concept}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {t.category}{vacct && <span className="ml-1">· {vacct.name}</span>}
                              </p>
                            </button>
                            <div className="text-right">
                              <p className="font-bold text-sm text-success">+{fmt(t.amount)}</p>
                            </div>
                            <button onClick={() => setExpandedId(isExpanded ? null : t.id)} className="text-muted-foreground hover:text-primary p-1">
                              <ChevronDown className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-1 text-xs text-muted-foreground border-t border-border pt-2">
                              <p><span className="font-semibold text-foreground">Cuenta:</span> {vacct?.name ?? "No asignada"}</p>
                              {(t as any).paymentMethod && <p><span className="font-semibold text-foreground">Método:</span> {PAYMENT_METHOD_EMOJI[(t as any).paymentMethod as PaymentMethod]} {PAYMENT_METHOD_LABEL[(t as any).paymentMethod as PaymentMethod]}</p>}
                              {ext?.clabe && <p><span className="font-semibold text-foreground">CLABE:</span> {ext.clabe}</p>}
                              {ext?.bank && <p><span className="font-semibold text-foreground">Banco:</span> {ext.bank}</p>}
                              {ext?.name && <p><span className="font-semibold text-foreground">Titular:</span> {ext.name}</p>}
                              {receipt && <img src={receipt} alt="comprobante" className="rounded max-h-40 object-contain mt-1" />}
                            </div>
                          )}
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div key={t.id} layout className="rounded-xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
                        <IconDisplay icon={iconFor(t)} />
                        <button onClick={() => openEdit(t as Transaction)} className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-sm truncate">{t.concept}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t.category}{acct && <span className="ml-1">· {acct.name}</span>}
                          </p>
                        </button>
                        <div className="text-right shrink-0">
                          <p className={`font-bold text-sm ${t.type === "income" ? "text-success" : t.type === "saving" ? "text-secondary" : t.type === "transfer" ? "text-primary" : "text-destructive"}`}>
                            {t.type === "income" ? "+" : t.type === "transfer" ? "⇄" : "-"}{fmt(t.amount)}
                          </p>
                        </div>
                        <button onClick={() => setDeleteConfirm(t as Transaction)} className="text-muted-foreground hover:text-destructive p-1 shrink-0"><Trash2 className="size-3.5" /></button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>

        <div className="hidden lg:block">
          <div className="rounded-xl bg-card border border-border shadow-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider font-bold text-muted-foreground">
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Concepto</th>
                  <th className="text-left p-3">Categoría</th>
                  <th className="text-left p-3">Método</th>
                  <th className="text-left p-3">Cuenta</th>
                  <th className="text-right p-3">Monto</th>
                  <th className="text-right p-3"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).flatMap(([day, items]) =>
                  items.map((t) => {
                    if ((t as any)._virtual) {
                      const allAccounts = useFinance.getState().accounts;
                      const vacct = accounts.find((a: Account) => a.id === (t as any).accountId) ?? allAccounts.find((a: Account) => a.id === (t as any).accountId);
                      const ext = (t as any).externalPayee as { clabe?: string; bank?: string; name?: string } | undefined;
                      const receipt = (t as any).receipt as string | undefined;
                      const isExpanded = expandedId === t.id;
                      return (
                        <React.Fragment key={t.id}>
                          <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors bg-accent/5">
                            <td className="p-3 whitespace-nowrap text-muted-foreground text-xs">{day}</td>
                            <td className="p-3"><div className="flex items-center gap-2"><IconDisplay icon={iconFor(t)} /><span className="font-semibold">{t.concept}</span></div></td>
                            <td className="p-3 text-xs text-muted-foreground">{t.category}</td>
                            <td className="p-3 text-xs">{(t as any).paymentMethod ? `${PAYMENT_METHOD_EMOJI[(t as any).paymentMethod as PaymentMethod]} ${PAYMENT_METHOD_LABEL[(t as any).paymentMethod as PaymentMethod]}` : "—"}</td>
                            <td className="p-3 text-xs text-muted-foreground">{vacct?.name ?? "—"}</td>
                            <td className={`p-3 text-right font-bold text-sm whitespace-nowrap ${t.type === "income" ? "text-success" : "text-destructive"}`}>{t.type === "income" ? "+" : "-"}{fmt(t.amount)}</td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <button onClick={() => setExpandedId(isExpanded ? null : t.id)} className="text-muted-foreground hover:text-primary p-1"><ChevronDown className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} /></button>
                              <button onClick={() => openEdit(t as Transaction)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="size-3.5" /></button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-border bg-muted/20">
                              <td colSpan={7} className="p-3 text-xs text-muted-foreground space-y-1">
                                <p><span className="font-semibold text-foreground">Método:</span> {(t as any).paymentMethod ? `${PAYMENT_METHOD_EMOJI[(t as any).paymentMethod as PaymentMethod]} ${PAYMENT_METHOD_LABEL[(t as any).paymentMethod as PaymentMethod]}` : "No especificado"}</p>
                                <p><span className="font-semibold text-foreground">Cuenta destino:</span> {vacct?.name ?? `ID: ${(t as any).accountId ?? "No asignada"}`}</p>
                                {ext?.clabe && <p><span className="font-semibold text-foreground">CLABE:</span> {ext.clabe}</p>}
                                {ext?.bank && <p><span className="font-semibold text-foreground">Banco:</span> {ext.bank}</p>}
                                {ext?.name && <p><span className="font-semibold text-foreground">Titular:</span> {ext.name}</p>}
                                {receipt && <img src={receipt} alt="comprobante" className="rounded max-h-36 object-contain mt-1" />}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    }
                    const acct = accounts.find((a) => a.id === (t as any).accountId);
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 whitespace-nowrap text-muted-foreground text-xs">{day}</td>
                        <td className="p-3"><div className="flex items-center gap-2"><IconDisplay icon={iconFor(t)} /><span className="font-semibold">{t.concept}</span></div></td>
                        <td className="p-3 text-xs text-muted-foreground">{t.category}</td>
                        <td className="p-3 text-xs">{t.paymentMethod ? `${PAYMENT_METHOD_EMOJI[t.paymentMethod]} ${PAYMENT_METHOD_LABEL[t.paymentMethod]}` : "-"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{acct?.name ?? "-"}</td>
                        <td className={`p-3 text-right font-bold text-sm whitespace-nowrap ${t.type === "income" ? "text-success" : t.type === "saving" ? "text-secondary" : t.type === "transfer" ? "text-primary" : "text-destructive"}`}>
                          {t.type === "income" ? "+" : t.type === "transfer" ? "⇄" : "-"}{fmt(t.amount)}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button onClick={() => openEdit(t as Transaction)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="size-3.5" /></button>
                          <button onClick={() => setDeleteConfirm(t as Transaction)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ElegantConfirm
          open={!!deleteConfirm}
          onOpenChange={(v) => !v && setDeleteConfirm(null)}
          title="¿Eliminar movimiento?"
          description={<span className="text-sm text-muted-foreground">Se eliminará <span className="font-bold text-foreground">"{deleteConfirm?.concept}"</span>. Esta acción no se puede deshacer.</span>}
          onConfirm={() => {
            if (!deleteConfirm) return;
            const d = deleteConfirm as any;
            if (d._virtual) {
              const debtId = d._debtId;
              if (d.id.startsWith('pay-')) removeDebtPayment(debtId, d.id.replace(`pay-${debtId}-`, ''));
              else if (d.id.startsWith('debt-')) removeDebt(debtId);
            } else { removeTx(d.id); }
            toast.success("Eliminado");
            setDeleteConfirm(null);
          }}
          icon={Trash2}
          iconColor="bg-destructive"
        />
      </div>
    </div>
  );
}

/* ─── TxForm (unchanged functionality) ─── */
function TxForm({ initial, onSave }: { initial: Partial<Transaction> & { type: TxType }; onSave: (t: Omit<Transaction, "id">) => void }) {
  const [type, setType] = useState<TxType>(initial.type);
  const [category, setCategory] = useState(initial.category ?? "Otros");
  const [concept, setConcept] = useState(initial.concept ?? "");
  const [amount, setAmount] = useState(initial.amount ? String(initial.amount) : "");
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayLocal = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;
  const [date, setDate] = useState((initial.date ?? todayLocal).slice(0, 10));
  const [note, setNote] = useState(initial.note ?? "");
  const [icon, setIcon] = useState<IconRef | undefined>(initial.icon);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial.paymentMethod ?? "transfer");
  const accounts = useFinance((s: any) => s.accounts);
  const [accountId, setAccountId] = useState<string | undefined>(initial.accountId ?? undefined);
  const [transferToAccountId, setTransferToAccountId] = useState<string | undefined>(() => {
    const initialAny = initial as any;
    if (initialAny._virtual && initialAny.externalPayee) return "__external";
    return initialAny.transferToAccountId ?? undefined;
  });
  const [externalPayee, setExternalPayee] = useState<{ clabe?: string; bank?: string; name?: string } | null>((initial as any)?.externalPayee ?? null);
  const [receiptData, setReceiptData] = useState<string | undefined>((initial as any)?.receipt ?? undefined);
  const cats = Object.keys(CATEGORY_EMOJI);

  const cashAccount = accounts.find((a: Account) => a.type === "cash");
  const bankAccounts = accounts.filter((a: Account) => a.type !== "cash");

  useEffect(() => {
    if (accountId) return;
    if (paymentMethod === "cash") { if (cashAccount) setAccountId(cashAccount.id); }
    else { const bank = bankAccounts[0] ?? accounts[0]; if (bank) setAccountId(bank.id); }
  }, [accounts, paymentMethod, accountId, cashAccount, bankAccounts]);

  useEffect(() => { if (type === "transfer" && !concept) setConcept("Traspaso entre cuentas"); }, [type, concept]);

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const a = parseFloat(amount);
      if (!a || !concept) { toast.error("Completa monto y concepto"); return; }
      const payload: any = { type, category, concept, amount: a, date: new Date(`${date}T12:00:00`).toISOString(), note: note || undefined, icon, paymentMethod };
      if (type === "transfer") {
        if (!accountId) { toast.error("Selecciona la cuenta origen"); return; }
        if (!transferToAccountId) { toast.error("Selecciona la cuenta destino"); return; }
        if (accountId === transferToAccountId) { toast.error("La cuenta origen y destino no pueden ser la misma"); return; }
        payload.accountId = accountId; payload.transferToAccountId = transferToAccountId;
      } else if (paymentMethod === "transfer") {
        if (!accountId) { toast.error(type === "income" ? "Selecciona la cuenta de destino" : "Selecciona la cuenta origen"); return; }
        if (type !== "income" && !transferToAccountId) { toast.error("Selecciona la cuenta destino"); return; }
        payload.accountId = accountId;
        if (transferToAccountId === "__external") {
          const c = externalPayee?.clabe ?? "";
          if (!/^[0-9]{18}$/.test((c || "").replace(/\s+/g, ""))) { toast.error("CLABE inválida (18 dígitos)"); return; }
          if (!externalPayee?.bank || !externalPayee?.name) { toast.error("Completa los datos del beneficiario externo"); return; }
          payload.externalPayee = externalPayee;
        } else if (transferToAccountId) { payload.transferToAccountId = transferToAccountId; }
        if (receiptData) {
          if (Capacitor.isNativePlatform()) {
            try {
              const m = receiptData.match(/^data:(image\/[^;]+);base64,(.*)$/);
              const base64 = m ? m[2] : receiptData.split(",")[1];
              const mime = m ? m[1] : "image/png";
              const ext = mime.split("/")[1] || "png";
              const fname = `receipt-${Date.now()}.${ext}`;
              const res = await Filesystem.writeFile({ path: `receipts/${fname}`, data: base64, directory: Directory.Data, encoding: Encoding.UTF8 });
              payload.receipt = res.uri ?? `receipts/${fname}`;
            } catch (e) { payload.receipt = receiptData; }
          } else { payload.receipt = receiptData; }
        }
      } else if (paymentMethod === "card") {
        if (!accountId) { toast.error("Selecciona la cuenta asociada a la tarjeta"); return; }
        payload.accountId = accountId;
      } else {
        if (paymentMethod === "cash" && cashAccount) payload.accountId = cashAccount.id;
        else if (accountId) payload.accountId = accountId;
      }
      onSave(payload as Omit<Transaction, "id">);
    }} className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3 lg:space-y-0">
      <div className="lg:col-span-2 grid grid-cols-2 gap-2">
        {(["expense", "income", "saving", "transfer"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`h-11 rounded-xl text-sm font-semibold capitalize transition ${type === t ? (t === "income" ? "gradient-success text-white" : t === "saving" ? "gradient-ocean text-white" : t === "transfer" ? "gradient-secondary text-white" : "gradient-primary text-white") + " shadow-glow" : "bg-muted text-muted-foreground"}`}>
            {t === "income" ? "Ingreso" : t === "saving" ? "Ahorro" : t === "transfer" ? "Traspaso" : "Gasto"}
          </button>
        ))}
      </div>
      <div className="lg:col-span-2 flex justify-center"><IconPicker value={icon} onChange={setIcon} /></div>
      <div><Label className="text-xs">Monto</Label><Input autoFocus type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-xl font-bold rounded-xl" /></div>
      <div><Label className="text-xs">Concepto</Label><Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder={type === "transfer" ? "Traspaso entre cuentas" : "Ej. Café con amigos"} className="h-10 rounded-xl" /></div>
      <div><Label className="text-xs">Categoría</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-xl" /></div>
      {type !== "transfer" && (
        <div><Label className="text-xs">Método</Label>
          <Select value={paymentMethod} onValueChange={(v) => { const m = v as PaymentMethod; setPaymentMethod(m); if (m === "cash" && cashAccount) setAccountId(cashAccount.id); else if ((m === "card" || m === "transfer") && accountId === cashAccount?.id) setAccountId(bankAccounts[0]?.id); }}>
            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((k) => (<SelectItem key={k} value={k}>{PAYMENT_METHOD_EMOJI[k]} {PAYMENT_METHOD_LABEL[k]}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-3 lg:col-span-2">
        {((type === "transfer") || (type !== "income" && paymentMethod !== "cash")) && (
          <div><Label className="text-xs">{type === "transfer" ? "Cuenta origen" : "Cuenta"}</Label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentMethod === "cash" && cashAccount && <SelectItem value={cashAccount.id}>{cashAccount.name} · Efectivo</SelectItem>}
                {(paymentMethod === "card" || paymentMethod === "transfer" || type === "transfer") && accounts.map((a: Account) => (<SelectItem key={a.id} value={a.id}>{a.name} {a.type === "cash" ? "· Efectivo" : "· Banco"}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
        {(type === "income" || type === "transfer") && (
          <div><Label className="text-xs">{type === "transfer" ? "Cuenta destino" : "Cuenta de destino"}</Label>
            <Select value={type === "transfer" ? transferToAccountId : accountId} onValueChange={(v) => type === "transfer" ? setTransferToAccountId(v) : setAccountId(v)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder={type === "transfer" ? "Seleccione destino" : "Seleccione cuenta"} /></SelectTrigger>
              <SelectContent>
                {type === "income" && paymentMethod === "cash" && cashAccount && <SelectItem value={cashAccount.id}>{cashAccount.name} · Efectivo</SelectItem>}
                {(type === "transfer" || (type === "income" && paymentMethod !== "cash")) && accounts.map((a: Account) => (<SelectItem key={a.id} value={a.id}>{a.name} {a.type === "cash" ? "· Efectivo" : "· Banco"}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {type !== "transfer" && paymentMethod === "transfer" && (type !== "income" || (initial as any)?._virtual) && (
        <div className="lg:col-span-2">
          <Label className="text-xs">Destinatario</Label>
          <Select value={transferToAccountId} onValueChange={(v) => setTransferToAccountId(v || undefined)}>
            <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Seleccione destinatario" /></SelectTrigger>
            <SelectContent>
              {accounts.filter((a: Account) => a.id !== accountId).map((a: Account) => (<SelectItem key={a.id} value={a.id}>Cuenta propia: {a.name}</SelectItem>))}
              <SelectItem value="__external">Cuenta externa (otra persona)</SelectItem>
            </SelectContent>
          </Select>
          {transferToAccountId === "__external" && (
            <div className="space-y-2 mt-2">
              <Input placeholder="CLABE (18 dígitos)" value={externalPayee?.clabe ?? ""} onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), clabe: e.target.value })} className="h-10 rounded-xl" />
              <Input placeholder="Banco" value={externalPayee?.bank ?? ""} onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), bank: e.target.value })} className="h-10 rounded-xl" />
              <Input placeholder="Nombre del titular" value={externalPayee?.name ?? ""} onChange={(e) => setExternalPayee({ ...(externalPayee ?? {}), name: e.target.value })} className="h-10 rounded-xl" />
              <div><Label className="text-xs">Comprobante</Label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => setReceiptData(typeof reader.result === "string" ? reader.result : undefined); reader.readAsDataURL(f); }} /></div>
              {receiptData && <img src={receiptData} alt="comprobante" className="mt-1 rounded max-h-32 object-contain" />}
            </div>
          )}
        </div>
      )}
      <div><Label className="text-xs">Nota</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalles..." className="h-10 rounded-xl" /></div>
      <Button type="submit" className="w-full h-11 rounded-xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold lg:col-span-2">Guardar</Button>
    </form>
  );
}
