import { useState, useEffect, useMemo, useRef, memo } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Check, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CATEGORY_EMOJI, Transaction, Account } from "@/lib/finance";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import { cn } from "@/lib/utils";

export const QuickTransactionSheet = memo(function QuickTransactionSheet() {
  const { isOpen, closeQuickTx, defaultType } = useQuickTxModal();
  const { addTx, addTransaction, accounts } = useFinanceData();
  const saveTx = addTransaction ?? addTx;

  const prevOpenRef = useRef(false);
  const [type, setType] = useState<"expense" | "income">(defaultType);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("Otros");
  const [accountId, setAccountId] = useState<string>("");

  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;
  const [date, setDate] = useState(today);

  // Sincronizar tipo por defecto únicamente en la transición a abierto
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setType(defaultType);
      setConcept("");
      setAmount("");
      setNote("");
      setCategory(defaultType === "income" ? "Trabajo" : "Alimentación");
      setDate(today);
      if (accounts && accounts.length > 0) {
        setAccountId(accounts[0].id);
      } else {
        setAccountId("");
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, defaultType, accounts, today]);

  const categories = useMemo(() => Object.keys(CATEGORY_EMOJI), []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/,/g, ""));
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a 0");
      return;
    }
    if (!concept.trim()) {
      toast.error("Ingresa el concepto del movimiento");
      return;
    }

    try {
      let txDate = new Date();
      if (date) {
        const parsed = new Date(`${date}T12:00:00`);
        if (!isNaN(parsed.getTime())) {
          txDate = parsed;
        }
      }

      const payload: Omit<Transaction, "id"> = {
        type,
        concept: concept.trim(),
        amount: parsedAmount,
        category,
        date: txDate.toISOString(),
        accountId: accountId || accounts?.[0]?.id || undefined,
        paymentMethod: "transfer",
        note: note.trim() || undefined,
      };

      await saveTx(payload);
      toast.success(type === "expense" ? "Gasto registrado con éxito" : "Ingreso registrado con éxito");
      closeQuickTx();
    } catch {
      toast.error("Error al guardar el movimiento");
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeQuickTx()}>
      <DrawerContent className="max-w-lg mx-auto bg-card border-border/80 text-foreground px-4 pb-6 pt-2 rounded-t-[20px] shadow-2xl">
        <DrawerHeader className="text-left px-0 pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold font-display-v2 tracking-tight text-foreground">
              Registro Rápido de Movimiento
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                type="button"
                className="size-8 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                aria-label="Cerrar"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </DrawerClose>
          </div>
          <DrawerDescription className="text-xs text-muted-foreground">
            Añade un gasto o ingreso al instante en menos de 3 segundos.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Selector de Tipo (Gasto vs Ingreso) */}
          <div className="grid grid-cols-2 p-1 bg-muted/50 rounded-xl border border-border/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategory("Alimentación");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all",
                type === "expense"
                  ? "bg-card text-destructive shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownLeft className="size-4" strokeWidth={2} />
              Gasto
            </button>
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategory("Trabajo");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all",
                type === "income"
                  ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowUpRight className="size-4" strokeWidth={2} />
              Ingreso
            </button>
          </div>

          {/* Monto Héroe en JetBrains Mono */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
              Monto ($)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground font-mono-tabular">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-2xl h-13 font-bold font-mono-tabular tracking-tight bg-background/50 border-border focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
              Concepto
            </label>
            <Input
              type="text"
              required
              placeholder={type === "expense" ? "Ej. Supermercado, Café, Gasolina" : "Ej. Nómina, Venta, Freelance"}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="h-10 text-sm bg-background/50 border-border"
            />
          </div>

          {/* Categoría y Cuenta */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                Categoría
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 text-xs bg-background/50 border-border">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {CATEGORY_EMOJI[c]} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                Cuenta
              </label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
                disabled={!accounts || accounts.length === 0}
              >
                <SelectTrigger className="h-10 text-xs bg-background/50 border-border truncate">
                  <SelectValue placeholder="Cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((acc: Account) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha y Nota Opcional */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                Fecha
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 text-xs font-mono-tabular bg-background/50 border-border"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                Nota (Opcional)
              </label>
              <Input
                type="text"
                placeholder="Detalle extra"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-10 text-xs bg-background/50 border-border"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-3 pb-0">
            <Button
              type="submit"
              className={cn(
                "w-full h-11 text-sm font-semibold rounded-xl text-primary-foreground shadow-md transition-all active:scale-[0.98]",
                type === "expense" ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
              )}
            >
              <Check className="size-4 mr-2" strokeWidth={2} />
              Guardar {type === "expense" ? "Gasto" : "Ingreso"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
});
