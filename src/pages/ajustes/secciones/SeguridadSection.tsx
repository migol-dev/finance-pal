import { memo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useFinance } from "@/store/finance-store";
import { isEncryptionAvailable } from "@/lib/encrypted-storage";
import { formatApkSize, getCurrentVersion } from "@/lib/version-check";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { cn } from "@/lib/utils";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import {
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Lock,
  Cpu,
  Sparkles,
  RefreshCw,
  Download,
  ChevronDown,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

export const SeguridadSection = memo(function SeguridadSection({ onBack }: SectionProps) {
  const { resetAll } = useFinanceData();
  const changeLog = useFinance((s) => s.changeLog);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const {
    isNativeAndroid,
    currentVersion,
    updateInfo,
    checking,
    downloading,
    error,
    lastCheckedAt,
    checkManual,
    downloadUpdate,
  } = useAppUpdate();

  const encryptionStatus = isEncryptionAvailable();
  const displayVersion = currentVersion || getCurrentVersion();
  const hasUpdate = Boolean(isNativeAndroid && updateInfo?.hasUpdate);
  const apkSizeLabel = updateInfo ? formatApkSize(updateInfo.apkSizeBytes) : null;
  const hasChecked = Boolean(updateInfo || lastCheckedAt !== null);

  let androidStatusText = "Verifica si hay una nueva versión en GitHub";
  if (checking) {
    androidStatusText = "Comprobando actualizaciones...";
  } else if (error) {
    androidStatusText = error;
  } else if (hasUpdate) {
    androidStatusText = "Actualización disponible";
  } else if (hasChecked) {
    androidStatusText = "Estás en la última versión";
  }

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

      {/* Version & Updates */}
      <section
        aria-labelledby="seguridad-version-heading"
        className="rounded-xl bg-card border border-border divide-y divide-border/70"
      >
        <div className="p-4 sm:p-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="seguridad-version-heading"
              className="font-bold text-sm text-foreground tracking-tight"
            >
              Versión y Actualizaciones
            </h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/70 border border-border/70 text-xs font-mono-tabular font-semibold text-foreground">
              Versión actual: v{displayVersion}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Finance Pal es una aplicación de finanzas personales diseñada con arquitectura local-first, cifrado de datos y accesibilidad universal.
          </p>
        </div>

        {isNativeAndroid && (
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              {error ? (
                <AlertCircle
                  className="size-4 text-destructive shrink-0 mt-0.5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : hasUpdate ? (
                <Download
                  className="size-4 text-primary shrink-0 mt-0.5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2
                  className={cn(
                    "size-4 shrink-0 mt-0.5",
                    !checking && hasChecked ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 space-y-0.5">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    error ? "text-destructive" : "text-foreground"
                  )}
                >
                  {androidStatusText}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono-tabular">
                  Instalada: v{displayVersion}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={checking}
              onClick={() => void checkManual()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background/80 hover:bg-muted/70 px-3.5 py-2 text-xs font-semibold text-foreground min-h-[44px] tactile-press disabled:opacity-50 disabled:pointer-events-none transition-colors shrink-0"
            >
              <RefreshCw
                className={cn("size-4 shrink-0", checking && "animate-spin")}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Buscar actualización</span>
            </button>
          </div>
        )}

        {hasUpdate && updateInfo && (
          <div className="p-4 sm:p-5 space-y-3 bg-primary/[0.03]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-mono-tabular font-bold">
                  v{updateInfo.latest}
                </span>
                {apkSizeLabel && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted border border-border/70 text-[11px] font-mono-tabular font-medium text-muted-foreground">
                    {apkSizeLabel}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {updateInfo.apkDownloadUrl
                  ? "Paquete directo financemate.apk"
                  : "Disponible en GitHub Releases"}
              </span>
            </div>

            {updateInfo.releaseNotes && (
              <div className="space-y-2">
                <button
                  type="button"
                  aria-expanded={notesOpen}
                  onClick={() => setNotesOpen((prev) => !prev)}
                  className="inline-flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-[44px] tactile-press transition-colors"
                >
                  <span>Ver novedades</span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-200",
                      notesOpen && "rotate-180"
                    )}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </button>
                {notesOpen && (
                  <div className="rounded-lg bg-muted/50 border border-border/60 p-3 text-xs text-muted-foreground whitespace-pre-line max-h-40 overflow-y-auto leading-relaxed">
                    {updateInfo.releaseNotes}
                  </div>
                )}
              </div>
            )}

            <div>
              <button
                type="button"
                disabled={downloading}
                onClick={() => void downloadUpdate(updateInfo)}
                aria-label="Descargar financemate.apk"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg min-h-[44px] text-xs font-semibold tactile-press hover:opacity-95 disabled:opacity-60 disabled:pointer-events-none transition-opacity"
              >
                {downloading ? (
                  <Loader2
                    className="size-4 animate-spin shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                ) : (
                  <Download
                    className="size-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )}
                <span>
                  {downloading ? "Iniciando descarga..." : "Descargar financemate.apk"}
                </span>
              </button>
            </div>
          </div>
        )}
      </section>

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
