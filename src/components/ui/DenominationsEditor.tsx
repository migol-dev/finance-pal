import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Denomination, fmt } from "@/lib/finance";

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
    const next = denoms.map((d, idx) => idx === i ? { ...d, ...patch } : d);
    // Normalize values to avoid negatives
    const cleaned = next.map((d) => ({ ...d, value: Number(d.value) < 0 ? Math.abs(Number(d.value)) : Number(d.value), count: Number(d.count) < 0 ? 0 : Number(d.count) }));
    setDenoms(cleaned); onChange(cleaned);
  };

  const addRow = () => { const next = [...denoms, { value: 0, count: 0, kind: "bill" }]; setDenoms(next); onChange(next); };
  const removeRow = (i: number) => { const next = denoms.filter((_, idx) => idx !== i); setDenoms(next); onChange(next); };

  const total = denoms.reduce((s, d) => s + (Number(d.value || 0) * Number(d.count || 0)), 0);

  useEffect(() => {
    // Validate denoms
    let msg: string | null = null;
    for (const d of denoms) {
      if (Number(d.value) <= 0) { msg = "Todas las denominaciones deben tener un valor mayor a 0."; break; }
      if (!Number.isFinite(Number(d.count)) || Number(d.count) < 0) { msg = "Las cantidades deben ser números enteros >= 0."; break; }
    }
    setError(msg);
  }, [denoms]);

  return (
    <div className="space-y-2">
      <Label className="text-xs">Desglose de efectivo</Label>
      <div className="grid grid-cols-12 gap-2 text-[11px] text-muted-foreground">
        <div className="col-span-5 font-semibold">Denominación</div>
        <div className="col-span-3 font-semibold">Cantidad</div>
        <div className="col-span-3 font-semibold">Tipo</div>
        <div className="col-span-1" />
      </div>
      <div className="space-y-2">
        {denoms.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input type="number" step="0.01" value={String(d.value)} onChange={(e) => update(i, { value: parseFloat(e.target.value || "0") })} className="w-28" />
            <Input type="number" value={String(d.count)} onChange={(e) => update(i, { count: parseInt(e.target.value || "0") })} className="w-20" />
            <select value={d.kind ?? "bill"} onChange={(e) => update(i, { kind: e.target.value as "bill" | "coin" })} className="h-11 rounded-2xl bg-card border border-border px-2">
              <option value="bill">Billete</option>
              <option value="coin">Moneda</option>
            </select>
            <button type="button" onClick={() => removeRow(i)} className="text-destructive text-sm px-2">Eliminar</button>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="button" onClick={addRow} className="rounded-2xl">Agregar denominación</Button>
        <div className={`ml-auto text-sm font-bold ${error ? "text-destructive" : ""}`}>Total: {fmt(total)}</div>
      </div>
    </div>
  );
}
