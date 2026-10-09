import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPicker } from "@/components/app/IconPicker";
import { GoalFolder, IconRef } from "@/lib/finance";
import { PALETTES } from "./types";

interface FolderFormProps {
  initial: GoalFolder | null;
  onSave: (f: Omit<GoalFolder, "id">) => void;
}

export function FolderForm({ initial, onSave }: FolderFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? PALETTES[0]);
  const [icon, setIcon] = useState<IconRef>(initial?.icon ?? { kind: "emoji", value: "📁" });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          toast.error("Completa el nombre");
          return;
        }
        const payload: Omit<GoalFolder, "id"> = {
          name: name.trim(),
          color,
          icon,
          order: initial?.order ?? 0,
          createdAt: initial?.createdAt ?? new Date().toISOString(),
        };
        if (initial?.parentId) payload.parentId = initial.parentId;
        onSave(payload);
      }}
      className="space-y-4"
    >
      <div className="flex justify-center">
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      <div>
        <Label className="text-xs">Nombre</Label>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Viajes, Proyectos..."
          className="h-11 rounded-2xl"
        />
      </div>
      <div>
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
        className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold"
      >
        {initial?.id ? "Guardar cambios" : "Crear carpeta"}
      </Button>
    </form>
  );
}
