import { memo, useState, useRef } from "react";
import { useFinance, ExportScopes, ALL_SCOPES, normalizeImportKeys } from "@/store/finance-store";
import { useFinanceData } from "@/hooks/useFinanceData";
import { AjustesHeader } from "../AjustesHeader";
import { SectionProps } from "../types";
import { Cloud, CloudOff, Download, Upload, Trash2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isSupabaseEnabled, setSyncEnabled } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { showUserError } from "@/lib/app-error";
import { audit } from "@/lib/audit-logger";
import { ElegantConfirm } from "@/components/app/ElegantConfirm";

const SCOPE_LABELS: { key: keyof Required<ExportScopes>; label: string; desc: string }[] = [
  { key: "accounts", label: "Cuentas", desc: "Bancos, efectivo y otros" },
  { key: "fixedItems", label: "Conceptos fijos", desc: "Ingresos, gastos, ahorros recurrentes" },
  { key: "transactions", label: "Movimientos", desc: "Todos los registros del día a día" },
  { key: "goals", label: "Metas", desc: "Incluye aportes, link y fecha" },
  { key: "debts", label: "Deudas", desc: "Personas, montos y abonos" },
  { key: "changeLog", label: "Historial", desc: "Bitácora de ediciones" },
  { key: "profile", label: "Perfil", desc: "Nombre, foto, moneda" },
  { key: "theme", label: "Apariencia", desc: "Tema claro u oscuro" },
];

