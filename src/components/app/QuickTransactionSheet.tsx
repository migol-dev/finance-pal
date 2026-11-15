import { useState, useEffect, useMemo, useRef, memo } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Loader2,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
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
import { CategorySelectWithCreate } from "@/components/app/CategorySelectWithCreate";
import { ReceiptPreview } from "@/components/app/ReceiptPreview";
import { AppIcon } from "@/components/icons/AppIcon";
import {
  Account,
  PAYMENT_METHOD_ICON,
  PAYMENT_METHOD_LABEL,
  PaymentMethod,
  Transaction,
} from "@/lib/finance";
import {
  allowedMethodsForAccount,
  buildExternalPayee,
  isAutoCashAccount,
  resolvePaymentMethodForAccount,
  supportsTransferDetails,
  validateClabeOrLast4,
} from "@/lib/payment-method-rules";
import { prepareReceiptImage, type PreparedReceipt } from "@/lib/receipt-pipeline";
import { generateSecureId } from "@/lib/sanitizers";
import { isSupabaseEnabled } from "@/lib/supabase";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import { cn } from "@/lib/utils";

function getTodayDateString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const QuickTransactionSheet = memo(function QuickTransactionSheet() {
  const { isOpen, closeQuickTx, defaultType } = useQuickTxModal();
  const { addTx, addTransaction, uploadReceipt, accounts } = useFinanceData();
  const saveTx = addTransaction ?? addTx;

  const prevOpenRef = useRef(false);
  const [type, setType] = useState<"expense" | "income">(defaultType);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("Alimentación");
  const [accountId, setAccountId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [date, setDate] = useState<string>(getTodayDateString);

  // Detalles progresivos de transferencia y comprobante
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [payeeName, setPayeeName] = useState("");
  const [payeeBank, setPayeeBank] = useState("");
  const [payeeClabe, setPayeeClabe] = useState("");
  const [preparedReceipt, setPreparedReceipt] = useState<PreparedReceipt | null>(null);
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedAccount = useMemo<Account | undefined>(
    () => accounts?.find((a) => a.id === accountId) ?? accounts?.[0],
    [accounts, accountId]
  );

  const allowedMethods = useMemo(
    () => allowedMethodsForAccount(selectedAccount),
    [selectedAccount]
  );
  const autoCash = isAutoCashAccount(selectedAccount);
  const showTransferConfig = supportsTransferDetails(paymentMethod);

  // Reiniciar campos en la transición a abierto
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      const initialAcc = accounts?.[0];
      setType(defaultType);
      setConcept("");
      setAmount("");
      setNote("");
      setCategory(defaultType === "income" ? "Trabajo / Sueldo" : "Alimentación");
      setDate(getTodayDateString());
      setAccountId(initialAcc?.id ?? "");
      setPaymentMethod(resolvePaymentMethodForAccount(initialAcc));
      setDetailsOpen(false);
      setPayeeName("");
      setPayeeBank("");
      setPayeeClabe("");
      setPreparedReceipt(null);
      setIsProcessingReceipt(false);
      setIsSaving(false);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, defaultType, accounts]);

  const handleAccountChange = (nextAccountId: string) => {
    setAccountId(nextAccountId);
    const nextAcc = accounts?.find((a) => a.id === nextAccountId);
    const nextMethod = resolvePaymentMethodForAccount(nextAcc, paymentMethod);
    setPaymentMethod(nextMethod);
    if (!supportsTransferDetails(nextMethod)) {
      setDetailsOpen(false);
    }
  };

  const handlePaymentMethodChange = (nextMethod: PaymentMethod) => {
    setPaymentMethod(nextMethod);
    if (!supportsTransferDetails(nextMethod)) {
      setDetailsOpen(false);
    }
  };

  const handleReceiptPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsProcessingReceipt(true);
    try {
      const result = await prepareReceiptImage(file);
      setPreparedReceipt(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo procesar el comprobante");
    } finally {
      setIsProcessingReceipt(false);
    }
  };

  const hasFilledDetails = Boolean(
    payeeName.trim() || payeeBank.trim() || payeeClabe.trim() || preparedReceipt
  );

  const clabeCheck = useMemo(
    () => validateClabeOrLast4(payeeClabe),
    [payeeClabe]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const parsedAmount = parseFloat(amount.replace(/,/g, ""));
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a 0");
      return;
    }
    if (!concept.trim()) {
      toast.error("Ingresa el concepto del movimiento");
      return;
    }

    const resolvedMethod = resolvePaymentMethodForAccount(selectedAccount, paymentMethod);
    if (supportsTransferDetails(resolvedMethod) && !clabeCheck.valid) {
      setDetailsOpen(true);
      toast.error(clabeCheck.error ?? "Verifica los dígitos de cuenta/CLABE");
      return;
    }

    setIsSaving(true);
    try {
      let txDate = new Date();
      if (date) {
        const parsed = new Date(`${date}T12:00:00`);
        if (!isNaN(parsed.getTime())) {
          txDate = parsed;
        }
      }

      const txId = generateSecureId();
      const externalPayee = supportsTransferDetails(resolvedMethod)
        ? buildExternalPayee({
            name: payeeName,
            bank: payeeBank,
            clabe: payeeClabe,
          })
        : undefined;

      const payload: Omit<Transaction, "id"> & { id?: string } = {
        id: txId,
        type,
        concept: concept.trim(),
        amount: parsedAmount,
        category,
        date: txDate.toISOString(),
        accountId: selectedAccount?.id || accounts?.[0]?.id || undefined,
        paymentMethod: resolvedMethod,
        note: note.trim() || undefined,
        ...(externalPayee ? { externalPayee } : {}),
        ...(preparedReceipt ? { receipt: preparedReceipt.dataUrl } : {}),
      };

      const createdId = (await saveTx(payload as Omit<Transaction, "id">)) || txId;

      if (preparedReceipt && uploadReceipt && isSupabaseEnabled) {
        void uploadReceipt({
          transactionId: createdId,
          file: preparedReceipt.blob,
          mimeType: preparedReceipt.mimeType,
        }).catch(() => {
          // Permanece el respaldo comprimido local en el movimiento
        });
      }

      toast.success(
        type === "expense" ? "Gasto registrado con éxito" : "Ingreso registrado con éxito"
      );
      closeQuickTx();
    } catch {
      toast.error("Error al guardar el movimiento");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeQuickTx()}>
      <DrawerContent className="max-w-lg mx-auto max-h-[92dvh] bg-card border-t border-border text-foreground px-4 pb-6 rounded-t-2xl flex flex-col">
        <DrawerHeader className="text-left px-0 pb-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DrawerTitle className="text-base sm:text-lg font-bold font-display-v2 tracking-tight text-foreground">
              Registro Rápido de Movimiento
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                type="button"
                className="size-8 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
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

        <form onSubmit={handleSave} className="space-y-3 overflow-y-auto pr-0.5 flex-1">
          {/* Selector de Tipo (Gasto vs Ingreso) */}
          <div className="grid grid-cols-2 p-1 bg-muted/50 rounded-xl border border-border/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategory("Alimentación");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all active:scale-[0.98]",
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
                setCategory("Trabajo / Sueldo");
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all active:scale-[0.98]",
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
            <label
              htmlFor="quick-tx-amount"
              className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase"
            >
              Monto ($)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground font-mono-tabular">
                $
              </span>
              <Input
                id="quick-tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-2xl h-12 font-bold font-mono-tabular tracking-tight bg-background/50 border-border focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-1">
            <label
              htmlFor="quick-tx-concept"
              className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase"
            >
              Concepto
            </label>
            <Input
              id="quick-tx-concept"
              type="text"
              required
              placeholder={
                type === "expense"
                  ? "Ej. Supermercado, Café, Gasolina"
                  : "Ej. Nómina, Venta, Freelance"
              }
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="h-10 text-sm bg-background/50 border-border"
            />
          </div>

          {/* Categoría y Cuenta (1 col <360px, 2 col >=360px) */}
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                Categoría
              </label>
              <CategorySelectWithCreate value={category} onChange={setCategory} />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="quick-tx-account"
                className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase"
              >
                Cuenta
              </label>
              <Select
                value={selectedAccount?.id ?? accountId}
                onValueChange={handleAccountChange}
                disabled={!accounts || accounts.length === 0}
              >
                <SelectTrigger
                  id="quick-tx-account"
                  aria-label="Cuenta"
                  className="h-10 text-xs bg-background/50 border-border truncate"
                >
                  <SelectValue placeholder="Cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((acc: Account) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <AppIcon
                          name={acc.type === "cash" ? "cash" : acc.type === "bank" ? "bank" : "wallet"}
                          className="size-3.5 text-muted-foreground"
                        />
                        <span>{acc.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Método de Pago inteligente dependiente del tipo de cuenta */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                Método de pago
              </span>
              {autoCash && (
                <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-primary font-semibold">
                  Automático
                </span>
              )}
            </div>

            {autoCash ? (
              <div
                data-testid="quick-tx-auto-cash"
                className="flex items-center justify-between h-10 px-3 rounded-xl border border-primary/25 bg-primary/10 text-primary text-xs font-semibold"
              >
                <span className="inline-flex items-center gap-2">
                  <AppIcon name="cash" className="size-4" />
                  <span>Efectivo · Automático</span>
                </span>
                <span className="text-[10px] font-mono-tabular text-primary/80">
                  Cuenta física
                </span>
              </div>
            ) : (
              <div
                role="radiogroup"
                aria-label="Método de pago"
                className={cn(
                  "grid gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60",
                  allowedMethods.length === 2
                    ? "grid-cols-2"
                    : allowedMethods.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-4"
                )}
              >
                {allowedMethods.map((method) => {
                  const selected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handlePaymentMethodChange(method)}
                      className={cn(
                        "h-9 px-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]",
                        selected
                          ? "bg-card text-foreground font-semibold shadow-xs border border-border/70"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <AppIcon
                        name={PAYMENT_METHOD_ICON[method]}
                        className={cn("size-3.5", selected ? "text-primary" : "text-muted-foreground")}
                      />
                      <span className="truncate">{PAYMENT_METHOD_LABEL[method]}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Desglose progresivo de detalles de transferencia y comprobante */}
            {showTransferConfig && (
              <div className="pt-0.5 space-y-2">
                <button
                  type="button"
                  aria-expanded={detailsOpen}
                  onClick={() => setDetailsOpen((prev) => !prev)}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors active:scale-[0.99]",
                    detailsOpen || hasFilledDetails
                      ? "border-primary/35 bg-primary/5 text-foreground"
                      : "border-border/80 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <SlidersHorizontal className="size-3.5 text-primary shrink-0" strokeWidth={1.75} />
                    <span className="truncate">Configurar detalles</span>
                    {hasFilledDetails && (
                      <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold shrink-0">
                        Configurado
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform duration-200 shrink-0",
                      detailsOpen && "rotate-180"
                    )}
                    strokeWidth={1.75}
                  />
                </button>

                {detailsOpen && (
                  <div className="rounded-xl border border-border/80 bg-muted/25 p-3 space-y-2.5">
                    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label
                          htmlFor="quick-tx-payee-name"
                          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                        >
                          {type === "income" ? "Remitente" : "Destinatario"}
                        </label>
                        <Input
                          id="quick-tx-payee-name"
                          type="text"
                          maxLength={100}
                          value={payeeName}
                          onChange={(e) => setPayeeName(e.target.value)}
                          placeholder={
                            type === "income" ? "Ej. Empresa o persona" : "Ej. Persona o comercio"
                          }
                          className="h-9 text-xs bg-background border-border"
                        />
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="quick-tx-payee-bank"
                          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                        >
                          Banco
                        </label>
                        <Input
                          id="quick-tx-payee-bank"
                          type="text"
                          maxLength={100}
                          value={payeeBank}
                          onChange={(e) => setPayeeBank(e.target.value)}
                          placeholder="Ej. BBVA, Santander, Nu"
                          className="h-9 text-xs bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="quick-tx-payee-clabe"
                        className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        CLABE o últimos 4 dígitos
                      </label>
                      <Input
                        id="quick-tx-payee-clabe"
                        type="text"
                        inputMode="numeric"
                        maxLength={22}
                        value={payeeClabe}
                        onChange={(e) => setPayeeClabe(e.target.value)}
                        placeholder="Ej. 4821 o 18 dígitos"
                        className="h-9 text-xs font-mono-tabular bg-background border-border"
                      />
                      {payeeClabe.trim() && !clabeCheck.valid && (
                        <p className="text-[11px] text-destructive font-medium">
                          {clabeCheck.error}
                        </p>
                      )}
                    </div>

                    {/* Comprobante adjunto compacto */}
                    <div className="space-y-1.5 pt-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">
                        Comprobante (opcional)
                      </span>
                      <label
                        htmlFor="quick-tx-receipt-input"
                        className="flex items-center justify-center gap-2 h-9 px-3 rounded-lg border border-dashed border-border bg-background/60 hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition active:scale-[0.99]"
                      >
                        {isProcessingReceipt ? (
                          <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
                        ) : (
                          <Upload className="size-3.5 text-primary shrink-0" strokeWidth={1.75} />
                        )}
                        <span className="truncate">
                          {preparedReceipt
                            ? "Cambiar comprobante adjunto"
                            : "Adjuntar comprobante (JPG, PNG, WebP)"}
                        </span>
                        <input
                          id="quick-tx-receipt-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleReceiptPick}
                          className="sr-only"
                        />
                      </label>
                      {preparedReceipt && (
                        <ReceiptPreview
                          receipt={preparedReceipt.dataUrl}
                          compact
                          onRemove={() => setPreparedReceipt(null)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fecha y Nota Opcional */}
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label
                htmlFor="quick-tx-date"
                className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase"
              >
                Fecha
              </label>
              <Input
                id="quick-tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 text-xs font-mono-tabular bg-background/50 border-border"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="quick-tx-note"
                className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase"
              >
                Nota (Opcional)
              </label>
              <Input
                id="quick-tx-note"
                type="text"
                placeholder="Detalle extra"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-10 text-xs bg-background/50 border-border"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-2 pb-0 shrink-0">
            <Button
              type="submit"
              disabled={isSaving || isProcessingReceipt}
              className={cn(
                "w-full h-11 text-sm font-semibold rounded-xl text-primary-foreground shadow-md transition-all active:scale-[0.98]",
                type === "expense"
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-primary hover:bg-primary/90"
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
