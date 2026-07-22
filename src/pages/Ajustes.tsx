import { useEffect, useRef, useState, useMemo } from "react";
import { useHybridData } from "@/hooks/useHybridData";
import { useFinance, ExportScopes, ALL_SCOPES, normalizeImportKeys } from "@/store/finance-store";
import { fmt, monthlyAmount, TYPE_LABEL, FREQ_LABEL, ItemType, Frequency, Priority, iconFor, IconRef, FixedItem, CATEGORY_EMOJI, PaymentMethod, PAYMENT_METHOD_LABEL, PAYMENT_METHOD_EMOJI, Account, Denomination, cashTotalFromDenominations, Currency, computeBalances } from "@/lib/finance";
import DenominationsEditor from "@/components/ui/DenominationsEditor";
import { Header } from "@/components/app/Header";
import { Plus, Trash2, Power, Database, RotateCcw, Pencil, Download, Upload, Sun, Moon, Target, History, HandCoins, User, LogOut, Cloud, CloudOff, Loader2, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "@/lib/framer";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";
import { Link, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { LocalNotifications } from "@capacitor/local-notifications";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseEnabled, setSyncEnabled } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { showUserError } from '@/lib/app-error';

export default function Ajustes() {
  const queryClient = useQueryClient();
  const { 
    fixedItems, addFixed, updateFixed, removeFixed, toggleFixed, resetAll, exportData, importData, 
    theme, toggleTheme, profile, setProfile, 
    accounts, addAccount, updateAccount, removeAccount, syncAllToCloud 
  } = useHybridData();
  const accentColor = useFinance((s) => s.appSettings.accentColor);
  const setAccentColor = useFinance((s) => s.setAccentColor);
  const compactMode = useFinance((s) => s.appSettings.compactMode);
  const setCompactMode = useFinance((s) => s.setCompactMode);
  const glassEffect = useFinance((s) => s.appSettings.glassEffect);
  const setGlassEffect = useFinance((s) => s.setGlassEffect);
  const transactions = useFinance((s) => s.transactions);
  const debts = useFinance((s) => s.debts);
  const balances = useMemo(() => {
    const endOfMonth = new Date(2099, 11, 31, 23, 59, 59); // far future to see all
    return computeBalances(accounts, transactions, debts, endOfMonth);
  }, [accounts, transactions, debts]);
  const syncFiltersToURL = useFinance((s) => s.syncFiltersToURL);
  const setSyncFiltersToURL = useFinance((s) => s.setSyncFiltersToURL);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedItem | null>(null);
  const [tab, setTab] = useState<"all" | ItemType>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPayload, setPendingPayload] = useState<string | null>(null);
  const [pendingAvailable, setPendingAvailable] = useState<Required<ExportScopes>>(ALL_SCOPES);
  const [deleteConfirm, setDeleteConfirm] = useState<FixedItem | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importConfirmScopes, setImportConfirmScopes] = useState<ExportScopes | null>(null);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [cashDenomsState, setCashDenomsState] = useState<Denomination[] | undefined>(undefined);
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [orphanList, setOrphanList] = useState<string[] | null>(null);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [syncEnabled, setSyncEnabledState] = useState(isSupabaseEnabled);

  const filtered = fixedItems.filter((i) => tab === "all" || i.type === tab);
  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (i: FixedItem) => { setEditing(i); setOpen(true); };

  // Request permissions on mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          await LocalNotifications.requestPermissions();
          // Filesystem permissions are usually granted by default for internal storage,
          // but if we were to use External, we'd need them.
          // For now, let's at least ensure Notifications are requested.
        } catch (e) {
          console.warn("Permission request failed", e);
        }
      })();
    }
  }, []);

  const doExport = async (scopes: ExportScopes) => {
    const json = exportData(scopes);
    const d = new Date(); const pad = (n: number) => String(n).padStart(2, "0");
    const filename = `finance-pal-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;

    // 1. Native Mobile (Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        // Write file to a temporary location first
        const result = await Filesystem.writeFile({
          path: filename,
          data: json,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // Share the file from that URI
        await Share.share({
          title: "Exportación de datos - Finance Pal",
          text: "Copia de seguridad de Finance Pal",
          url: result.uri,
          dialogTitle: "Guardar o enviar respaldo",
        });

        toast.success("Respaldo listo para guardar");
      } catch (e: any) {
        toast.error(showUserError(e));
      }
      return;
    }

    // 2. Desktop Browser with File System Access API
    const anyWin = window as any;
    if (typeof anyWin.showSaveFilePicker === "function") {
      const blob = new Blob([json], { type: "application/json" });
      try {
        const handle = await anyWin.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success("Datos guardados en la carpeta elegida");
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        toast.error("No se pudo guardar: " + (e?.message ?? "error"));
      }
      return;
    }

    // 3. Web Share API (Mobile Web Fallback)
    if (navigator.share) {
      try {
        const file = new File([json], filename, { type: "application/json" });
        await navigator.share({
          title: "Respaldo Finance Pal",
          files: [file],
        });
        toast.success("Exportación compartida");
      } catch (e) {
        downloadFallback(json, filename);
      }
      return;
    }

    // 4. Final Fallback
    downloadFallback(json, filename);
  };

  const downloadFallback = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportado a Descargas");
  };

  const handleImportFile = async (file: File) => {
    try {
      if (file.size > 20 * 1024 * 1024) { toast.error("El archivo es demasiado grande (máx 20 MB)"); return; }
      const text = await file.text();
      // Detect which sections the file contains so the user can pick
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { toast.error("JSON inválido"); return; }
      const raw = parsed?.data ?? parsed ?? {};
      // Normalize Spanish key names from old version if present
      const data = normalizeImportKeys(raw);
      const available: Required<ExportScopes> = {
        fixedItems: Array.isArray(data.fixedItems) && data.fixedItems.length >= 0,
        transactions: Array.isArray(data.transactions) && data.transactions.length >= 0,
        accounts: Array.isArray(data.accounts) && data.accounts.length >= 0,
        goals: Array.isArray(data.goals) && data.goals.length >= 0,
        debts: Array.isArray(data.debts) && data.debts.length >= 0,
        changeLog: Array.isArray(data.changeLog),
        theme: data.theme === "dark" || data.theme === "light",
        profile: !!data.profile,
      };
      setPendingFile(file);
      setPendingPayload(text);
      setPendingAvailable(available);
      setImportOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo leer el archivo");
    }
  };

  const doImport = (scopes: ExportScopes) => {
    if (!pendingPayload) return;
    setImportConfirmScopes(scopes);
  };

  const handleImportConfirm = () => {
    if (!pendingPayload || !importConfirmScopes) return;
    (async () => {
      const r = await importData(pendingPayload, importConfirmScopes);
      if (r.ok) {
        toast.success("Datos importados");
        r.warnings?.forEach((w) => toast(w));
        // If signed in, sync imported data to Supabase
        if (isSupabaseEnabled) {
          const state = useFinance.getState();
          const user = (await supabase.auth.getUser()).data.user;
          if (user) {
            let synced = 0;
            const sc = importConfirmScopes;
            // Delete all existing data for this user, then insert imported data
            if (sc.accounts) {
              await supabase.from('accounts').delete().eq('user_id', user.id);
              for (const a of state.accounts) {
                const { error } = await supabase.from('accounts').insert({ id: a.id, user_id: user.id, name: a.name, type: a.type, initial_balance: a.initialBalance, currency: a.currency, clabe: a.clabe, bank: a.bank, holder_name: a.holderName, denominations: a.denominations });
                if (!error) synced++;
              }
            }
            if (sc.transactions) {
              await supabase.from('transactions').delete().eq('user_id', user.id);
              for (const tx of state.transactions) {
                const { error } = await supabase.from('transactions').insert({ id: tx.id, user_id: user.id, type: tx.type, category: tx.category, concept: tx.concept, amount: tx.amount, date: tx.date, note: tx.note, icon: tx.icon, payment_method: tx.paymentMethod, fixed_id: tx.fixedId, account_id: tx.accountId, transfer_to_account_id: tx.transferToAccountId, external_payee: tx.externalPayee, receipt: tx.receipt });
                if (!error) synced++;
              }
            }
            if (sc.fixedItems) {
              await supabase.from('fixed_items').delete().eq('user_id', user.id);
              for (const f of state.fixedItems) {
                const { error } = await supabase.from('fixed_items').insert({ id: f.id, user_id: user.id, type: f.type, category: f.category, concept: f.concept, amount: f.amount, frequency: f.frequency, active: f.active, note: f.note, start_date: f.startDate, end_date: f.endDate, priority: f.priority, pay_day: f.payDay, pay_week_day: f.payWeekDay, icon: f.icon, payment_method: f.paymentMethod, account_id: f.accountId });
                if (!error) synced++;
              }
            }
            if (sc.goals) {
              await supabase.from('goals').delete().eq('user_id', user.id);
              for (const g of state.goals) {
                const { error } = await supabase.from('goals').insert({ id: g.id, user_id: user.id, name: g.name, target: g.target, saved: g.saved, emoji: g.emoji, color: g.color, icon: g.icon, deadline: g.deadline, purchase_url: g.purchaseUrl, contributions: g.contributions, pinned: g.pinned });
                if (!error) synced++;
              }
            }
            if (sc.debts) {
              // CASCADE handles debt_payments deletion
              await supabase.from('debts').delete().eq('user_id', user.id);
              for (const debt of state.debts) {
                const { error: debtErr } = await supabase.from('debts').insert({ id: debt.id, user_id: user.id, person: debt.person, concept: debt.concept, amount: debt.amount, date: debt.date, due_date: debt.dueDate, note: debt.note, icon: debt.icon, account_id: debt.accountId });
                if (!debtErr) {
                  synced++;
                  for (const p of debt.payments) {
                    const pay: Record<string, unknown> = { debt_id: debt.id, user_id: user.id, amount: p.amount, date: p.date, note: p.note, payment_method: p.paymentMethod };
                    if (p.id) pay.id = p.id;
                    if (p.accountId) pay.account_id = p.accountId;
                    if (p.transferToAccountId) pay.transfer_to_account_id = p.transferToAccountId;
                    if (p.externalPayee) pay.external_payee = p.externalPayee;
                    if (p.receipt && !p.receipt.startsWith('data:')) pay.receipt_url = p.receipt;
                    const { error: payErr } = await supabase.from('debt_payments').insert(pay);
                    if (!payErr) synced++;
                  }
                }
              }
            }
            if (synced > 0) toast.success(`Datos reemplazados en la nube: ${synced} registros`);
            // Invalidate all queries so the UI reloads from Supabase
            queryClient.invalidateQueries();
          }
        }
        setImportOpen(false);
        setPendingFile(null);
        setPendingPayload(null);
      } else {
        toast.error(r.error ?? "No se pudo importar");
      }
      setImportConfirmScopes(null);
    })();
  };

  return (
    <div>
      <Header title="Ajustes" subtitle="Personaliza tu experiencia" action={
            <div className="flex items-center gap-2">
              <Button onClick={async () => {
                try {
                  const res = await useFinance.getState().cleanupOrphanReceipts(true);
                  const freed = (res?.freedBytes ?? 0) / 1024;
                  if ((res?.orphans ?? []).length > 0) {
                    toast.success(`Limpió ${(res.orphans.length)} recibos, liberó ${freed.toFixed(1)} KB`);
                  } else {
                    toast('No se encontraron recibos huérfanos');
                  }
                } catch { toast.error(showUserError(undefined)); }
              }} variant="ghost" className="h-11 hidden sm:inline-flex"><Trash2 className="size-4 mr-2" />Limpiar</Button>
              <Button onClick={openNew} className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow h-11"><Plus className="size-4 mr-1" />Agregar</Button>
            </div>
          } />

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Tu perfil</DialogTitle></DialogHeader>
            <DialogDescription className="sr-only">Formulario para editar tu perfil</DialogDescription>
          <ProfileForm onSave={(p) => { setProfile(p); setProfileOpen(false); toast.success("Perfil actualizado"); }} />
        </DialogContent>
      </Dialog>

      <section className="px-5 mb-4">
        <button onClick={() => setProfileOpen(true)} className="w-full rounded-3xl bg-card border border-border p-4 shadow-soft flex items-center gap-3 hover:bg-muted/40 transition text-left">
          {profile.avatar ? (
            <IconDisplay icon={profile.avatar} size="lg" />
          ) : (
            <div className="size-14 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center"><User className="size-6" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{profile.name || "Configura tu perfil"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {profile.email ? `${profile.email} • ` : ""}Moneda {profile.currency}
            </p>
          </div>
          <Pencil className="size-4 text-muted-foreground" />
        </button>
      </section>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar concepto fijo" : "Nuevo concepto fijo"}</DialogTitle></DialogHeader>
          <DialogDescription className="sr-only">Formulario para crear o editar un concepto fijo</DialogDescription>
          <FixedForm initial={editing} onSave={(i) => {
            if (editing) { updateFixed(editing.id, i); toast.success("Actualizado"); }
            else { addFixed(i); toast.success("Agregado"); }
            setOpen(false); setEditing(null);
          }} />
        </DialogContent>
      </Dialog>

      <div className="px-5 flex gap-2 overflow-x-auto no-scrollbar lg:flex-wrap">
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
        {filtered.length === 0 && (
          <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-8 text-center">
            <p className="text-4xl mb-2">📋</p>
            <p className="text-sm text-muted-foreground">Sin conceptos fijos. Toca <span className="font-bold">Agregar</span> para empezar.</p>
          </div>
        )}
        {filtered.map((i) => (
          <motion.div key={i.id} layout className="rounded-2xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
            <IconDisplay icon={iconFor(i)} />
            <button onClick={() => openEdit(i)} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{i.concept}</p>
                {!i.active && <span className="text-[9px] uppercase font-bold bg-muted px-1.5 py-0.5 rounded">Pausado</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">{TYPE_LABEL[i.type]} • {FREQ_LABEL[i.frequency]}{i.payDay ? ` • día ${i.payDay}` : (typeof i.payWeekDay === "number" ? ` • ${["Dom","Lun","Mar","Mie","Jue","Vie","Sáb"][i.payWeekDay]}` : "")}</p>
            </button>
            <div className="text-right">
              <p className={`font-bold text-sm ${i.type === "income_fixed" ? "text-success" : i.type === "saving_fixed" ? "text-secondary" : "text-destructive"}`}>{fmt(i.amount)}</p>
              <p className="text-[10px] text-muted-foreground">{fmt(monthlyAmount(i))}/mes</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => openEdit(i)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="size-4" /></button>
              <button onClick={() => toggleFixed(i.id)} className="text-muted-foreground hover:text-foreground p-1"><Power className="size-4" /></button>
              <button onClick={() => setDeleteConfirm(i)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="px-5 lg:px-10 mt-8 space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Apariencia</h2>
        <button onClick={toggleTheme} className="w-full rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center gap-3 hover:bg-muted/50 transition">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm">Tema {theme === "dark" ? "oscuro" : "claro"}</p>
            <p className="text-xs text-muted-foreground">Toca para cambiar a {theme === "dark" ? "claro" : "oscuro"}</p>
          </div>
          {accentColor !== "blue" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Palette className="size-3" />
              <span className="capitalize">{accentColor}</span>
            </div>
          )}
        </button>

        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold text-muted-foreground">Color de acento</Label>
          <div className="flex gap-2">
            {(["blue","violet","emerald","rose","amber"] as const).map((c) => {
              const colors = { blue: "bg-blue-500", violet: "bg-violet-500", emerald: "bg-emerald-500", rose: "bg-rose-500", amber: "bg-amber-500" };
              return (
                <button key={c} onClick={() => setAccentColor(c)}
                  className={`size-10 rounded-xl ${colors[c]} transition-all ${accentColor === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110" : "opacity-60 hover:opacity-100"}`}
                >{accentColor === c && <span className="flex items-center justify-center text-white text-xs font-bold">✓</span>}</button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Switch checked={compactMode} onCheckedChange={setCompactMode} />
          <div>
            <p className="font-semibold text-sm">Modo compacto</p>
            <p className="text-xs text-muted-foreground">Reduce el espaciado general de la app</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Switch checked={glassEffect} onCheckedChange={setGlassEffect} />
          <div>
            <p className="font-semibold text-sm">Efecto cristal</p>
            <p className="text-xs text-muted-foreground">Fondos translúcidos en la barra inferior</p>
          </div>
        </div>

        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground pt-4">Más</h2>
        <div className="grid grid-cols-3 lg:flex lg:gap-3 gap-2">
          <Link to="/metas" className="rounded-2xl bg-card border border-border p-3 shadow-soft flex flex-col items-center gap-1.5 hover:bg-muted/50 transition">
            <Target className="size-5 text-primary" /><span className="text-[11px] font-semibold">Metas</span>
          </Link>
          <Link to="/deudas" className="rounded-2xl bg-card border border-border p-3 shadow-soft flex flex-col items-center gap-1.5 hover:bg-muted/50 transition">
            <HandCoins className="size-5 text-primary" /><span className="text-[11px] font-semibold">Deudas</span>
          </Link>
          <Link to="/historial" className="rounded-2xl bg-card border border-border p-3 shadow-soft flex flex-col items-center gap-1.5 hover:bg-muted/50 transition">
            <History className="size-5 text-primary" /><span className="text-[11px] font-semibold">Historial</span>
          </Link>
        </div>

        <div className="mt-3">
          <Label className="text-xs">Sincronización</Label>
          <div className="flex items-center gap-3 mt-2">
            <Checkbox checked={syncFiltersToURL} onCheckedChange={(v) => setSyncFiltersToURL(!!v)} />
            <div>
              <p className="font-semibold text-sm">Sincronizar filtros con la URL</p>
              <p className="text-xs text-muted-foreground">Al activar, los filtros de la pantalla de Movimientos se reflejarán en la URL para compartir o restaurar la vista.</p>
            </div>
          </div>
          {import.meta.env.VITE_ENABLE_SUPABASE === 'true' && (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => {
                  const next = !syncEnabled;
                  setSyncEnabledState(next);
                  setSyncEnabled(next);
                  toast.success(next ? 'Sincronización con la nube activada' : 'Sincronización con la nube desactivada');
                }}
                className={`flex items-center gap-2 w-full rounded-2xl border p-3 transition ${
                  syncEnabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className={`size-9 rounded-xl flex items-center justify-center ${syncEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {syncEnabled ? <Cloud className="size-4" /> : <CloudOff className="size-4" />}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{syncEnabled ? 'Nube activada' : 'Nube desactivada'}</p>
                  <p className="text-xs text-muted-foreground">{syncEnabled ? 'Tus datos se sincronizan con Supabase' : 'Los datos solo se guardan localmente'}</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {isSupabaseEnabled && (
          <>
            <SyncAllButton syncAllToCloud={syncAllToCloud} queryClient={queryClient} />
            <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground pt-4">Cuenta</h2>

            <AccountSettings />

            <button
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="w-full rounded-2xl bg-card border border-border p-4 flex items-center gap-3 hover:bg-destructive/10 hover:border-destructive/30 transition group"
            >
              <div className="size-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center group-hover:bg-destructive/20">
                <LogOut className="size-4" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm group-hover:text-destructive transition-colors">Cerrar sesión</p>
                <p className="text-xs text-muted-foreground">Salir de tu cuenta de Supabase</p>
              </div>
            </button>
          </>
        )}

        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground pt-2">Datos</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Button onClick={() => setExportOpen(true)} variant="secondary" className="rounded-2xl h-12 font-semibold"><Download className="size-4 mr-1" />Exportar</Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="rounded-2xl h-12 font-semibold"><Upload className="size-4 mr-1" />Importar</Button>
          <Button onClick={async () => {
            setReceiptsOpen(true);
            setReceiptsLoading(true);
            try {
              const r = await useFinance.getState().cleanupOrphanReceipts(false); // dry-run
              setOrphanList(r?.orphans ?? []);
            } catch (e) { setOrphanList([]); }
            setReceiptsLoading(false);
          }} variant="ghost" className="rounded-2xl h-12 font-semibold"><Trash2 className="size-4 mr-1" />Limpiar recibos</Button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ""; }} />
        </div>

        <Dialog open={receiptsOpen} onOpenChange={(v) => { setReceiptsOpen(v); if (!v) { setOrphanList(null); } }}>
          <DialogContent className="rounded-3xl max-w-xl">
            <DialogHeader><DialogTitle>Limpiar recibos</DialogTitle></DialogHeader>
            <DialogDescription className="sr-only">Lista y elimina recibos huérfanos</DialogDescription>
            <div className="space-y-3">
              {receiptsLoading && <p className="text-sm">Analizando recibos...</p>}
              {!receiptsLoading && orphanList && orphanList.length === 0 && <p className="text-sm">No se encontraron recibos huérfanos.</p>}
              {!receiptsLoading && orphanList && orphanList.length > 0 && (
                <div>
                  <p className="text-sm mb-2">Se encontraron {orphanList.length} recibos huérfanos:</p>
                  <div className="max-h-48 overflow-y-auto rounded border border-border p-2 bg-card">
                    {orphanList.map((o) => <div key={o} className="text-xs py-1">{o}</div>)}
                  </div>
                  <div className="flex gap-2 justify-end mt-3">
                    <Button variant="secondary" onClick={async () => { setReceiptsLoading(true); await useFinance.getState().cleanupOrphanReceipts(true); const r = await useFinance.getState().cleanupOrphanReceipts(false); setOrphanList(r.orphans); setReceiptsLoading(false); toast.success('Recibos eliminados'); }}>Eliminar</Button>
                    <Button onClick={() => { setReceiptsOpen(false); setOrphanList(null); }}>Cerrar</Button>
                  </div>
                </div>
              )}
              {!receiptsLoading && orphanList === null && <p className="text-sm">Pulsa Analizar para buscar recibos huérfanos.</p>}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={async () => { setReceiptsLoading(true); const r = await useFinance.getState().cleanupOrphanReceipts(false); setOrphanList(r.orphans); setReceiptsLoading(false); }} className="rounded-2xl">Analizar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="rounded-3xl">
              <DialogHeader><DialogTitle>¿Qué quieres exportar?</DialogTitle></DialogHeader>
              <DialogDescription className="sr-only">Selecciona las secciones a exportar</DialogDescription>
            <ScopePicker
              available={ALL_SCOPES}
              onConfirm={(sc) => { doExport(sc); setExportOpen(false); }}
              confirmLabel="Exportar"
              confirmIcon={<Download className="size-4 mr-1" />}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setPendingFile(null); setPendingPayload(null); } }}>
          <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle>¿Qué quieres importar?</DialogTitle></DialogHeader>
            <DialogDescription className="sr-only">Selecciona las secciones a importar desde el archivo</DialogDescription>
            {pendingFile && <p className="text-xs text-muted-foreground -mt-1">Archivo: <span className="font-semibold text-foreground">{pendingFile.name}</span></p>}
            <ScopePicker
              available={pendingAvailable}
              onConfirm={doImport}
              confirmLabel="Importar"
              confirmIcon={<Upload className="size-4 mr-1" />}
              destructive
            />
          </DialogContent>
        </Dialog>

        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground pt-4">Seguridad</h2>
        <button onClick={() => setResetConfirm(true)}
          className="w-full rounded-2xl bg-destructive/10 text-destructive p-4 flex items-center gap-3 font-semibold text-sm hover:bg-destructive/15 transition">
          <RotateCcw className="size-4" /> Restablecer todo
        </button>
        <p className="text-[10px] text-center text-muted-foreground pt-4">Finance Pal v1.17.8</p>

        <div className="pt-4">
          <h2 className="text-xs uppercase tracking-wider font-bold text-foreground">Desglose de efectivo</h2>
          <div className="mt-2">
            {accounts.find((a) => a.type === "cash") ? (
              (() => {
                const cash = accounts.find((a) => a.type === "cash")!;
                const denomTotal = (cashDenomsState && cashDenomsState.length > 0) ? cashTotalFromDenominations(cashDenomsState) : (cash.denominations ? cashTotalFromDenominations(cash.denominations) : 0);
                return (
                  <div className="rounded-2xl bg-card border border-border p-3 shadow-soft">
                    <p className="text-sm font-semibold">Cuenta: {cash.name} • {cash.currency ?? "MXN"}</p>
                    <p className="text-xs text-foreground mb-2">Saldo registrado: {fmt(cash.initialBalance ?? 0)} • Total desglose: {fmt(denomTotal)}</p>
                    <div>
                      <DenominationsEditor value={cashDenomsState ?? cash.denominations} onChange={(d) => setCashDenomsState(d)} />
                    </div>
                    <div className="flex gap-2 justify-end mt-3">
                      <Button onClick={() => { setEditingAccount(cash); setAccountsOpen(true); }} className="rounded-2xl">Editar cuenta</Button>
                      <Button onClick={async () => {
                        const total = cashDenomsState && cashDenomsState.length > 0 ? cashTotalFromDenominations(cashDenomsState) : (cash.denominations ? cashTotalFromDenominations(cash.denominations) : 0);
                        const bal = Number(cash.initialBalance ?? 0);
                        if (total !== bal) { toast.error("El total del desglose no coincide con el saldo registrado. No se puede guardar."); return; }
                        // Save denominations
                        updateAccount(cash.id, { denominations: cashDenomsState && cashDenomsState.length > 0 ? cashDenomsState : undefined });
                        toast.success("Desglose guardado");
                      }} className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">Guardar desglose</Button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="rounded-2xl bg-card border border-border p-3 shadow-soft">
                <p className="text-sm">No hay cuenta de efectivo. Crea una cuenta de tipo <span className="font-bold">Efectivo</span> para usar el desglose.</p>
                <div className="mt-2"><Button onClick={() => { setEditingAccount(null); setAccountsOpen(true); }} className="rounded-2xl">Crear cuenta de efectivo</Button></div>
              </div>
            )}
          </div>

          <h2 className="text-xs uppercase tracking-wider font-bold text-foreground pt-4">Cuentas</h2>
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <Button onClick={() => { setEditingAccount(null); setAccountsOpen(true); }} className="flex-1 rounded-2xl">Añadir cuenta</Button>
              <Button variant="secondary" onClick={() => setAccountsOpen(true)} className="rounded-2xl">Gestionar</Button>
            </div>
            {accounts.map((a) => {
              const denomTotal = a.denominations && a.denominations.length > 0 ? cashTotalFromDenominations(a.denominations) : null;
              const computed = balances[a.id] ?? a.initialBalance ?? 0;
              return (
                <div key={a.id} className="rounded-2xl bg-card border border-border p-3 shadow-soft flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{a.type === "cash" ? <HandCoins className="size-5" /> : <Database className="size-5" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{a.name}</p>
                    <p className="text-xs text-foreground">{a.type === "cash" ? "Efectivo" : "Cuenta bancaria"} • {a.currency ?? "MXN"} • Saldo: {fmt(computed)} {denomTotal != null && <span className="ml-1">· Desglose: {fmt(denomTotal)}</span>}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button onClick={() => { setEditingAccount(a); setAccountsOpen(true); }} className="h-9">Editar</Button>
                    <Button onClick={() => { if (confirm(`Eliminar cuenta "${a.name}"? Se desasignarán sus movimientos.`)) { removeAccount(a.id); } }} className="h-9" variant="ghost">Eliminar</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ElegantConfirm
          open={!!deleteConfirm}
          onOpenChange={(v) => !v && setDeleteConfirm(null)}
          title="¿Eliminar concepto?"
          description={<span className="text-sm text-muted-foreground">¿Estás seguro de que quieres eliminar <span className="font-bold text-foreground">"{deleteConfirm?.concept}"</span>? Esto detendrá su seguimiento.</span>}
          onConfirm={() => { if (deleteConfirm) { removeFixed(deleteConfirm.id); setDeleteConfirm(null); } }}
          icon={Trash2}
          iconColor="bg-destructive"
        />

        <ElegantConfirm
          open={resetConfirm}
          onOpenChange={setResetConfirm}
          title="¿Restablecer datos?"
          description="Se borrarán TODOS tus datos, movimientos, metas y configuración. Esta acción no se puede deshacer."
          onConfirm={() => { resetAll(); toast("Datos borrados"); }}
          icon={RotateCcw}
          iconColor="bg-destructive"
          confirmText="Sí, borrar todo"
        />

        <ElegantConfirm
          open={!!importConfirmScopes}
          onOpenChange={(v) => !v && setImportConfirmScopes(null)}
          title="¿Confirmar importación?"
          description={isSupabaseEnabled
            ? "Tienes la sesión iniciada en la nube. Los datos importados se guardarán SOLO de forma local — no se subirán automáticamente a Supabase. Si deseas que también se reflejen en la nube, exporta tus datos actuales desde el otro dispositivo e impórtalos aquí. ¿Deseas continuar?"
            : "Esto reemplazará las secciones seleccionadas con los datos del archivo. ¿Deseas continuar?"}
          onConfirm={handleImportConfirm}
          icon={Upload}
          iconColor="gradient-primary"
        />

        <Dialog open={accountsOpen} onOpenChange={setAccountsOpen}>
          <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingAccount ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle></DialogHeader>
            <AccountForm initial={editingAccount} onSave={(a) => {
              if (editingAccount) { updateAccount(editingAccount.id, a); toast.success("Cuenta actualizada"); }
              else { addAccount(a); toast.success("Cuenta creada"); }
              setAccountsOpen(false); setEditingAccount(null);
            }} />
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}



const SCOPE_LABELS: { key: keyof Required<ExportScopes>; label: string; desc: string }[] = [
  { key: "accounts", label: "Cuentas", desc: "Bancos, efectivo y otros" },
  { key: "fixedItems", label: "Conceptos fijos", desc: "Ingresos, gastos, ahorros recurrentes" },
  { key: "transactions", label: "Movimientos", desc: "Todos los registros del día a día" },
  { key: "goals", label: "Metas", desc: "Incluye aportes, link y fecha" },
  { key: "debts", label: "Deudas", desc: "Personas, montos y abonos" },
  { key: "changeLog", label: "Historial", desc: "Bitácora de ediciones" },
  { key: "profile", label: "Perfil", desc: "Nombre, foto, moneda" },
  { key: "theme", label: "Apariencia", desc: "Tema claro u oscuro" },
];

function ScopePicker({
  available, onConfirm, confirmLabel, confirmIcon, destructive,
}: {
  available: Required<ExportScopes>;
  onConfirm: (scopes: ExportScopes) => void;
  confirmLabel: string;
  confirmIcon?: React.ReactNode;
  destructive?: boolean;
}) {
  const [scopes, setScopes] = useState<Required<ExportScopes>>(() => ({ ...available }));
  const allOn = Object.values(scopes).every(Boolean);
  const toggle = (k: keyof ExportScopes) => setScopes((s) => ({ ...s, [k]: !s[k] }));
  const setAll = (v: boolean) => setScopes((s) => {
    const next = { ...s };
    SCOPE_LABELS.forEach(({ key }) => { if (available[key]) next[key] = v; });
    return next;
  });
  const someSelected = Object.entries(scopes).some(([k, v]) => v && (available as any)[k]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => setAll(!allOn)} className="text-[11px] font-bold text-primary">
          {allOn ? "Quitar todo" : "Seleccionar todo"}
        </button>
      </div>
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
        {SCOPE_LABELS.map(({ key, label, desc }) => {
          const enabled = available[key];
          const checked = !!scopes[key] && enabled;
          return (
            <label key={key}
              className={`flex items-start gap-3 rounded-2xl border p-3 transition cursor-pointer ${
                checked ? "border-primary bg-primary/5" : "border-border bg-card"
              } ${!enabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/40"}`}>
              <Checkbox checked={checked} disabled={!enabled} onCheckedChange={() => enabled && toggle(key)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-[11px] text-muted-foreground">{enabled ? desc : "No disponible en este archivo"}</p>
              </div>
            </label>
          );
        })}
      </div>
      <Button
        type="button"
        disabled={!someSelected}
        onClick={() => onConfirm(scopes)}
        className={`w-full h-12 rounded-2xl font-bold border-0 shadow-glow ${destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "gradient-primary text-primary-foreground"}`}>
        {confirmIcon}{confirmLabel}
      </Button>
    </div>
  );
}

function ProfileForm({ onSave }: { onSave: (p: { name: string; email?: string; currency: Currency; avatar?: IconRef }) => void }) {
  const profile = useFinance((s) => s.profile);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? "");
  const [currency, setCurrency] = useState<Currency>(profile.currency);
  const [avatar, setAvatar] = useState<IconRef | undefined>(profile.avatar);
  const currencies: Currency[] = ["MXN","USD","EUR","COP","ARS","CLP","PEN","BRL"];

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSave({ name: name.trim(), email: email.trim() || undefined, currency, avatar });
    }} className="space-y-3">
      <div className="flex justify-center"><IconPicker value={avatar} onChange={setAvatar} /></div>
      <div><Label className="text-xs">Tu nombre</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. María" className="h-11 rounded-2xl" /></div>
      <div><Label className="text-xs">Email (opcional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className="h-11 rounded-2xl" /></div>
      <div>
        <Label className="text-xs">Moneda</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {currencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">Guardar</Button>
    </form>
  );
}

function FixedForm({ initial, onSave }: { initial: FixedItem | null; onSave: (i: Omit<FixedItem, "id">) => void }) {
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
    <form onSubmit={(e) => {
      e.preventDefault();
      const a = parseFloat(amount);
      if (!a || !concept) { toast.error("Completa concepto y monto"); return; }
      onSave({ type, category, concept, amount: a, frequency, active: initial?.active ?? true, startDate: new Date(`${startDate}T12:00:00`).toISOString(), endDate: new Date(`${endDate}T12:00:00`).toISOString(), priority, payDay: payDay ? parseInt(payDay) : undefined, payWeekDay: payWeekDay !== "none" ? parseInt(payWeekDay) : undefined, note: note || undefined, icon, paymentMethod });
    }} className="space-y-3">
      <div className="flex justify-center"><IconPicker value={icon} onChange={setIcon} /></div>
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
      <div>
        <Label className="text-xs">Categoría</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {cats.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-xs">Monto</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-xl font-bold rounded-2xl" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Frecuencia</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
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
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Método de pago</Label>
        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
          <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((k) => (
              <SelectItem key={k} value={k}>{PAYMENT_METHOD_EMOJI[k]} {PAYMENT_METHOD_LABEL[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Desde</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 rounded-2xl" /></div>
        <div><Label className="text-xs">Hasta</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 rounded-2xl" /></div>
      </div>
      {frequency === "weekly" ? (
        <div>
          <Label className="text-xs">Día de la semana (opcional)</Label>
          <Select value={payWeekDay} onValueChange={(v) => setPayWeekDay(v)}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin día</SelectItem>
              <SelectItem value="0">Domingo</SelectItem>
              <SelectItem value="1">Lunes</SelectItem>
              <SelectItem value="2">Martes</SelectItem>
              <SelectItem value="3">Miércoles</SelectItem>
              <SelectItem value="4">Jueves</SelectItem>
              <SelectItem value="5">Viernes</SelectItem>
              <SelectItem value="6">Sábado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div><Label className="text-xs">Día de pago (opcional, 1–28)</Label><Input type="number" min="1" max="28" value={payDay} onChange={(e) => setPayDay(e.target.value)} className="h-11 rounded-2xl" /></div>
      )}
      <div><Label className="text-xs">Nota (opcional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-11 rounded-2xl" /></div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">{initial ? "Guardar cambios" : "Crear"}</Button>
    </form>
  );
}

function AccountForm({ initial, onSave }: { initial: Account | null; onSave: (a: Omit<Account, "id">) => void }) {
  const accounts = useFinance((s) => s.accounts);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<Account["type"]>(initial?.type ?? "bank");
  const [initialBalance, setInitialBalance] = useState(initial?.initialBalance ? String(initial?.initialBalance) : "0");
  const [currency, setCurrency] = useState(initial?.currency ?? "MXN");
  const [denoms, setDenoms] = useState<Denomination[] | undefined>(initial?.denominations ?? []);
  const [clabe, setClabe] = useState(initial?.clabe ?? "");
  const [bankName, setBankName] = useState(initial?.bank ?? "");
  const [holderName, setHolderName] = useState(initial?.holderName ?? "");

  const hasCashAccount = accounts.some(a => a.type === "cash" && a.id !== initial?.id);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!name.trim()) { toast.error("Nombre requerido"); return; }
      const bal = parseFloat(initialBalance) || 0;
      if (type === "cash" && denoms && denoms.length > 0) {
        const denomTotal = cashTotalFromDenominations(denoms);
        if (denomTotal !== bal) { toast.error("El total del desglose debe coincidir con el saldo inicial para cuentas en efectivo."); return; }
      }
      if (type === "bank") {
        // Validate CLABE (18 numeric digits)
        const onlyDigits = (clabe || "").replace(/\s+/g, "");
        if (onlyDigits && !/^[0-9]{18}$/.test(onlyDigits)) { toast.error("CLABE inválida. Debe contener 18 dígitos."); return; }
        // Bank name and holder optional if not provided
      }
      onSave({ name: name.trim(), type, initialBalance: bal, currency, denominations: denoms && denoms.length > 0 ? denoms : undefined, clabe: clabe.trim() || undefined, bank: bankName.trim() || undefined, holderName: holderName.trim() || undefined });
    }} className="space-y-3">
      <div><Label className="text-xs">Nombre</Label><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-2xl" /></div>
      <div>
        <Label className="text-xs">Tipo</Label>
        <Select value={type} onValueChange={(v) => setType(v as Account["type"])}>
          <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Cuenta bancaria</SelectItem>
            <SelectItem value="cash" disabled={hasCashAccount}>Efectivo {hasCashAccount && "(Ya existe una)"}</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label className="text-xs">Saldo inicial</Label><Input type="number" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="h-11 rounded-2xl" /></div>
        <div><Label className="text-xs">Moneda</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-11 rounded-2xl" /></div>
      </div>
      <div>
        <Label className="text-xs">Desglose de efectivo (opcional)</Label>
        {type === "cash" ? (
          <DenominationsEditor value={denoms} onChange={(d) => setDenoms(d)} />
        ) : (
          <p className="text-[10px] text-muted-foreground mt-1">Desglose disponible solo para cuentas en efectivo.</p>
        )}
      </div>
      {type === "bank" && (
        <div className="space-y-2">
          <div><Label className="text-xs">CLABE interbancaria</Label><Input value={clabe} onChange={(e) => setClabe(e.target.value)} placeholder="18 dígitos" className="h-11 rounded-2xl" /></div>
          <div><Label className="text-xs">Banco</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="h-11 rounded-2xl" /></div>
          <div><Label className="text-xs">Nombre del titular</Label><Input value={holderName} onChange={(e) => setHolderName(e.target.value)} className="h-11 rounded-2xl" /></div>
        </div>
      )}
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">Guardar</Button>
    </form>
  );
}

function AccountSettings() {
  const { session } = useAuth();
  const [emailOpen, setEmailOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const provider = session?.user?.app_metadata?.provider;

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) { toast.error('Correo inválido'); return; }
    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setChangingEmail(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Correo actualizado. Revisa tu bandeja para confirmar.');
    setEmailOpen(false);
    setNewEmail('');
  };

  const handleChangePassword = async () => {
    if (!newPass || newPass.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (newPass !== confirmPass) { toast.error('Las contraseñas no coinciden'); return; }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setChangingPass(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Contraseña actualizada correctamente');
    setPassOpen(false);
    setNewPass('');
    setConfirmPass('');
  };

  return (
    <>
      {/* Change email */}
      <div className="flex items-center gap-3 w-full rounded-2xl bg-card border border-border p-4 mt-3">
        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{session?.user?.email ?? 'Correo electrónico'}</p>
          <p className="text-xs text-muted-foreground">
            {provider && provider !== 'email' ? `Iniciaste con ${provider}` : 'Contraseña configurada'}
          </p>
        </div>
        <button onClick={() => setEmailOpen(true)} className="text-xs font-semibold text-primary hover:underline shrink-0">Cambiar</button>
      </div>

      {provider === 'email' || !provider ? (
        <div className="flex items-center gap-3 w-full rounded-2xl bg-card border border-border p-4 mt-2">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Contraseña</p>
            <p className="text-xs text-muted-foreground">••••••••</p>
          </div>
          <button onClick={() => setPassOpen(true)} className="text-xs font-semibold text-primary hover:underline shrink-0">Cambiar</button>
        </div>
      ) : null}

      {/* Email change dialog */}
      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setEmailOpen(false)}>
          <div className="max-w-sm w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold">Cambiar correo</h3>
            <p className="text-xs text-muted-foreground">Te enviaremos un correo de confirmación a la nueva dirección.</p>
            <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nuevo@correo.com" className="h-11 rounded-2xl" type="email" autoFocus />
            <div className="flex gap-2">
              <Button onClick={() => setEmailOpen(false)} variant="outline" className="flex-1 h-11 rounded-2xl">Cancelar</Button>
              <Button onClick={handleChangeEmail} disabled={changingEmail} className="flex-1 h-11 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow">
                {changingEmail ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password change dialog */}
      {passOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setPassOpen(false)}>
          <div className="max-w-sm w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold">Cambiar contraseña</h3>
            <Input value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Nueva contraseña" className="h-11 rounded-2xl" type="password" autoFocus />
            <Input value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Confirmar contraseña" className="h-11 rounded-2xl" type="password" />
            <div className="flex gap-2">
              <Button onClick={() => setPassOpen(false)} variant="outline" className="flex-1 h-11 rounded-2xl">Cancelar</Button>
              <Button onClick={handleChangePassword} disabled={changingPass} className="flex-1 h-11 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow">
                {changingPass ? <Loader2 className="size-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SyncAllButton({ syncAllToCloud, queryClient }: { syncAllToCloud: () => Promise<number>; queryClient: any }) {
  const [state, setState] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [syncedCount, setSyncedCount] = useState(0);

  const handleClick = async () => {
    if (state === 'syncing') return;
    setState('syncing');
    try {
      const count = await syncAllToCloud();
      setSyncedCount(count);
      setState('done');
      queryClient.invalidateQueries();
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === 'syncing'}
      className={`w-full rounded-2xl border p-4 flex items-center gap-3 transition-all duration-300 group mt-3
        ${state === 'idle' ? 'bg-card border-border hover:bg-primary/5 hover:border-primary/30' : ''}
        ${state === 'syncing' ? 'bg-primary/5 border-primary/30' : ''}
        ${state === 'done' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700' : ''}`}
    >
      <div className={`size-9 rounded-xl flex items-center justify-center transition-all duration-300
        ${state === 'idle' ? 'bg-primary/10 text-primary group-hover:bg-primary/20' : ''}
        ${state === 'syncing' ? 'bg-primary/20 text-primary' : ''}
        ${state === 'done' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : ''}`}
      >
        {state === 'idle' && <Cloud className="size-4 transition-transform duration-300 group-hover:scale-110" />}
        {state === 'syncing' && (
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {state === 'done' && (
          <svg className="size-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div className="flex-1 text-left">
        <p className={`font-semibold text-sm transition-colors duration-300
          ${state === 'idle' ? 'text-foreground group-hover:text-primary' : ''}
          ${state === 'syncing' ? 'text-primary' : ''}
          ${state === 'done' ? 'text-emerald-700 dark:text-emerald-300' : ''}`}
        >
          {state === 'idle' && 'Sincronizar todo a la nube'}
          {state === 'syncing' && 'Sincronizando datos...'}
          {state === 'done' && `${syncedCount} registros sincronizados`}
        </p>
        <p className={`text-xs transition-colors duration-300
          ${state === 'idle' ? 'text-muted-foreground' : ''}
          ${state === 'syncing' ? 'text-muted-foreground' : ''}
          ${state === 'done' ? 'text-emerald-600/70 dark:text-emerald-400/70' : ''}`}
        >
          {state === 'idle' && 'Sube cuentas, movimientos, metas y deudas a Supabase'}
          {state === 'syncing' && 'Borrando datos anteriores y subiendo todo...'}
          {state === 'done' && 'Todos tus datos están en la nube'}
        </p>
      </div>
    </button>
  );
}
