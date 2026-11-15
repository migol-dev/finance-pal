import { useState } from "react";
import { ImageOff, Loader2, Maximize2, X } from "lucide-react";
import { useReceiptUrl } from "@/hooks/queries/useReceiptUrl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ReceiptPreviewProps {
  receipt?: string | null;
  className?: string;
  imgClassName?: string;
  onRemove?: () => void;
  compact?: boolean;
}

/**
 * Muestra la miniatura segura de un comprobante (`sb:receipts/...`, URL legada o data URL local)
 * resolviendo URLs firmadas frescas bajo demanda y permitiendo vista ampliada.
 */
export function ReceiptPreview({
  receipt,
  className,
  imgClassName,
  onRemove,
  compact = false,
}: ReceiptPreviewProps) {
  const { url, isLoading, isError } = useReceiptUrl(receipt);
  const [zoomOpen, setZoomOpen] = useState(false);

  if (!receipt) return null;

  if (isLoading) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
          compact ? "h-12" : "h-20",
          className
        )}
      >
        <Loader2 className="size-3.5 animate-spin text-primary shrink-0" strokeWidth={1.75} />
        <span>Cargando comprobante...</span>
      </div>
    );
  }

  if (isError || !url) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground",
          className
        )}
      >
        <ImageOff className="size-3.5 shrink-0" strokeWidth={1.75} />
        <span>Comprobante no disponible sin conexión</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar comprobante"
            className="ml-1 rounded-full p-0.5 hover:bg-muted text-foreground"
          >
            <X className="size-3" strokeWidth={1.75} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative inline-block group", className)}>
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Ampliar comprobante"
          className="block rounded-lg overflow-hidden border border-border/70 bg-muted/30 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <img
            src={url}
            alt="Comprobante adjunto"
            loading="lazy"
            decoding="async"
            className={cn(
              "rounded object-contain",
              compact ? "max-h-20" : "max-h-40",
              imgClassName
            )}
          />
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-md bg-background/80 p-1 text-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
            <Maximize2 className="size-3" strokeWidth={1.75} />
          </span>
        </button>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar comprobante"
            title="Quitar comprobante"
            className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background flex items-center justify-center shadow-sm hover:opacity-90 active:scale-95 transition"
          >
            <X className="size-3" strokeWidth={2} />
          </button>
        )}
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-2xl p-3 sm:p-4 rounded-2xl">
          <DialogTitle className="sr-only">Comprobante adjunto</DialogTitle>
          <img
            src={url}
            alt="Comprobante adjunto ampliado"
            className="w-full max-h-[75vh] object-contain rounded-lg bg-muted/20"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
