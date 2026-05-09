import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  iconColor = "gradient-primary"
}: ElegantConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[32px] max-w-[90vw] w-[320px] p-6 border-0 bg-background shadow-2xl overflow-hidden">
        <div className="text-center space-y-4">
          {Icon && (
            <div className={cn("size-20 rounded-full mx-auto flex items-center justify-center shadow-lg", iconColor)}>
              <Icon className="size-10 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-black">{title}</h3>
            <div className="text-sm text-muted-foreground mt-1">{description}</div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => {
              onOpenChange(false);
              onCancel?.();
            }}>
              {cancelText}
            </Button>
            <Button className={cn("flex-1 h-12 rounded-2xl font-black text-white shadow-lg border-0", iconColor)}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}>
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
