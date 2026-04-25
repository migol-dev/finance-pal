import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function StatPill({ label, value, icon, tone = "default" }: {
  label: string; value: ReactNode; icon?: ReactNode;
  tone?: "default" | "success" | "danger" | "info";
}) {
  const tones = {
    default: "bg-muted text-foreground",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-secondary/10 text-secondary",
  };
  return (
    <div className="rounded-2xl bg-card border border-border p-3 shadow-soft">
      <div className="flex items-center gap-2 mb-1">
        {icon && <div className={cn("size-7 rounded-xl flex items-center justify-center", tones[tone])}>{icon}</div>}
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
      </div>
      <div className="text-lg font-bold tracking-tight">{value}</div>
    </div>
  );
}
