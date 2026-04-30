import { useFinance } from "@/store/finance-store";
import { Header } from "@/components/app/Header";
import { Button } from "@/components/ui/button";
import { Trash2, History } from "lucide-react";
import { toast } from "sonner";

const ENTITY_LABEL: Record<string, string> = {
  transaction: "Movimiento",
  fixed: "Fijo",
  goal: "Meta",
  debt: "Deuda",
};
const ACTION_COLOR: Record<string, string> = {
  create: "text-success",
  update: "text-primary",
  delete: "text-destructive",
};

function fmtVal(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 40);
  if (typeof v === "string" && v.length > 40) return v.slice(0, 40) + "…";
  return String(v);
}

export default function Historial() {
  const { changeLog, clearChangeLog } = useFinance();

  return (
    <div>
      <Header title="Historial" subtitle="Cambios y ediciones" action={
        changeLog.length > 0 ? (
          <Button onClick={() => { if (confirm("¿Borrar todo el historial?")) { clearChangeLog(); toast("Historial borrado"); } }} variant="secondary" className="rounded-2xl h-11"><Trash2 className="size-4 mr-1" />Limpiar</Button>
        ) : undefined
      } />

      <div className="px-5 space-y-2">
        {changeLog.length === 0 && (
          <div className="rounded-2xl bg-muted/50 border border-dashed border-border p-8 text-center">
            <History className="size-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aún no hay cambios registrados</p>
          </div>
        )}
        {changeLog.map((e) => (
          <div key={e.id} className="rounded-2xl bg-card border border-border p-3 shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{e.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  <span className={`font-bold uppercase ${ACTION_COLOR[e.action]}`}>{e.action}</span> · {ENTITY_LABEL[e.entity]} · {new Date(e.at).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {e.changes && e.changes.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {e.changes.slice(0, 4).map((c, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">
                    <span className="font-semibold">{c.field}</span>: <span className="line-through opacity-60">{fmtVal(c.from)}</span> → <span className="text-foreground">{fmtVal(c.to)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}