import { memo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useFinance } from "@/store/finance-store";
import { isEncryptionAvailable } from "@/lib/encrypted-storage";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { ShieldCheck, RotateCcw, AlertTriangle, Lock, Cpu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

export const SeguridadSection = memo(function SeguridadSection({ onBack }: SectionProps) {
  const { resetAll } = useFinanceData();
  const changeLog = useFinance((s) => s.changeLog);
  const [resetConfirm, setResetConfirm] = useState(false);

  const encryptionStatus = isEncryptionAvailable();

  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Seguridad y Sistema"
        description="Diagnóstico del sistema, cifrado en reposo y restablecimiento de datos"
        icon={ShieldCheck}
        iconColorClass="bg-orange-500/10 text-orange-500"
        onBack={onBack}
      />

      {/* System Diagnostics */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-4">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
          <Cpu className="size-4 text-primary" /> Diagnóstico del sistema
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Lock className="size-3.5 text-primary" />
              <span>Cifrado local (AES-GCM)</span>
            </div>
            <p className="text-sm font-bold text-foreground mt-1">
              {encryptionStatus ? "Activo y protegido" : "No disponible"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Derivación de clave mediante PBKDF2
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              <span>Bitácora de auditoría</span>
            </div>
            <p className="text-sm font-bold text-foreground mt-1">
              {changeLog.length} eventos registrados
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Control de cambios y operaciones locales
            </p>
          </div>
        </div>
      </div>

      {/* Version Card */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-2">
        <h3 className="font-bold text-sm text-foreground">Información de la aplicación</h3>
        <p className="text-xs text-muted-foreground">
          Finance Pal es una aplicación de finanzas personales diseñada con arquitectura local-first, cifrado de datos y accesibilidad universal.
        </p>
        <div className="pt-2">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold">
            Versión actual: v1.19.38
          </span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-4 sm:p-5 shadow-soft space-y-3">
        <div className="flex items-center gap-2 text-destructive font-bold text-sm">
          <AlertTriangle className="size-4" /> Zona de peligro
        </div>
        <p className="text-xs text-muted-foreground">
          Restablecer la aplicación eliminará todos los movimientos, metas, deudas, cuentas y configuraciones almacenadas localmente. Esta acción no se puede deshacer.
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setResetConfirm(true)}
          className="rounded-xl h-11 text-xs font-bold w-full sm:w-auto"
        >
          <RotateCcw className="size-4 mr-2" /> Restablecer todos los datos locales
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <ElegantConfirm
        open={resetConfirm}
        onOpenChange={setResetConfirm}
        title="¿Restablecer todos los datos?"
        description="Se borrarán permanentemente todas tus cuentas, movimientos, metas, deudas y configuraciones de este dispositivo. Esta operación es irreversible."
        onConfirm={() => {
          resetAll();
          setResetConfirm(false);
          toast.success("Todos los datos locales han sido restablecidos");
          onBack();
        }}
        icon={RotateCcw}
        iconColor="bg-destructive"
        confirmText="Sí, borrar todo definitivamente"
      />
    </div>
  );
});

export default SeguridadSection;
