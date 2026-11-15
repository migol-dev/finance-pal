import { memo, useMemo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  DEFAULT_CATEGORY_ICON,
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
  CustomCategory,
} from "@/lib/finance";
import {
  ICON_GROUPS,
  ICON_LABELS,
  resolveIconId,
  type AppIconId,
} from "@/lib/icon-ids";
import { AppIcon } from "@/components/icons/AppIcon";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { Plus, Tag, Pencil, Trash2, Check, Sparkles, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";
import { cn } from "@/lib/utils";

export const CategoriasSection = memo(function CategoriasSection({ onBack }: SectionProps) {
  const {
    customCategories = [],
    addCustomCategory,
    updateCustomCategory,
    removeCustomCategory,
  } = useFinanceData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<AppIconId>("tag");
  const [iconQuery, setIconQuery] = useState("");
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<CustomCategory | null>(null);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName("");
    setSelectedIcon("tag");
    setIconQuery("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: CustomCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSelectedIcon(cat.icon ?? resolveIconId(cat.emoji, "tag"));
    setIconQuery("");
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, MAX_CUSTOM_CATEGORY_NAME_LENGTH);
    if (!trimmed) {
      toast.error("Por favor ingresa un nombre para la categoría");
      return;
    }

    if (editingCategory) {
      updateCustomCategory(editingCategory.id, {
        name: trimmed,
        icon: selectedIcon,
      });
      toast.success("Categoría actualizada");
    } else {
      const created = addCustomCategory({
        name: trimmed,
        emoji: "",
        icon: selectedIcon,
      });
      if (created) {
        toast.success(`Categoría "${trimmed}" creada con éxito`);
      }
    }

    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteConfirmCat) return;
    removeCustomCategory(deleteConfirmCat.id);
    toast.success("Categoría eliminada");
    setDeleteConfirmCat(null);
  };

  const defaultCategoryEntries = Object.entries(DEFAULT_CATEGORY_ICON);

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    const all = ICON_GROUPS.flatMap((g) => g.ids);
    if (!q) return all;
    return all.filter((id) => {
      const lbl = (ICON_LABELS[id] ?? id).toLowerCase();
      return lbl.includes(q) || id.includes(q);
    });
  }, [iconQuery]);

  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Categorías"
        description="Administra las categorías de tus movimientos o crea las tuyas propias"
        icon={Tag}
        onBack={onBack}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display-v2 text-base font-semibold text-foreground">
            Tus Categorías Personalizadas
          </h3>
          <span className="text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {customCategories.length}
          </span>
        </div>
        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="rounded-xl text-xs font-semibold gap-1.5 h-9 px-3.5 bg-primary text-primary-foreground shadow-sm active:scale-[0.98]"
        >
          <Plus className="size-3.5" strokeWidth={2} />
          <span>Nueva categoría</span>
        </Button>
      </div>

      {/* Bloque: Categorías Personalizadas */}
      <div className="space-y-2">
        <span className="text-[11px] text-muted-foreground font-mono-tabular block px-1">
          Máx. {MAX_CUSTOM_CATEGORY_NAME_LENGTH} caracteres por nombre
        </span>

        {customCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 sm:p-8 text-center bg-card">
            <div className="size-11 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Tag className="size-5" strokeWidth={1.5} />
            </div>
            <h4 className="font-semibold text-sm text-foreground">Sin categorías personalizadas</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
              Crea categorías a tu medida para identificar tus gastos o ingresos específicos con su propio icono.
            </p>
            <Button
              onClick={handleOpenCreate}
              size="sm"
              variant="outline"
              className="text-xs rounded-xl gap-1.5 h-9"
            >
              <Plus className="size-3.5" strokeWidth={2} />
              <span>Crear mi primera categoría</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {customCategories.map((cat) => {
              const iconId = cat.icon ?? resolveIconId(cat.emoji, "tag");
              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <AppIcon name={iconId} className="size-4" />
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      title="Editar categoría"
                      aria-label={`Editar categoría ${cat.name}`}
                    >
                      <Pencil className="size-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmCat(cat)}
                      className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                      title="Eliminar categoría"
                      aria-label={`Eliminar categoría ${cat.name}`}
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bloque: Categorías Generales Predeterminadas */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display-v2 text-base font-semibold text-foreground">
              Categorías Generales del Sistema
            </h3>
            <span className="text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
              {defaultCategoryEntries.length}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono-tabular">
            Predeterminadas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-sans">
          {defaultCategoryEntries.map(([catName, iconId]) => (
            <div
              key={catName}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-card/60 text-xs"
            >
              <span className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <AppIcon name={iconId} className="size-3.5" />
              </span>
              <span className="text-muted-foreground truncate font-medium">{catName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Diálogo Crear / Editar Categoría */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-card border-border">
          <DialogHeader className="text-left pb-2">
            <DialogTitle className="font-display-v2 text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-4.5 text-primary" />
              <span>{editingCategory ? "Editar categoría" : "Nueva categoría"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Personaliza el nombre y el icono SVG para organizar tus finanzas a tu manera.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* Selección de Icono SVG */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Icono identificador</Label>
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/25 flex items-center justify-center shrink-0">
                  <AppIcon name={selectedIcon} className="size-6" />
                </div>
                <div className="relative flex-1">
                  <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    value={iconQuery}
                    onChange={(e) => setIconQuery(e.target.value)}
                    placeholder="Filtrar iconos..."
                    className="h-10 pl-8 text-xs bg-background border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto p-1 rounded-xl border border-border/60 bg-muted/20">
                {filteredIcons.map((iconId) => (
                  <button
                    key={iconId}
                    type="button"
                    aria-label={ICON_LABELS[iconId] ?? iconId}
                    title={ICON_LABELS[iconId] ?? iconId}
                    onClick={() => setSelectedIcon(iconId)}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center transition hover:scale-105",
                      selectedIcon === iconId
                        ? "bg-primary/15 text-primary ring-1 ring-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <AppIcon name={iconId} className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre de la Categoría */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-name-input" className="text-xs font-semibold">
                  Nombre de la categoría
                </Label>
                <span
                  className={`text-[11px] font-mono-tabular ${
                    name.length >= MAX_CUSTOM_CATEGORY_NAME_LENGTH
                      ? "text-destructive font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {name.length}/{MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                </span>
              </div>
              <Input
                id="cat-name-input"
                type="text"
                autoFocus
                required
                maxLength={MAX_CUSTOM_CATEGORY_NAME_LENGTH}
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_CUSTOM_CATEGORY_NAME_LENGTH))}
                placeholder="Ej. Gimnasio, Mascotas, Cursos"
                className="h-10 text-sm bg-background border-border"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                El límite de {MAX_CUSTOM_CATEGORY_NAME_LENGTH} caracteres garantiza que el texto se vea siempre completo en teléfonos y tablas.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs rounded-xl h-10 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs font-semibold rounded-xl h-10 px-4 bg-primary text-primary-foreground gap-1.5 shadow-sm active:scale-[0.98]"
              >
                <Check className="size-3.5" strokeWidth={2} />
                <span>{editingCategory ? "Guardar cambios" : "Crear categoría"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <ElegantConfirm
        open={Boolean(deleteConfirmCat)}
        onOpenChange={(v) => !v && setDeleteConfirmCat(null)}
        title="¿Eliminar categoría personalizada?"
        description={`La categoría "${deleteConfirmCat?.name}" será eliminada de tus opciones. Los movimientos existentes que ya la utilicen conservarán su registro.`}
        confirmText="Eliminar categoría"
        icon={Trash2}
        iconColor="bg-destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmCat(null)}
      />
    </div>
  );
});
