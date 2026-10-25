import { memo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import {
  DEFAULT_CATEGORY_EMOJI,
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
  COMMON_EMOJIS,
  CustomCategory,
} from "@/lib/finance";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { Plus, Tag, Pencil, Trash2, Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

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
  const [emoji, setEmoji] = useState("🏷️");
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<CustomCategory | null>(null);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName("");
    setEmoji("🏷️");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: CustomCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setEmoji(cat.emoji || "🏷️");
    setIsDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, MAX_CUSTOM_CATEGORY_NAME_LENGTH);
    if (!trimmed) {
      toast.error("Por favor ingresa un nombre para la categoría");
      return;
    }
    const cleanEmoji = emoji.trim() || "🏷️";

    if (editingCategory) {
      updateCustomCategory(editingCategory.id, { name: trimmed, emoji: cleanEmoji });
      toast.success("Categoría actualizada");
    } else {
      const created = addCustomCategory({ name: trimmed, emoji: cleanEmoji });
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

  const defaultCategoryEntries = Object.entries(DEFAULT_CATEGORY_EMOJI);

  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Categorías"
        subtitle="Administra las categorías de tus movimientos o crea las tuyas propias"
        onBack={onBack}
        action={
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-3.5 bg-primary text-primary-foreground shadow-sm active:scale-[0.98]"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            <span>Nueva categoría</span>
          </Button>
        }
      />

      {/* Bloque: Categorías Personalizadas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display-v2 text-base font-semibold text-foreground">
              Tus Categorías Personalizadas
            </h3>
            <span className="text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {customCategories.length}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono-tabular">
            Máx. {MAX_CUSTOM_CATEGORY_NAME_LENGTH} caracteres por nombre
          </span>
        </div>

        {customCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E4E0D8] dark:border-white/10 p-6 sm:p-8 text-center bg-card">
            <div className="size-11 mx-auto rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2.5">
              <Tag className="size-5" strokeWidth={1.5} />
            </div>
            <h4 className="font-semibold text-sm text-foreground">Sin categorías personalizadas</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
              Crea categorías a tu medida para identificar tus gastos o ingresos específicos con su propio emoji.
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
            {customCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[#E4E0D8] dark:border-white/10 bg-white dark:bg-[#141413] shadow-xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-xl shrink-0 select-none">{cat.emoji || "🏷️"}</span>
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
            ))}
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
          {defaultCategoryEntries.map(([catName, catEmoji]) => (
            <div
              key={catName}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E4E0D8]/60 dark:border-white/5 bg-white/50 dark:bg-[#141413]/50 text-xs"
            >
              <span className="text-base select-none shrink-0">{catEmoji}</span>
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
              Personaliza el nombre y emoji para organizar tus finanzas a tu manera.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* Selección de Emoji */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Emoji identificador</Label>
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-3xl select-none shrink-0 shadow-inner">
                  {emoji || "🏷️"}
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                    placeholder="Escribe o pega un emoji"
                    className="h-10 text-sm bg-background border-border"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    O elige uno rápido de la lista inferior:
                  </p>
                </div>
              </div>

              {/* Selector Rápido de Emojis */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {COMMON_EMOJIS.slice(0, 16).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`size-8 rounded-lg text-lg flex items-center justify-center transition hover:scale-110 shrink-0 ${
                      emoji === em
                        ? "bg-primary/20 ring-1 ring-primary"
                        : "bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    {em}
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
        title="¿Eliminar categoría personalizada?"
        description={`La categoría "${deleteConfirmCat?.name}" será eliminada de tus opciones. Los movimientos existentes que ya la utilicen conservarán su registro.`}
        confirmText="Eliminar categoría"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmCat(null)}
      />
    </div>
  );
});
