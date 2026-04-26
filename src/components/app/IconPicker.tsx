import { useCallback, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { IconRef, COMMON_EMOJIS } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ImagePlus, Smile, Check, X } from "lucide-react";
import { IconDisplay } from "./IconDisplay";

interface Props {
  value?: IconRef;
  onChange: (i: IconRef) => void;
}

async function getCroppedDataUrl(src: string, area: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"emoji" | "image">("emoji");
  const [search, setSearch] = useState("");
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => { setImgSrc(reader.result as string); setTab("image"); };
    reader.readAsDataURL(f);
  };

  const saveImage = async () => {
    if (!imgSrc || !area) return;
    const data = await getCroppedDataUrl(imgSrc, area);
    onChange({ kind: "image", value: data });
    setOpen(false); setImgSrc(null); setZoom(1); setCrop({ x: 0, y: 0 });
  };

  const filtered = search ? COMMON_EMOJIS : COMMON_EMOJIS;
  const display: IconRef = value ?? { kind: "emoji", value: "✨" };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-3 group">
        <IconDisplay icon={display} size="lg" className="ring-2 ring-transparent group-hover:ring-primary/40 transition" />
        <span className="text-xs text-muted-foreground underline">Cambiar icono</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Elige un icono</DialogTitle></DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTab("emoji")} className={`h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition ${tab === "emoji" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}>
              <Smile className="size-4" /> Emoji
            </button>
            <button onClick={() => { setTab("image"); fileRef.current?.click(); }} className={`h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition ${tab === "image" ? "gradient-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"}`}>
              <ImagePlus className="size-4" /> Foto
            </button>
          </div>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          {tab === "emoji" && (
            <div className="space-y-3">
              <Input placeholder="Buscar (próximamente)..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-2xl" />
              <div className="grid grid-cols-8 gap-1.5 max-h-72 overflow-y-auto p-1">
                {filtered.map((e) => (
                  <button key={e} type="button" onClick={() => { onChange({ kind: "emoji", value: e }); setOpen(false); }}
                    className="aspect-square rounded-xl text-2xl bg-muted hover:bg-primary/10 transition active:scale-90">
                    {e}
                  </button>
                ))}
              </div>
              <div>
                <Label className="text-xs">O escribe uno propio</Label>
                <Input maxLength={4} placeholder="🚀" onChange={(e) => { const v = e.target.value.trim(); if (v) onChange({ kind: "emoji", value: v }); }} className="h-11 rounded-2xl text-center text-2xl" />
              </div>
            </div>
          )}

          {tab === "image" && (
            <div className="space-y-3">
              {!imgSrc ? (
                <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-40 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition">
                  <ImagePlus className="size-8" />
                  <span className="text-sm font-semibold">Elige una foto de tu galería</span>
                </button>
              ) : (
                <>
                  <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black">
                    <Cropper image={imgSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
                      onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
                  </div>
                  <div>
                    <Label className="text-xs">Zoom</Label>
                    <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-primary" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setImgSrc(null)} className="flex-1 h-11 rounded-2xl"><X className="size-4 mr-1" />Otra</Button>
                    <Button type="button" onClick={saveImage} className="flex-1 h-11 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold"><Check className="size-4 mr-1" />Usar</Button>
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
