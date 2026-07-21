import { useState } from "react";
import { motion } from "@/lib/framer";
import { Button } from "@/components/ui/button";
import { CloudUpload, Download, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useFinance } from "@/store/finance-store";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  onUpload: () => void;
  onDownload: () => void;
}

export function DataConflictDialog({ onUpload, onDownload }: Props) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState<"upload" | "download" | null>(null);
  const set = useFinance.setState;

  const handleUpload = () => {
    onUpload();
    navigate("/migracion");
  };

  const handleDownload = async () => {
    if (!session?.user?.id) return;
    setLoading("download");
    const userId = session.user.id;

    try {
      const [accountsRes, txRes, fixedRes, goalsRes, debtsRes] = await Promise.all([
        supabase.from("accounts").select("*").eq("user_id", userId),
        supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
        supabase.from("fixed_items").select("*").eq("user_id", userId),
        supabase.from("goals").select("*").eq("user_id", userId),
        supabase.from("debts").select("*, payments:debt_payments(*)").eq("user_id", userId),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (txRes.error) throw txRes.error;
      if (fixedRes.error) throw fixedRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (debtsRes.error) throw debtsRes.error;

      const mapAccount = (r: any) => ({
        id: r.id, name: r.name, type: r.type,
        initialBalance: Number(r.initial_balance ?? 0),
        currency: r.currency, denominations: r.denominations ?? [],
        clabe: r.clabe, bank: r.bank, holderName: r.holder_name,
      });

      const mapTx = (r: any) => ({
        id: r.id, type: r.type, category: r.category, concept: r.concept,
        amount: Number(r.amount), date: r.date, note: r.note,
        icon: r.icon, paymentMethod: r.payment_method, fixedId: r.fixed_id,
        accountId: r.account_id, transferToAccountId: r.transfer_to_account_id,
        externalPayee: r.external_payee, receipt: r.receipt,
      });

      const mapFixed = (r: any) => ({
        id: r.id, type: r.type, category: r.category, concept: r.concept,
        amount: Number(r.amount), frequency: r.frequency, active: r.active,
        note: r.note, startDate: r.start_date, endDate: r.end_date,
        priority: r.priority, payDay: r.pay_day, payWeekDay: r.pay_week_day,
        icon: r.icon, paymentMethod: r.payment_method, accountId: r.account_id,
      });

      const mapGoal = (r: any) => ({
        id: r.id, name: r.name, target: Number(r.target), saved: Number(r.saved ?? 0),
        emoji: r.emoji, color: r.color, deadline: r.deadline, icon: r.icon,
        purchaseUrl: r.purchase_url, contributions: r.contributions ?? [],
        pinned: r.pinned, createdAt: r.created_at,
      });

      const mapDebt = (r: any) => ({
        id: r.id, person: r.person, concept: r.concept, amount: Number(r.amount),
        date: r.date, dueDate: r.due_date, note: r.note, icon: r.icon,
        accountId: r.account_id,
        payments: (r.payments ?? []).map((p: any) => ({
          id: p.id, amount: Number(p.amount), date: p.date, note: p.note,
          paymentMethod: p.payment_method, accountId: p.account_id,
        })),
      });

      set({
        accounts: (accountsRes.data ?? []).map(mapAccount),
        transactions: (txRes.data ?? []).map(mapTx),
        fixedItems: (fixedRes.data ?? []).map(mapFixed),
        goals: (goalsRes.data ?? []).map(mapGoal),
        debts: (debtsRes.data ?? []).map(mapDebt),
      });

      toast.success("Datos de la nube descargados correctamente");
      onDownload();
    } catch (e: any) {
      console.error("Download error:", e);
      toast.error("Error al descargar datos: " + (e?.message ?? ""));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-5"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto size-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
            <AlertTriangle className="size-7 text-yellow-500" />
          </div>
          <h2 className="text-lg font-extrabold">Datos en conflicto</h2>
          <p className="text-xs text-muted-foreground">
            Este navegador tiene datos guardados localmente, pero tu cuenta en la nube también tiene datos. 
            ¿Qué deseas hacer?
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleUpload}
            disabled={!!loading}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold flex items-center gap-3"
          >
            {loading === "upload" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <CloudUpload className="size-5" />
            )}
            <div className="text-left">
              <p className="text-sm">Subir datos locales</p>
              <p className="text-[10px] opacity-80 font-normal">Guarda mis datos locales en la nube</p>
            </div>
          </Button>

          <Button
            onClick={handleDownload}
            disabled={!!loading}
            variant="outline"
            className="w-full h-14 rounded-2xl border-border font-bold flex items-center gap-3"
          >
            {loading === "download" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Download className="size-5" />
            )}
            <div className="text-left">
              <p className="text-sm">Usar datos de la nube</p>
              <p className="text-[10px] text-muted-foreground font-normal">Reemplaza mis datos locales con los de la nube</p>
            </div>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
