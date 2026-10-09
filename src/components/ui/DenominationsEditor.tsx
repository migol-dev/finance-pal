import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Denomination, fmt } from "@/lib/finance";
import { Trash2, Plus } from "lucide-react";

export default function DenominationsEditor({
  value,
  onChange,
}: {
  value?: Denomination[];
  onChange: (d: Denomination[]) => void;
}) {
  const [denoms, setDenoms] = useState<Denomination[]>(value ?? []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setDenoms(value ?? []), [value]);

  const update = (i: number, patch: Partial<Denomination>) => {
    const next = denoms.map((d, idx) => (idx === i ? { ...d, ...patch } : d));
    const cleaned = next.map((d) => ({
      ...d,
      value: Number(d.value) < 0 ? Math.abs(Number(d.value)) : Number(d.value),
      count: Number(d.count) < 0 ? 0 : Number(d.count),
    }));
    setDenoms(cleaned);
    onChange(cleaned);
  };

  const addRow = () => {
    const next = [...denoms, { value: 0, count: 0, kind: "bill" as const }];
    setDenoms(next);
    onChange(next);
  };

  const removeRow = (i: number) => {
    const next = denoms.filter((_, idx) => idx !== i);
    setDenoms(next);
    onChange(next);
  };

  const total = denoms.reduce((s, d) => s + Number(d.value || 0) * Number(d.count || 0), 0);

  useEffect(() => {
    let msg: string | null = null;
    for (const d of denoms) {
      if (Number(d.value) <= 0) {
        msg = "Todas las denominaciones deben tener un valor mayor a 0.";
        break;
      }
      if (!Number.isFinite(Number(d.count)) || Number(d.count) < 0) {
        msg = "Las cantidades deben ser números enteros >= 0.";
        break;
      }
    }
    setError(msg);
  }, [denoms]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-foreground">Desglose de efectivo</Label>
        <span className="text-xs text-muted-foreground">{denoms.length} denominaciones</span>
      </div>

      <div className="hidden sm:grid sm:grid-cols-[1fr_6rem_6.5rem_2.75rem] gap-2 text-xs font-semibold text-muted-foreground px-1">
        <div>Valor facial ($)</div>
        <div>Cantidad</div>
        <div>Tipo</div>
        <div />
      </div>

      <div className="space-y-2">
        {denoms.map((d, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_5rem_auto] sm:grid-cols-[1fr_6rem_6.5rem_2.75rem] gap-2 items-center p-2 rounded-xl bg-card border border-border"
          >
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block sm:hidden font-medium mb-1">Valor</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={String(d.value)}
                onChange={(e) => update(i, { value: parseFloat(e.target.value || "0") })}
                aria-label={`Valor de denominación ${i + 1}`}
                className="h-10 text-sm rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground block sm:hidden font-medium mb-1">Cant.</span>
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={String(d.count)}
                onChange={(e) => update(i, { count: parseInt(e.target.value || "0", 10) })}
                aria-label={`Cantidad de denominación ${i + 1}`}
                className="h-10 text-sm rounded-lg"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 min-w-0">
              <select
                value={d.kind ?? "bill"}
                onChange={(e) => update(i, { kind: e.target.value as "bill" | "coin" })}
                aria-label={`Tipo de denominación ${i + 1}`}
                className="h-10 flex-1 min-w-0 rounded-lg bg-muted text-foreground border border-border px-2 text-xs font-medium"
              >
                <option value="bill">Billete</option>
                <option value="coin">Moneda</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              aria-label={`Eliminar denominación ${i + 1}`}
              className="size-10 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center transition shrink-0 ml-auto"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <Button
          type="button"
          onClick={addRow}
          variant="outline"
          className="h-10 rounded-xl text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="size-4" />
          <span>Agregar denominación</span>
        </Button>
        <div className={`text-sm font-extrabold tabular-nums ${error ? "text-destructive" : "text-foreground"}`}>
          Total: {fmt(total)}
        </div>
      </div>
    </div>
  );
}
