import { memo, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Bot,
  Check,
  Copy,
  Eye,
  Lock,
  Power,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useFinanceData } from '@/hooks/useFinanceData';
import { invalidateAllFinanceEntityQueries } from '@/lib/queryKeys';
import { isSupabaseEnabled } from '@/lib/supabase';
import {
  getMcpKillSwitchState,
  listActiveMcpGrants,
  listMcpAuditLogs,
  listSoftDeletedItems,
  purgeSoftDeletedItem,
  restoreSoftDeletedItem,
  revokeAllMcpGrants,
  revokeMcpGrant,
  setMcpKillSwitchState,
  updateMcpGrantPermissions,
  type McpAuditLogEntry,
  type McpOAuthGrant,
  type SoftDeletedItem,
  type SoftDeleteEntityType,
} from '@/services/mcpConnectors.service';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AjustesHeader } from '../AjustesHeader';
import type { SectionProps } from '../types';

type GuidePlatform = 'claude' | 'chatgpt' | 'gemini';

const WRITE_SCOPE_IDS = [
  'mcp:write:transactions',
  'mcp:write:fixed_items',
  'mcp:write:goals',
  'mcp:write:debts',
] as const;

const ENTITY_LABELS: Record<SoftDeleteEntityType, string> = {
  transaction: 'Movimiento',
  fixed_item: 'Fijo',
  goal: 'Meta',
  debt: 'Deuda',
  debt_payment: 'Abono',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Sin uso reciente';
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export const ConectoresSection = memo(function ConectoresSection({ onBack }: SectionProps) {
  const { session, user } = useAuth();
  const { downloadFromCloud } = useFinanceData();
  const queryClient = useQueryClient();

  const userId = user?.id ?? session?.user?.id ?? null;
  const cloudReady = Boolean(isSupabaseEnabled && userId);

  const [mcpEndpoint] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `${window.location.origin}/mcp`;
    }
    return 'https://finance-pal.app/mcp';
  });

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [platformTab, setPlatformTab] = useState<GuidePlatform>('claude');

  const [loading, setLoading] = useState(false);
  const [mcpEnabled, setMcpEnabled] = useState(true);
  const [grants, setGrants] = useState<McpOAuthGrant[]>([]);
  const [trashItems, setTrashItems] = useState<SoftDeletedItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<McpAuditLogEntry[]>([]);

  const [busyGrantId, setBusyGrantId] = useState<string | null>(null);
  const [busyTrashKey, setBusyTrashKey] = useState<string | null>(null);
  const [confirmPurgeKey, setConfirmPurgeKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!userId || !isSupabaseEnabled) return;
    setLoading(true);
    try {
      const [enabled, activeGrants, deletedList, logs] = await Promise.all([
        getMcpKillSwitchState(userId),
        listActiveMcpGrants(userId),
        listSoftDeletedItems(),
        listMcpAuditLogs(userId, 20),
      ]);
      setMcpEnabled(enabled);
      setGrants(activeGrants);
      setTrashItems(deletedList);
      setAuditLogs(logs);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo cargar Conectores IA.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (cloudReady) {
      void loadAll();
    }
  }, [cloudReady, loadAll]);

  const handleCopyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(mcpEndpoint);
      setCopiedUrl(true);
      toast.success('URL MCP copiada al portapapeles');
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      toast.error('No se pudo copiar automáticamente; copia la URL manualmente.');
    }
  };

  const handleToggleKillSwitch = async (nextEnabled: boolean) => {
    if (!userId) return;
    setMcpEnabled(nextEnabled);
    try {
      await setMcpKillSwitchState(userId, nextEnabled);
      toast.success(
        nextEnabled
          ? 'Acceso MCP global reactivado'
          : 'Kill Switch activado: todas las IA externas quedaron bloqueadas',
      );
    } catch {
      setMcpEnabled(!nextEnabled);
      toast.error('No se pudo actualizar el interruptor maestro.');
    }
  };

  const handleRevokeAll = async () => {
    if (!userId || grants.length === 0) return;
    try {
      await revokeAllMcpGrants(userId);
      setGrants([]);
      toast.success('Todos los conectores activos fueron revocados');
    } catch {
      toast.error('Error al revocar los conectores.');
    }
  };

  const handleToggleGrantReadOnly = async (grant: McpOAuthGrant, nextReadOnly: boolean) => {
    if (!userId) return;
    setBusyGrantId(grant.id);
    try {
      const nextScopes = nextReadOnly
        ? grant.scopes.filter((s) => s.startsWith('mcp:read:'))
        : Array.from(new Set([...grant.scopes, ...WRITE_SCOPE_IDS]));
      await updateMcpGrantPermissions(grant.id, userId, {
        read_only: nextReadOnly,
        scopes: nextScopes,
      });
      setGrants((prev) =>
        prev.map((g) =>
          g.id === grant.id ? { ...g, read_only: nextReadOnly, scopes: nextScopes } : g,
        ),
      );
      toast.success(
        nextReadOnly
          ? `${grant.client_name} bloqueado a Solo Lectura`
          : `${grant.client_name} ahora permite escritura granular`,
      );
    } catch {
      toast.error('No se pudo actualizar el permiso del conector.');
    } finally {
      setBusyGrantId(null);
    }
  };

  const handleToggleDeleteScope = async (grant: McpOAuthGrant, allowDelete: boolean) => {
    if (!userId || grant.read_only) return;
    setBusyGrantId(grant.id);
    try {
      const nextScopes = allowDelete
        ? Array.from(new Set([...grant.scopes, 'mcp:delete:soft']))
        : grant.scopes.filter((s) => s !== 'mcp:delete:soft');
      await updateMcpGrantPermissions(grant.id, userId, { scopes: nextScopes });
      setGrants((prev) =>
        prev.map((g) => (g.id === grant.id ? { ...g, scopes: nextScopes } : g)),
      );
      toast.success(
        allowDelete
          ? 'Papelera 30d habilitada para este conector'
          : 'Permiso de papelera desactivado',
      );
    } catch {
      toast.error('No se pudo actualizar el permiso de papelera.');
    } finally {
      setBusyGrantId(null);
    }
  };

  const handleRevokeOne = async (grant: McpOAuthGrant) => {
    if (!userId) return;
    setBusyGrantId(grant.id);
    try {
      await revokeMcpGrant(grant.id, userId);
      setGrants((prev) => prev.filter((g) => g.id !== grant.id));
      toast.success(`Conector ${grant.client_name} revocado`);
    } catch {
      toast.error('No se pudo revocar el conector.');
    } finally {
      setBusyGrantId(null);
    }
  };

  const handleRestoreTrashItem = async (item: SoftDeletedItem) => {
    const key = `${item.entity_type}:${item.entity_id}`;
    setBusyTrashKey(key);
    try {
      await restoreSoftDeletedItem(item.entity_type, item.entity_id);
      setTrashItems((prev) =>
        prev.filter(
          (t) => !(t.entity_type === item.entity_type && t.entity_id === item.entity_id),
        ),
      );
      await invalidateAllFinanceEntityQueries(queryClient);
      if (isSupabaseEnabled && (typeof navigator === 'undefined' || navigator.onLine)) {
        await downloadFromCloud().catch(() => {});
      }
      toast.success(`${ENTITY_LABELS[item.entity_type]} restaurado a tu cuenta`);
    } catch {
      toast.error('No se pudo restaurar el registro.');
    } finally {
      setBusyTrashKey(null);
    }
  };

  const handlePurgeTrashItem = async (item: SoftDeletedItem) => {
    const key = `${item.entity_type}:${item.entity_id}`;
    setBusyTrashKey(key);
    try {
      await purgeSoftDeletedItem(item.entity_type, item.entity_id);
      setTrashItems((prev) =>
        prev.filter(
          (t) => !(t.entity_type === item.entity_type && t.entity_id === item.entity_id),
        ),
      );
      setConfirmPurgeKey(null);
      toast.success('Registro eliminado de forma permanente');
    } catch {
      toast.error('No se pudo eliminar definitivamente.');
    } finally {
      setBusyTrashKey(null);
    }
  };

  return (
    <div className="space-y-8">
      <AjustesHeader
        title="Conectores IA (MCP)"
        description="Enlaza Claude, ChatGPT o Gemini CLI mediante OAuth 2.1 sin compartir tu contraseña ni datos personales"
        icon={Bot}
        iconColorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        onBack={onBack}
      />

      {/* Endpoint & Setup Guide Stage */}
      <section className="rounded-xl bg-card border border-border p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-foreground tracking-tight">
              URL del Servidor MCP Remoto
            </h3>
            <p className="text-xs text-muted-foreground">
              Pega este endpoint en el panel de conectores personalizados de tu asistente IA.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleCopyEndpoint()}
            className="gap-1.5 font-mono-tabular"
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
            ) : (
              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
            {copiedUrl ? 'Copiado' : 'Copiar URL'}
          </Button>
        </div>

        <div className="rounded-md bg-muted/60 border border-border px-3 py-2 font-mono-tabular text-xs text-foreground break-all">
          {mcpEndpoint}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {(
            [
              ['claude', 'Claude'],
              ['chatgpt', 'ChatGPT'],
              ['gemini', 'Gemini'],
            ] as Array<[GuidePlatform, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPlatformTab(id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                platformTab === id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3 space-y-1.5">
          {platformTab === 'claude' && (
            <>
              <p className="font-medium text-foreground">Claude Web / Claude Desktop</p>
              <p>
                Ve a Ajustes › Conectores › Agregar conector personalizado, pega la URL{' '}
                <code className="font-mono-tabular text-foreground">{mcpEndpoint}</code> y completa
                el inicio de sesión OAuth 2.1 + 2FA de Finance Pal.
              </p>
            </>
          )}
          {platformTab === 'chatgpt' && (
            <>
              <p className="font-medium text-foreground">ChatGPT (Developer Mode / Apps)</p>
              <p>
                Abre Ajustes › Apps y conectores › Crear conector, pega{' '}
                <code className="font-mono-tabular text-foreground">{mcpEndpoint}</code>, elige
                autenticación OAuth y autoriza los permisos deseados.
              </p>
            </>
          )}
          {platformTab === 'gemini' && (
            <>
              <p className="font-medium text-foreground">
                Google Gemini CLI / Antigravity / SDK
              </p>
              <p>
                Configura <code className="font-mono-tabular text-foreground">{mcpEndpoint}</code>{' '}
                como servidor Streamable HTTP con OAuth en Gemini CLI (`settings.json`). Nota: la
                versión web pública de gemini.google.com aún no permite registrar servidores MCP
                externos con OAuth arbitrario.
              </p>
            </>
          )}
        </div>
      </section>

      {!cloudReady ? (
        <section className="rounded-xl border border-border p-5 flex items-start gap-3 text-xs text-muted-foreground">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="leading-relaxed">
            Activa la sincronización en nube e inicia sesión con tu cuenta en Ajustes › Nube y
            Respaldos para vincular asistentes IA y gestionar tu papelera de recuperación.
          </p>
        </section>
      ) : (
        <>
          {/* Global Kill Switch */}
          <section className="border-y border-border py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Power
                  className={`w-4 h-4 ${
                    mcpEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                  }`}
                  strokeWidth={1.5}
                />
                <h3 className="text-sm font-semibold text-foreground">
                  Interruptor Maestro MCP (Kill Switch)
                </h3>
              </div>
              <p className="text-xs text-muted-foreground max-w-[58ch]">
                {mcpEnabled
                  ? 'Habilitado: los conectores autorizados abajo pueden operar según sus permisos.'
                  : 'Bloqueado: cualquier consulta o escritura externa queda rechazada inmediatamente.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                aria-label="Interruptor Maestro MCP"
                checked={mcpEnabled}
                onCheckedChange={(checked) => void handleToggleKillSwitch(checked)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadAll()}
                disabled={loading}
                aria-label="Actualizar conectores MCP"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                  strokeWidth={1.5}
                />
              </Button>
            </div>
          </section>

          {/* Active Connectors (max 5) */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-foreground">
                  Conectores Activos ({grants.length} / 5)
                </h3>
              </div>
              {grants.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleRevokeAll()}
                  className="text-destructive hover:text-destructive text-xs"
                >
                  Revocar todos
                </Button>
              )}
            </div>

            {grants.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 border-y border-border">
                Aún no hay asistentes IA conectados. Autoriza uno desde Claude, ChatGPT o Gemini CLI
                usando el endpoint superior.
              </p>
            ) : (
              <div className="divide-y divide-border border-y border-border">
                {grants.map((grant) => {
                  const hasDelete = grant.scopes.includes('mcp:delete:soft');
                  const isBusy = busyGrantId === grant.id;

                  return (
                    <div key={grant.id} className="py-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {grant.client_name}
                            </span>
                            <span className="text-[11px] font-mono-tabular px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {grant.aal2_verified_at ? 'AAL2 verificado' : 'AAL1'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono-tabular">
                            Último uso: {formatDateTime(grant.last_used_at)} · {grant.scopes.length}{' '}
                            permisos
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleRevokeOne(grant)}
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                        >
                          Revocar
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          {grant.read_only ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                          )}
                          <span>Solo Lectura</span>
                          <Switch
                            aria-label={`Solo Lectura para ${grant.client_name}`}
                            disabled={isBusy}
                            checked={grant.read_only}
                            onCheckedChange={(checked) =>
                              void handleToggleGrantReadOnly(grant, checked)
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                          <span>Permitir Papelera 30d</span>
                          <Switch
                            aria-label={`Permitir Papelera 30d para ${grant.client_name}`}
                            disabled={isBusy || grant.read_only}
                            checked={!grant.read_only && hasDelete}
                            onCheckedChange={(checked) =>
                              void handleToggleDeleteScope(grant, checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 30-Day Recovery Trash UI */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#C86446]" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-foreground">
                  Papelera de Recuperación (30 días)
                </h3>
              </div>
              <span className="text-xs font-mono-tabular text-muted-foreground">
                {trashItems.length} elemento(s)
              </span>
            </div>

            {trashItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 border-y border-border">
                La papelera está vacía. Cualquier borrado confirmado vía MCP permanece recuperable
                aquí durante 30 días antes de su purga automática.
              </p>
            ) : (
              <div className="divide-y divide-border border-y border-border">
                {trashItems.map((item) => {
                  const key = `${item.entity_type}:${item.entity_id}`;
                  const busy = busyTrashKey === key;
                  const confirmingPurge = confirmPurgeKey === key;

                  return (
                    <div
                      key={key}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono-tabular px-1.5 py-0.5 rounded bg-muted text-foreground">
                            {ENTITY_LABELS[item.entity_type]}
                          </span>
                          <span className="text-sm font-medium text-foreground">{item.title}</span>
                          <span className="text-xs font-mono-tabular text-muted-foreground">
                            ${Number(item.amount ?? 0).toLocaleString('es-MX')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono-tabular">
                          {item.subtitle} · Expira en {item.days_remaining} día(s)
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void handleRestoreTrashItem(item)}
                          className="gap-1.5 text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Restaurar
                        </Button>

                        {confirmingPurge ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() => void handlePurgeTrashItem(item)}
                            className="text-xs"
                          >
                            Confirmar purga
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => setConfirmPurgeKey(key)}
                            className="text-xs text-destructive hover:text-destructive"
                          >
                            Eliminar definitivo
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Privacy-Safe Audit Log */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-foreground">Bitácora MCP Reciente</h3>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 border-y border-border flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Sin llamadas MCP registradas recientemente.</span>
              </p>
            ) : (
              <div className="divide-y divide-border border-y border-border">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="font-semibold text-foreground">{log.tool_name}</span>
                      {log.error_code && (
                        <span className="text-destructive">{log.error_code}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {log.duration_ms !== null ? `${log.duration_ms} ms · ` : ''}
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
});

export default ConectoresSection;
