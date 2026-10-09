import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { motion } from "@/lib/framer";
import { toast } from "sonner";
import { IconDisplay } from "@/components/app/IconDisplay";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import { fmt, iconFor, Goal, Account } from "@/lib/finance";
import { cn } from "@/lib/utils";

interface GoalCompactCardProps {
  goal: Goal;
  index: number;
  onViewMore: () => void;
  onContribute: (amount: number, date?: string, accountId?: string) => void;
  accounts: Account[];
}

export function GoalCompactCard({
  goal,
  index,
  onViewMore,
  onContribute,
  accounts,
}: GoalCompactCardProps) {
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const [confirmOpen, setConfirmOpen] = useState<{ amount: number } | null>(null);

  const handleQuickAdd = (amount: number) => {
    setConfirmOpen({ amount });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "rounded-3xl p-5 text-primary-foreground shadow-pop relative overflow-hidden",
        goal.color
      )}
    >
      <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <IconDisplay icon={iconFor(goal)} size="lg" className="bg-white/20 shadow-inner shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-base sm:text-lg leading-tight truncate">{goal.name}</p>
              <p className="text-[10px] opacity-80 font-semibold tracking-wider uppercase">
                {goal.pinned ? "Meta Principal" : "Meta Ahorro"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onViewMore}
            aria-label={`Ver detalles de ${goal.name}`}
            className="size-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition shrink-0"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-end justify-between gap-1">
            <p className="text-2xl sm:text-3xl font-black tabular-nums">{fmt(goal.saved)}</p>
            <p className="text-xs font-bold opacity-80 mb-1 tabular-nums">Objetivo: {fmt(goal.target)}</p>
          </div>
          <div className="h-2.5 rounded-full bg-white/20 overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-white rounded-full shadow-glow"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter pt-1">
            <span className="tabular-nums">{pct.toFixed(1)}%</span>
            <span className="opacity-70 tabular-nums">{fmt(Math.max(0, goal.target - goal.saved))} restantes</span>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => handleQuickAdd(100)}
            aria-label={`Aportar $100 a ${goal.name}`}
            className="flex-1 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-xs font-black border border-white/10"
          >
            +100
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(500)}
            aria-label={`Aportar $500 a ${goal.name}`}
            className="flex-1 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-xs font-black border border-white/10"
          >
            +500
          </button>
          <button
            type="button"
            onClick={() => handleQuickAdd(1000)}
            aria-label={`Aportar $1000 a ${goal.name}`}
            className="flex-1 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition text-xs font-black border border-white/10"
          >
            +1k
          </button>
          <button
            type="button"
            aria-label="Ver detalles o aportar"
            onClick={onViewMore}
            className="size-10 rounded-2xl bg-white/25 hover:bg-white/35 active:scale-95 transition flex items-center justify-center border border-white/20 shrink-0"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <ElegantConfirm
        open={!!confirmOpen}
        onOpenChange={(v) => !v && setConfirmOpen(null)}
        title="¿Confirmar aporte?"
        description={
          <span className="text-sm text-muted-foreground">
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
    </motion.div>
  );
}
