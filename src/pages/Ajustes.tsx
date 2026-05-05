import { useRef, useState } from "react";
import { useFinance, Currency } from "@/store/finance-store";
import { fmt, monthlyAmount, TYPE_LABEL, FREQ_LABEL, ItemType, Frequency, Priority, iconFor, IconRef, FixedItem, CATEGORY_EMOJI, PaymentMethod, PAYMENT_METHOD_LABEL, PAYMENT_METHOD_EMOJI } from "@/lib/finance";
import { Header } from "@/components/app/Header";
import { Plus, Trash2, Power, Smartphone, Database, RotateCcw, Pencil, Download, Upload, Sun, Moon, Target, History, HandCoins, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { IconPicker } from "@/components/app/IconPicker";
import { IconDisplay } from "@/components/app/IconDisplay";
import { Link } from "react-router-dom";

export default function Ajustes() {
  const { fixedItems, addFixed, updateFixed, removeFixed, toggleFixed, resetAll, exportData, importData, theme, toggleTheme, profile, setProfile } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedItem | null>(null);
  const [tab, setTab] = useState<"all" | ItemType>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const filtered = fixedItems.filter((i) => tab === "all" || i.type === tab);
  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (i: FixedItem) => { setEditing(i); setOpen(true); };

  const handleExport = () => {
    const json = exportData();
    const filename = `finance-pal-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([json], { type: "application/json" });
    // Try modern File System Access API to let the user pick the folder
    const anyWin = window as any;
    if (typeof anyWin.showSaveFilePicker === "function") {
      (async () => {
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
      })();
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Datos exportados (revisa Descargas)");
  };
  const handleImportFile = async (file: File) => {
    if (!confirm("Esto reemplazará todos tus datos actuales. ¿Continuar?")) return;
    try {
      if (file.size > 20 * 1024 * 1024) { toast.error("El archivo es demasiado grande (máx 20 MB)"); return; }
      const text = await file.text();
      const r = importData(text);
      if (r.ok) {
        toast.success("Datos importados");
        r.warnings?.forEach((w) => toast(w));
      } else {
        toast.error(r.error ?? "No se pudo importar");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo leer el archivo");
    }
  };

  return (
    <div>
      <Header title="Ajustes" subtitle="Configura tus fijos del mes" action={
        <Button onClick={openNew} className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow h-11"><Plus className="size-4 mr-1" />Agregar</Button>
      } />

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tu perfil</DialogTitle></DialogHeader>
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
          <FixedForm initial={editing} onSave={(i) => {
            if (editing) { updateFixed(editing.id, i); toast.success("Actualizado"); }
            else { addFixed(i); toast.success("Agregado"); }
            setOpen(false); setEditing(null);
          }} />
        </DialogContent>
      </Dialog>

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
              <p className="text-[11px] text-muted-foreground">{TYPE_LABEL[i.type]} • {FREQ_LABEL[i.frequency]}{i.payDay ? ` • día ${i.payDay}` : ""}</p>
            </button>
            <div className="text-right">
              <p className={`font-bold text-sm ${i.type === "income_fixed" ? "text-success" : i.type === "saving_fixed" ? "text-secondary" : "text-destructive"}`}>{fmt(i.amount)}</p>
              <p className="text-[10px] text-muted-foreground">{fmt(monthlyAmount(i))}/mes</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => openEdit(i)} className="text-muted-foreground hover:text-primary p-1"><Pencil className="size-4" /></button>
              <button onClick={() => toggleFixed(i.id)} className="text-muted-foreground hover:text-foreground p-1"><Power className="size-4" /></button>
              <button onClick={() => { if (confirm(`¿Eliminar "${i.concept}"?`)) removeFixed(i.id); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
            </div>
          </motion.div>
        ))}
      </div>

      <section className="px-5 mt-8 space-y-3">
        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Apariencia</h2>
        <button onClick={toggleTheme} className="w-full rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center gap-3 hover:bg-muted/50 transition">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm">Tema {theme === "dark" ? "oscuro" : "claro"}</p>
            <p className="text-xs text-muted-foreground">Toca para cambiar a {theme === "dark" ? "claro" : "oscuro azul"}</p>
          </div>
        </button>

        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground pt-2">Más</h2>
        <div className="grid grid-cols-3 gap-2">
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

        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground pt-2">Datos</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleExport} variant="secondary" className="rounded-2xl h-12 font-semibold"><Download className="size-4 mr-1" />Exportar</Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="rounded-2xl h-12 font-semibold"><Upload className="size-4 mr-1" />Importar</Button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ""; }} />
        </div>

        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Aplicación</h2>
        <InfoRow icon={<Smartphone className="size-4" />} title="App nativa Android" desc="Configurada con Capacitor. Sigue las instrucciones para compilar." />
        <InfoRow icon={<Database className="size-4" />} title="Almacenamiento local" desc="Tus datos se guardan en tu dispositivo. Privado y sin nube." />
        <button onClick={() => { if (confirm("¿Borrar TODOS los datos? No se puede deshacer.")) { resetAll(); toast("Datos borrados"); } }}
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
  const [note, setNote] = useState(initial?.note ?? "");
  const [icon, setIcon] = useState<IconRef | undefined>(initial?.icon);
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? `${new Date().getFullYear() + 5}-12-31`);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod ?? "transfer");

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const a = parseFloat(amount);
      if (!a || !concept) { toast.error("Completa concepto y monto"); return; }
      onSave({ type, category, concept, amount: a, frequency, active: initial?.active ?? true, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), priority, payDay: payDay ? parseInt(payDay) : undefined, note: note || undefined, icon, paymentMethod });
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
            <SelectItem value="Otros">✨ Otros</SelectItem>
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
      <div><Label className="text-xs">Día de pago (opcional, 1–28)</Label><Input type="number" min="1" max="28" value={payDay} onChange={(e) => setPayDay(e.target.value)} className="h-11 rounded-2xl" /></div>
      <div><Label className="text-xs">Nota (opcional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="h-11 rounded-2xl" /></div>
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">{initial ? "Guardar cambios" : "Crear"}</Button>
    </form>
  );
}
