import { useCallback, useMemo, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedThumbnail } from "@/lib/thumbnail";
import type { IconRef } from "@/lib/finance";
import {
  ICON_GROUPS,
  ICON_LABELS,
  resolveIconId,
  type AppIconId,
} from "@/lib/icon-ids";
import { AppIcon } from "@/components/icons/AppIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ImagePlus, Sparkles, Check, X, Search } from "lucide-react";
import { IconDisplay } from "./IconDisplay";
import { cn } from "@/lib/utils";

interface Props {
  value?: IconRef;
  onChange: (i: IconRef) => void;
}

export function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"icon" | "image">("icon");
  const [search, setSearch] = useState("");
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
      setTab("image");
    };
    reader.readAsDataURL(f);
  };

  const saveImage = async () => {
    if (!imgSrc || !area) return;
    try {
      const data = await getCroppedThumbnail(imgSrc, area);
      onChange({ kind: "image", value: data });
      setOpen(false);
      setImgSrc(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ICON_GROUPS;
    return ICON_GROUPS.map((group) => ({
      ...group,
      ids: group.ids.filter((id) => {
        const label = (ICON_LABELS[id] ?? id).toLowerCase();
        return label.includes(q) || id.includes(q);
      }),
    })).filter((group) => group.ids.length > 0);
  }, [search]);

  const activeIconId: AppIconId | null = useMemo(() => {
    if (!value || value.kind === "image") return null;
    return resolveIconId(value.value, "sparkles");
  }, [value]);

  const display: IconRef = value ?? { kind: "icon", value: "sparkles" };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-3 group">
        <IconDisplay
          icon={display}
          size="lg"
          className="ring-2 ring-transparent group-hover:ring-primary/40 transition"
        />
        <span className="text-xs text-muted-foreground underline">Cambiar icono</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="rounded-3xl max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Elige un icono</DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            Selecciona un icono vectorial adaptable al tema o sube una imagen
          </DialogDescription>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTab("icon")}
              className={cn(
                "h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition",
                tab === "icon"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="size-4" strokeWidth={1.75} /> Iconos
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("image");
                fileRef.current?.click();
              }}
              className={cn(
                "h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition",
                tab === "image"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <ImagePlus className="size-4" strokeWidth={1.75} /> Foto
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />

          {tab === "icon" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar icono (ej. casa, café, banco)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9 rounded-2xl text-sm"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {filteredGroups.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Sin coincidencias para "{search}"
                  </p>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.label} className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
                        {group.ids.map((id) => {
                          const isSelected = activeIconId === id;
                          const label = ICON_LABELS[id] ?? id;
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-label={label}
                              title={label}
                              onClick={() => {
                                onChange({ kind: "icon", value: id });
                                setOpen(false);
                              }}
                              className={cn(
                                "aspect-square rounded-xl flex items-center justify-center transition active:scale-90",
                                isSelected
                                  ? "bg-primary/15 text-primary ring-2 ring-primary"
                                  : "bg-muted/70 text-foreground hover:bg-primary/10 hover:text-primary"
                              )}
                            >
                              <AppIcon name={id} className="size-5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === "image" && (
            <div className="space-y-3">
              {!imgSrc ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition"
                >
                  <ImagePlus className="size-8" />
                  <span className="text-sm font-semibold">Elige una foto de tu galería</span>
                </button>
              ) : (
                <>
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black">
                    <Cropper
                      image={imgSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Zoom</Label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setImgSrc(null)}
                      className="flex-1 h-11 rounded-2xl"
                    >
                      <X className="size-4 mr-1" />
                      Otra
                    </Button>
                    <Button
                      type="button"
                      onClick={saveImage}
                      className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground font-bold"
                    >
                      <Check className="size-4 mr-1" />
                      Usar
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
