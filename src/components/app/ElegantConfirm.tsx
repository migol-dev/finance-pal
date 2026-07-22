import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ElegantConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export function ElegantConfirm({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  icon: Icon,
  iconColor = "bg-primary"
}: ElegantConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-[90vw] w-[320px] p-6 border border-border bg-card shadow-2xl overflow-hidden">
        <div className="text-center space-y-4">
          {Icon && (
            <div className={cn("size-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg", iconColor)}>
              <Icon className="size-8 text-white" />
            </div>
          )}
          <div>
            <DialogTitle className="text-lg font-extrabold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">{description}</DialogDescription>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold" onClick={() => {
              onOpenChange(false);
              onCancel?.();
            }}>
              {cancelText}
            </Button>
            <Button
              className={cn("flex-1 h-11 rounded-xl font-bold text-white shadow-md border-0", iconColor === "gradient-primary" ? "gradient-primary" : iconColor)}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