function ScopePicker({
  available,
  onConfirm,
  confirmLabel,
  confirmIcon,
  destructive,
}: {
  available: Required<ExportScopes>;
  onConfirm: (scopes: ExportScopes) => void;
  confirmLabel: string;
  confirmIcon?: React.ReactNode;
  destructive?: boolean;
}) {
  const [scopes, setScopes] = useState<Required<ExportScopes>>(() => ({ ...available }));
  const allOn = Object.values(scopes).every(Boolean);
  const toggle = (k: keyof ExportScopes) => setScopes((s) => ({ ...s, [k]: !s[k] }));
  const setAll = (v: boolean) =>
    setScopes((s) => {
      const next = { ...s };
      SCOPE_LABELS.forEach(({ key }) => {
        if (available[key]) next[key] = v;
      });
      return next;
    });
  const someSelected = Object.entries(scopes).some(([k, v]) => v && (available as any)[k]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={() => setAll(!allOn)} className="text-[11px] font-bold text-primary">
          {allOn ? "Quitar todo" : "Seleccionar todo"}
        </button>
      </div>
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
        {SCOPE_LABELS.map(({ key, label, desc }) => {
          const enabled = available[key];
          const checked = !!scopes[key] && enabled;
          return (
            <label
              key={key}
              className={`flex items-start gap-3 rounded-2xl border p-3 transition cursor-pointer ${
                checked ? "border-primary bg-primary/5" : "border-border bg-card"
              } ${!enabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/40"}`}
            >
              <Checkbox checked={checked} disabled={!enabled} onCheckedChange={() => enabled && toggle(key)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-[11px] text-muted-foreground">{enabled ? desc : "No disponible en este archivo"}</p>
              </div>
            </label>
          );
        })}
      </div>
      <Button
        type="button"
        disabled={!someSelected}
        onClick={() => onConfirm(scopes)}
        className={`w-full h-12 rounded-2xl font-bold border-0 shadow-glow ${
          destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "gradient-primary text-primary-foreground"
        }`}
      >
        {confirmIcon}
        {confirmLabel}
      </Button>
    </div>
  );
}

function SyncAllButton({ syncAllToCloud, queryClient }: { syncAllToCloud: () => Promise<number>; queryClient: any }) {
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");
  const [syncedCount, setSyncedCount] = useState(0);

  const handleClick = async () => {
    if (state === "syncing") return;
    setState("syncing");
    try {
      const count = await syncAllToCloud();
      setSyncedCount(count);
      setState("done");
      queryClient.invalidateQueries();
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("idle");
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={state === "syncing"}
      className={`w-full rounded-2xl border p-4 flex items-center gap-3 transition-all duration-300 group ${
        state === "idle" ? "bg-card border-border hover:bg-primary/5 hover:border-primary/30" : ""
      } ${state === "syncing" ? "bg-primary/5 border-primary/30" : ""} ${
        state === "done" ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700" : ""
      }`}
    >
      <div
        className={`size-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
          state === "idle" ? "bg-primary/10 text-primary group-hover:bg-primary/20" : ""
        } ${state === "syncing" ? "bg-primary/20 text-primary" : ""} ${
          state === "done" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : ""
        }`}
      >
        {state === "idle" && <Cloud className="size-5 transition-transform duration-300 group-hover:scale-110" />}
        {state === "syncing" && (
          <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {state === "done" && <Check className="size-5" />}
      </div>
      <div className="flex-1 text-left">
        <p className="font-bold text-sm">
          {state === "idle" && "Sincronizar todo a la nube"}
          {state === "syncing" && "Sincronizando datos..."}
          {state === "done" && `${syncedCount} registros sincronizados`}
        </p>
        <p className="text-xs text-muted-foreground">
          {state === "idle" && "Sube todas tus cuentas, movimientos, metas y deudas"}
          {state === "syncing" && "Enviando cambios a Supabase..."}
          {state === "done" && "Datos en la nube actualizados"}
        </p>
      </div>
    </button>
  );
}

export const DatosSection = memo(function DatosSection({ onBack }: SectionProps) {
  const queryClient = useQueryClient();
  const { exportData, importData, syncAllToCloud } = useFinanceData();
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPayload, setPendingPayload] = useState<string | null>(null);
  const [pendingAvailable, setPendingAvailable] = useState<Required<ExportScopes>>(ALL_SCOPES);
  const [importConfirmScopes, setImportConfirmScopes] = useState<ExportScopes | null>(null);

  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const [orphanList, setOrphanList] = useState<string[] | null>(null);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [syncEnabled, setSyncEnabledState] = useState(isSupabaseEnabled);

  const downloadFallback = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo descargado");
  };

  const doExport = async (scopes: ExportScopes) => {
    const json = exportData(scopes);
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const filename = `finance-pal-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: filename,
          data: json,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "Exportación de datos - Finance Pal",
          text: "Copia de seguridad de Finance Pal",
          url: result.uri,
          dialogTitle: "Guardar respaldo",
        });
        toast.success("Respaldo listo para compartir");
      } catch (e: any) {
        toast.error(showUserError(e));
      }
      return;
    }

    const anyWin = window as any;
    if (typeof anyWin.showSaveFilePicker === "function") {
      const blob = new Blob([json], { type: "application/json" });
      try {
        const handle = await anyWin.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success("Datos guardados en la carpeta elegida");
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        toast.error("No se pudo guardar: " + (e?.message ?? "error"));
      }
      return;
    }

    downloadFallback(json, filename);
  };

  const handleImportFile = async (file: File) => {
    try {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (máx 20 MB)");
        return;
      }
      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        toast.error("El archivo no es un JSON válido");
        return;
      }
      const raw = parsed?.data ?? parsed ?? {};
      const data = (normalizeImportKeys(raw) ?? {}) as Record<string, any>;
      const available: Required<ExportScopes> = {
        fixedItems: Array.isArray(data.fixedItems) && data.fixedItems.length >= 0,
        transactions: Array.isArray(data.transactions) && data.transactions.length >= 0,
        accounts: Array.isArray(data.accounts) && data.accounts.length >= 0,
        goals: Array.isArray(data.goals) && data.goals.length >= 0,
        goalFolders: Array.isArray(data.goalFolders) && data.goalFolders.length >= 0,
        debts: Array.isArray(data.debts) && data.debts.length >= 0,
        changeLog: Array.isArray(data.changeLog),
        theme: data.theme === "dark" || data.theme === "light",
        profile: !!data.profile,
        excludePII: false,
        excludeBankDetails: false,
        excludeEmail: false,
        excludeReceipts: false,
      };
      setPendingFile(file);
      setPendingPayload(text);
      setPendingAvailable(available);
      setImportOpen(true);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo leer el archivo");
    }
  };

  const handleImportConfirm = async () => {
    if (!pendingPayload || !importConfirmScopes) return;
    const r = await importData(pendingPayload, importConfirmScopes);
    if (r.ok) {
      toast.success("Datos importados con éxito");
      r.warnings?.forEach((w) => toast(w));
      setImportOpen(false);
      setPendingPayload(null);
      setPendingFile(null);
      setImportConfirmScopes(null);
    } else {
      toast.error("Error al importar datos");
    }
  };

  return (
    <div className="space-y-6">
      <AjustesHeader
        title="Nube y Respaldos"
        description="Sincroniza tus finanzas con Supabase, exporta copias de seguridad o gestiona comprobantes"
        icon={Cloud}
        iconColorClass="bg-cyan-500/10 text-cyan-500"
        onBack={onBack}
      />

      {/* Cloud Sync Status */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-4">
        <h3 className="font-bold text-sm text-foreground">Sincronización en la nube</h3>

        <button
          type="button"
          onClick={() => {
            const next = !syncEnabled;
            setSyncEnabledState(next);
            setSyncEnabled(next);
            toast.success(next ? "Sincronización con la nube activada" : "Sincronización desactivada");
            if (session?.user?.id) audit.syncToggled(session.user.id, next);
          }}
          className={`flex items-center gap-3 w-full rounded-2xl border p-4 transition text-left ${
            syncEnabled ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/30"
          }`}
        >
          <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${syncEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {syncEnabled ? <Cloud className="size-5" /> : <CloudOff className="size-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">{syncEnabled ? "Nube activada" : "Modo local exclusivo"}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {syncEnabled ? "Tus cambios se envían a Supabase de forma segura" : "Tus datos solo residen en este dispositivo"}
            </p>
          </div>
        </button>

        {isSupabaseEnabled && (
          <SyncAllButton syncAllToCloud={syncAllToCloud} queryClient={queryClient} />
        )}
      </div>

      {/* Export / Import Data */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-4">
        <h3 className="font-bold text-sm text-foreground">Copias de seguridad</h3>
        <p className="text-xs text-muted-foreground">Exporta un archivo JSON con tus registros o restaura un respaldo previo</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Button
            onClick={() => setExportOpen(true)}
            variant="outline"
            className="rounded-2xl h-12 font-bold flex items-center justify-center gap-2"
          >
            <Download className="size-4.5 text-primary" />
            <span>Exportar respaldo</span>
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="rounded-2xl h-12 font-bold flex items-center justify-center gap-2"
          >
            <Upload className="size-4.5 text-primary" />
            <span>Importar respaldo</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Receipt Cleaner */}
      <div className="rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-foreground">Comprobantes y Recibos</h3>
            <p className="text-xs text-muted-foreground">Busca y elimina imágenes huérfanas que no estén asignadas a ningún movimiento</p>
          </div>
          <Button
            onClick={async () => {
              setReceiptsOpen(true);
              setReceiptsLoading(true);
              try {
                const r = await useFinance.getState().cleanupOrphanReceipts(false);
                setOrphanList(r?.orphans ?? []);
              } catch {
                setOrphanList([]);
              }
              setReceiptsLoading(false);
            }}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs h-9"
          >
            <Trash2 className="size-3.5 mr-1.5" /> Limpiar recibos
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>¿Qué deseas exportar?</DialogTitle>
            <DialogDescription className="sr-only">Selecciona las secciones para el archivo de respaldo</DialogDescription>
          </DialogHeader>
          <ScopePicker
            available={ALL_SCOPES}
            onConfirm={(sc) => {
              doExport(sc);
              setExportOpen(false);
            }}
            confirmLabel="Descargar respaldo"
            confirmIcon={<Download className="size-4 mr-1.5" />}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>¿Qué deseas importar?</DialogTitle>
            <DialogDescription className="sr-only">Selecciona las secciones a importar desde el archivo</DialogDescription>
          </DialogHeader>
          {pendingFile && (
            <p className="text-xs text-muted-foreground -mt-1">
              Archivo: <span className="font-bold text-foreground">{pendingFile.name}</span>
            </p>
          )}
          <ScopePicker
            available={pendingAvailable}
            onConfirm={(sc) => setImportConfirmScopes(sc)}
            confirmLabel="Confirmar importación"
            confirmIcon={<Upload className="size-4 mr-1.5" />}
            destructive
          />
        </DialogContent>
      </Dialog>

      <Dialog open={receiptsOpen} onOpenChange={setReceiptsOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader><DialogTitle>Limpieza de recibos</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {receiptsLoading && <p className="text-sm text-muted-foreground">Analizando almacenamiento local...</p>}
            {!receiptsLoading && orphanList && orphanList.length === 0 && (
              <p className="text-sm text-muted-foreground">No se encontraron comprobantes huérfanos. Todo está limpio.</p>
            )}
            {!receiptsLoading && orphanList && orphanList.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Se encontraron {orphanList.length} imágenes huérfanas sin movimiento asociado.</p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      setReceiptsLoading(true);
                      await useFinance.getState().cleanupOrphanReceipts(true);
                      setOrphanList([]);
                      setReceiptsLoading(false);
                      toast.success("Recibos huérfanos eliminados");
                    }}
                    className="rounded-xl text-xs"
                  >
                    Eliminar todos
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ElegantConfirm
        open={!!importConfirmScopes}
        onOpenChange={(v) => !v && setImportConfirmScopes(null)}
        title="¿Confirmar reemplazo de datos?"
        description="Esta acción reemplazará los datos seleccionados con los del archivo de respaldo. ¿Deseas continuar?"
        onConfirm={handleImportConfirm}
        icon={Upload}
        iconColor="gradient-primary"
      />
    </div>
  );
});

export default DatosSection;
