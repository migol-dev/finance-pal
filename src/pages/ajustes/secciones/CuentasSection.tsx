import { memo, useState, useMemo } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { Account, Denomination, cashTotalFromDenominations, fmt, computeBalances } from "@/lib/finance";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import DenominationsEditor from "@/components/ui/DenominationsEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, HandCoins, Database, Landmark, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

function AccountForm({
  initial,
  onSave,
  accounts,
}: {
  initial: Account | null;
  onSave: (a: Omit<Account, "id">) => void;
  accounts: Account[];
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<Account["type"]>(initial?.type ?? "bank");
  const [initialBalance, setInitialBalance] = useState(initial?.initialBalance ? String(initial?.initialBalance) : "0");
  const [currency, setCurrency] = useState(initial?.currency ?? "MXN");
  const [denoms, setDenoms] = useState<Denomination[] | undefined>(initial?.denominations ?? []);
  const [clabe, setClabe] = useState(initial?.clabe ?? "");
  const [bankName, setBankName] = useState(initial?.bank ?? "");
  const [holderName, setHolderName] = useState(initial?.holderName ?? "");

  const hasCashAccount = accounts.some((a) => a.type === "cash" && a.id !== initial?.id);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) { toast.error("Nombre requerido"); return; }
        const bal = parseFloat(initialBalance) || 0;
        if (type === "cash" && denoms && denoms.length > 0) {
          const denomTotal = cashTotalFromDenominations(denoms);
          if (denomTotal !== bal) {
            toast.error("El total del desglose debe coincidir con el saldo inicial para cuentas en efectivo.");
            return;
          }
        }
        if (type === "bank") {
          const onlyDigits = (clabe || "").replace(/\s+/g, "");
          if (onlyDigits && !/^[0-9]{18}$/.test(onlyDigits)) {
            toast.error("CLABE inválida. Debe contener 18 dígitos.");
            return;
          }
        }
        const finalClabe = type === "bank" && clabe ? clabe.replace(/\s+/g, "") : undefined;
        onSave({
          name: name.trim(),
          type,
          initialBalance: bal,
          currency,
          denominations: denoms && denoms.length > 0 ? denoms : undefined,
          clabe: finalClabe,
          bank: bankName.trim() || undefined,
          holderName: holderName.trim() || undefined,
        });
      }}
      className="space-y-3"
    >
      <div>
        <Label className="text-xs">Nombre de la cuenta</Label>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. BBVA Débito" className="h-11 rounded-2xl" />
      </div>
      <div>
        <Label className="text-xs">Tipo de cuenta</Label>
        <Select value={type} onValueChange={(v) => setType(v as Account["type"])}>
          <SelectTrigger className="h-11 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank">Cuenta bancaria</SelectItem>
            <SelectItem value="cash" disabled={hasCashAccount}>
              Efectivo {hasCashAccount && "(Ya existe una)"}
            </SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Saldo inicial</Label>
          <Input type="number" step="any" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} className="h-11 rounded-2xl" />
        </div>
        <div>
          <Label className="text-xs">Moneda</Label>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-11 rounded-2xl" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Desglose de efectivo (opcional)</Label>
        {type === "cash" ? (
          <DenominationsEditor value={denoms} onChange={(d) => setDenoms(d)} />
        ) : (
          <p className="text-[10px] text-muted-foreground mt-1">Desglose disponible solo para cuentas de efectivo.</p>
        )}
      </div>
      {type === "bank" && (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">CLABE interbancaria (opcional)</Label>
            <Input value={clabe} onChange={(e) => setClabe(e.target.value)} placeholder="18 dígitos" className="h-11 rounded-2xl" />
          </div>
          <div>
            <Label className="text-xs">Banco</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ej. Santander" className="h-11 rounded-2xl" />
          </div>
          <div>
            <Label className="text-xs">Titular de la cuenta</Label>
            <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nombre del titular" className="h-11 rounded-2xl" />
          </div>
        </div>
      )}
      <Button type="submit" className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold">
        Guardar cuenta
      </Button>
    </form>
  );
}

