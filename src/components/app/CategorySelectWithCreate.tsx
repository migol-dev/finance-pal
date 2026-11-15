import { useState, useMemo, memo } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  getCategoriesIconMap,
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
} from "@/lib/finance";
import {
  ICON_GROUPS,
  ICON_LABELS,
  type AppIconId,
} from "@/lib/icon-ids";
import { AppIcon } from "@/components/icons/AppIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CategorySelectWithCreateProps {
  value: string;
  onChange: (category: string) => void;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

const QUICK_CATEGORY_ICONS: AppIconId[] = [
  "tag",
  "cart",
  "coffee",
  "car",
  "home",
  "dumbbell",
  "heart_pulse",
  "book",
  "gamepad",
  "paw",
  "plane",
  "sparkles",
];

export const CategorySelectWithCreate = memo(function CategorySelectWithCreate({
  value,
  onChange,
  className,
  triggerClassName,
  disabled,
}: CategorySelectWithCreateProps) {
  const { customCategories = [], addCustomCategory } = useFinanceData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState<AppIconId>("tag");

  const categoriesIconMap = useMemo(
    () => getCategoriesIconMap(customCategories),
    [customCategories]
  );

  const handleSelectChange = (val: string) => {
    if (val === "__create_new__") {
      setNewCatName("");
      setNewCatIcon("tag");
      setIsModalOpen(true);
      return;
    }
    onChange(val);
  };

  const handleCreateAndSelect = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim().slice(0, MAX_CUSTOM_CATEGORY_NAME_LENGTH);
    if (!trimmed) {
      toast.error("Ingresa un nombre para la categoría");
      return;
    }
    const created = addCustomCategory({ name: trimmed, emoji: "", icon: newCatIcon });
    if (created) {
      onChange(created.name);
      toast.success(`Categoría "${created.name}" creada y seleccionada`);
    }
    setIsModalOpen(false);
  };

  const currentIcon: AppIconId = categoriesIconMap[value] ?? "tag";

  return (
    <div className={cn("relative w-full", className)}>
      <Select value={value} onValueChange={handleSelectChange} disabled={disabled}>
        <SelectTrigger
          className={cn("h-10 text-xs bg-background/50 border-border", triggerClassName)}
        >
          <SelectValue placeholder="Selecciona categoría">
            <span className="flex items-center gap-1.5 truncate">
              <AppIcon name={currentIcon} className="size-3.5 text-primary shrink-0" />
              <span className="truncate">{value || "Selecciona categoría"}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {Object.entries(categoriesIconMap).map(([catName, iconId]) => (
            <SelectItem key={catName} value={catName} className="text-xs">
              <span className="flex items-center gap-2">
                <AppIcon name={iconId} className="size-3.5 text-muted-foreground shrink-0" />
                <span>{catName}</span>
              </span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem
            value="__create_new__"
            className="text-xs font-semibold text-primary focus:bg-primary/10 focus:text-primary cursor-pointer"
          >
            <span className="flex items-center gap-1.5 py-0.5">
              <Plus className="size-3.5" strokeWidth={2.5} />
              <span>Crear nueva categoría...</span>
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Modal Rápido de Creación de Categoría */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-sm p-5 rounded-2xl bg-card border-border">
          <DialogHeader className="text-left pb-1">
            <DialogTitle className="font-display-v2 text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span>Crear nueva categoría</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Se guardará en tus categorías y se seleccionará al instante en este movimiento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAndSelect} className="space-y-3.5 pt-2">
            {/* Selector de icono SVG */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                Icono
              </Label>
              <div className="flex items-center gap-2.5">
                <div className="size-11 rounded-xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center shrink-0">
                  <AppIcon name={newCatIcon} className="size-5" />
                </div>
                <div className="flex-1 grid grid-cols-6 gap-1">
                  {QUICK_CATEGORY_ICONS.map((iconId) => (
                    <button
                      key={iconId}
                      type="button"
                      aria-label={ICON_LABELS[iconId] ?? iconId}
                      title={ICON_LABELS[iconId] ?? iconId}
                      onClick={() => setNewCatIcon(iconId)}
                      className={cn(
                        "size-8 rounded-lg flex items-center justify-center transition hover:scale-105",
                        newCatIcon === iconId
                          ? "bg-primary/15 text-primary ring-1 ring-primary"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <AppIcon name={iconId} className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
              <details className="text-[11px]">
                <summary className="cursor-pointer text-primary font-medium select-none py-0.5">
                  Ver todos los iconos
                </summary>
                <div className="mt-1.5 max-h-32 overflow-y-auto grid grid-cols-7 gap-1 p-1 rounded-xl bg-muted/30 border border-border/60">
                  {ICON_GROUPS.flatMap((g) => g.ids).map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-label={ICON_LABELS[id] ?? id}
                      title={ICON_LABELS[id] ?? id}
                      onClick={() => setNewCatIcon(id)}
                      className={cn(
                        "aspect-square rounded-lg flex items-center justify-center transition",
                        newCatIcon === id
                          ? "bg-primary/15 text-primary ring-1 ring-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <AppIcon name={id} className="size-4" />
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {/* Nombre con límite de 20 caracteres */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="quick-cat-name"
                  className="text-[11px] font-semibold text-muted-foreground uppercase"
                >
                  Nombre
                </Label>
                <span
                  className={`text-[10px] font-mono-tabular ${
                    newCatName.length >= MAX_CUSTOM_CATEGORY_NAME_LENGTH
                      ? "text-destructive font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {newCatName.length}/{MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                </span>
              </div>
              <Input
                id="quick-cat-name"
                type="text"
                autoFocus
                required
                maxLength={MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                value={newCatName}
                onChange={(e) =>
                  setNewCatName(e.target.value.slice(0, MAX_CUSTOM_CATEGORY_NAME_LENGTH))
                }
                placeholder="Ej. Gimnasio, Mascotas"
                className="h-10 text-xs bg-background border-border"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs rounded-xl h-9 px-3"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs font-semibold rounded-xl h-9 px-3.5 bg-primary text-primary-foreground gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <Check className="size-3.5" strokeWidth={2} />
                <span>Crear y usar</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
});
