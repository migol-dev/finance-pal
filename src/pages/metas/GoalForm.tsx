import { useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconPicker } from "@/components/app/IconPicker";
import { Goal, GoalFolder, IconRef } from "@/lib/finance";
import { PALETTES } from "./types";

interface GoalFormProps {
  initial: Goal | null;
  defaultFolderId?: string;
  folders: GoalFolder[];
  onSave: (g: Omit<Goal, "id">) => void;
}

export function GoalForm({ initial, defaultFolderId, folders, onSave }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial?.target ? String(initial.target) : "");
  const [saved, setSaved] = useState(initial?.saved ? String(initial.saved) : "0");
  const [icon, setIcon] = useState<IconRef>(initial?.icon ?? { kind: "emoji", value: "🎯" });
  const [color, setColor] = useState(initial?.color ?? PALETTES[0]);
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) ?? "");
  const [purchaseUrl, setPurchaseUrl] = useState(initial?.purchaseUrl ?? "");
  const [folderId, setFolderId] = useState<string>(initial?.folderId ?? defaultFolderId ?? "uncategorized");

  const flattenedFolders = useMemo(() => {
    const result: { id: string; name: string; level: number }[] = [];
    const roots = folders.filter((f) => !f.parentId).sort((a, b) => a.order - b.order);
    const traverse = (f: GoalFolder, level: number) => {
      result.push({ id: f.id, name: f.name, level });
      folders
        .filter((child) => child.parentId === f.id)
        .sort((a, b) => a.order - b.order)
        .forEach((child) => traverse(child, level + 1));
    };
    roots.forEach((r) => traverse(r, 0));
    return result;
  }, [folders]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = parseFloat(target);
        const s = parseFloat(saved) || 0;
        if (!t || !name.trim()) {
          toast.error("Completa nombre y monto");
          return;
        }
        onSave({
          name: name.trim(),
          target: t,
          saved: s,
          emoji: icon.kind === "emoji" ? icon.value : "🎯",
          color,
          deadline: deadline || undefined,
          icon,
          purchaseUrl: purchaseUrl.trim() || undefined,
          createdAt: initial?.createdAt,
          contributions: initial?.contributions,
          folderId: folderId === "uncategorized" ? undefined : folderId,
        });
      }}
      className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-3 lg:space-y-0"
    >
      <div className="lg:col-span-2 flex justify-center">
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      <div className="lg:col-span-2">
        <Label className="text-xs">Nombre</Label>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Vacaciones a Cancún"
          className="h-11 rounded-2xl"
        />
      </div>
      <div>
        <Label className="text-xs">Objetivo ($)</Label>
        <Input
          type="number"
          inputMode="decimal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="0.00"
          className="h-12 text-lg font-bold rounded-2xl"
        />
      </div>
      <div>
        <Label className="text-xs">Ya ahorrado ($)</Label>
        <Input
          type="number"
          inputMode="decimal"
          value={saved}
          onChange={(e) => setSaved(e.target.value)}
          placeholder="0"
          className="h-12 text-lg font-bold rounded-2xl"
        />
      </div>
      <div className="lg:col-span-2">
        <Label className="text-xs">Carpeta</Label>
        <Select value={folderId} onValueChange={setFolderId}>
          <SelectTrigger className="h-11 rounded-2xl bg-muted/50 border-0">
            <SelectValue placeholder="Sin carpeta">
              {folderId === "uncategorized" ? "Sin carpeta" : folders.find((f) => f.id === folderId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-2xl max-h-[40vh]">
            <SelectItem value="uncategorized">Sin carpeta</SelectItem>
            {flattenedFolders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                <span className="opacity-50 mr-1">
                  {Array(f.level).fill("\u00A0\u00A0\u00A0\u00A0").join("")}
                  {f.level > 0 ? "└ " : ""}
                </span>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Fecha límite (opcional)</Label>
        <Input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="h-11 rounded-2xl"
        />
      </div>
      <div>
        <Label className="text-xs flex items-center gap-1">
          <ExternalLink className="size-3" /> Link de compra (opcional)
        </Label>
        <Input
          type="url"
          value={purchaseUrl}
          onChange={(e) => setPurchaseUrl(e.target.value)}
          placeholder="https://..."
          className="h-11 rounded-2xl"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Toca el icono de la meta para abrirlo</p>
      </div>
      <div className="lg:col-span-2">
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-1">
          {PALETTES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setColor(p)}
              className={`flex-1 h-10 rounded-xl ${p} transition ${color === p ? "ring-4 ring-offset-2 ring-primary" : ""}`}
            />
          ))}
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold lg:col-span-2"
      >
        {initial ? "Guardar cambios" : "Crear meta"}
      </Button>
    </form>
  );
}