export const CuentasSection = memo(function CuentasSection({ onBack }: SectionProps) {
  const { accounts, addAccount, updateAccount, removeAccount, transactions, debts } = useFinanceData();
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [cashDenomsState, setCashDenomsState] = useState<Denomination[] | undefined>(undefined);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const balances = useMemo(() => {
    const endOfMonth = new Date(2099, 11, 31, 23, 59, 59);
    return computeBalances(accounts, transactions, debts, endOfMonth);
  }, [accounts, transactions, debts]);

  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Cuentas y Efectivo"
        description="Administra tus cuentas bancarias, billeteras de efectivo y desglose físico"
        icon={Landmark}
        iconColorClass="bg-emerald-500/10 text-emerald-500"
        onBack={onBack}
      />

      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Tus Cuentas</h2>
        <Button
          size="sm"
          onClick={() => { setEditingAccount(null); setAccountsOpen(true); }}
          className="rounded-xl h-9 text-xs font-semibold gradient-primary text-primary-foreground border-0"
        >
          <Plus className="size-3.5 mr-1.5" /> Nueva cuenta
        </Button>
      </div>

      {/* Accounts List */}
      <div className="space-y-2.5">
        {accounts.map((a) => {
          const denomTotal = a.denominations && a.denominations.length > 0 ? cashTotalFromDenominations(a.denominations) : null;
          const computed = balances[a.id] ?? a.initialBalance ?? 0;
          return (
            <div key={a.id} className="rounded-2xl bg-card border border-border p-4 shadow-soft flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {a.type === "cash" ? <HandCoins className="size-5.5" /> : <Database className="size-5.5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm sm:text-base text-foreground truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {a.type === "cash" ? "Efectivo" : "Cuenta bancaria"} • {a.currency ?? "MXN"} • Saldo actual:{" "}
                    <span className="font-bold text-foreground">{fmt(computed)}</span>
                    {denomTotal != null && <span className="ml-1 text-primary">· Desglose: {fmt(denomTotal)}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setEditingAccount(a); setAccountsOpen(true); }}
                  className="size-8 p-0 rounded-xl"
                  aria-label={`Editar cuenta ${a.name}`}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAccountToDelete(a)}
                  className="size-8 p-0 rounded-xl text-destructive hover:bg-destructive/10"
                  aria-label={`Eliminar cuenta ${a.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desglose de efectivo */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Desglose de efectivo físico</h3>
        {accounts.find((a) => a.type === "cash") ? (
          (() => {
            const cash = accounts.find((a) => a.type === "cash")!;
            const denomTotal = (cashDenomsState && cashDenomsState.length > 0)
              ? cashTotalFromDenominations(cashDenomsState)
              : (cash.denominations ? cashTotalFromDenominations(cash.denominations) : 0);
            return (
              <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">Cuenta: {cash.name} ({cash.currency ?? "MXN"})</p>
                    <p className="text-xs text-muted-foreground">
                      Saldo inicial: {fmt(cash.initialBalance ?? 0)} • Total en desglose:{" "}
                      <span className="font-bold text-primary">{fmt(denomTotal)}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <DenominationsEditor value={cashDenomsState ?? cash.denominations} onChange={(d) => setCashDenomsState(d)} />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => { setEditingAccount(cash); setAccountsOpen(true); }}
                    className="rounded-xl h-10 text-xs"
                  >
                    Editar cuenta
                  </Button>
                  <Button
                    onClick={async () => {
                      const total = cashDenomsState && cashDenomsState.length > 0
                        ? cashTotalFromDenominations(cashDenomsState)
                        : (cash.denominations ? cashTotalFromDenominations(cash.denominations) : 0);
                      const bal = Number(cash.initialBalance ?? 0);
                      if (total !== bal) {
                        toast.error("El total del desglose no coincide con el saldo registrado. Ajusta los valores.");
                        return;
                      }
                      updateAccount(cash.id, { denominations: cashDenomsState && cashDenomsState.length > 0 ? cashDenomsState : undefined });
                      toast.success("Desglose guardado correctamente");
                    }}
                    className="rounded-xl h-10 gradient-primary text-primary-foreground border-0 shadow-glow font-bold text-xs"
                  >
                    Guardar desglose
                  </Button>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="rounded-2xl bg-card border border-border p-5 text-center shadow-soft space-y-2">
            <p className="text-sm text-muted-foreground">No tienes ninguna cuenta de tipo <span className="font-bold text-foreground">Efectivo</span> configurada.</p>
            <Button
              onClick={() => { setEditingAccount(null); setAccountsOpen(true); }}
              className="rounded-xl gradient-primary text-primary-foreground font-bold text-xs h-9"
            >
              Crear cuenta de efectivo
            </Button>
          </div>
        )}
      </div>

      {/* Account Modal */}
      <Dialog open={accountsOpen} onOpenChange={setAccountsOpen}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
            <DialogDescription className="sr-only">Formulario para crear o actualizar cuenta bancaria o de efectivo</DialogDescription>
          </DialogHeader>
          <AccountForm
            accounts={accounts}
            initial={editingAccount}
            onSave={(a) => {
              if (editingAccount) {
                updateAccount(editingAccount.id, a);
                toast.success("Cuenta actualizada");
              } else {
                addAccount(a);
                toast.success("Cuenta creada");
              }
              setAccountsOpen(false);
              setEditingAccount(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ElegantConfirm
        open={!!accountToDelete}
        onOpenChange={(v) => !v && setAccountToDelete(null)}
        title="¿Eliminar cuenta?"
        description={
          <span className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres eliminar <span className="font-bold text-foreground">"{accountToDelete?.name}"</span>? Sus movimientos asociados se desasignarán.
          </span>
        }
        onConfirm={() => {
          if (accountToDelete) {
            removeAccount(accountToDelete.id);
            setAccountToDelete(null);
            toast.success("Cuenta eliminada");
          }
        }}
        icon={Trash2}
        iconColor="bg-destructive"
        confirmText="Sí, eliminar"
      />
    </div>
  );
});

export default CuentasSection;
