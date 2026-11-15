import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  ExternalLink,
  Eye,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

interface ScopeMeta {
  id: string;
  label: string;
  description: string;
  kind: 'read' | 'write' | 'delete';
}

const SCOPE_CATALOG: ScopeMeta[] = [
  {
    id: 'mcp:read:overview',
    label: 'Resumen mensual y regla 60/20/20',
    description: 'Totales agregados de ingresos, gastos, ahorro y cumplimiento de presupuesto.',
    kind: 'read',
  },
  {
    id: 'mcp:read:accounts',
    label: 'Cuentas y saldos',
    description: 'Nombres de cuentas, tipo (efectivo/banco) y balance calculado vigente.',
    kind: 'read',
  },
  {
    id: 'mcp:read:transactions',
    label: 'Movimientos y gastos por categoría',
    description: 'Historial reciente de movimientos (máximo 90 días y 50 filas por consulta).',
    kind: 'read',
  },
  {
    id: 'mcp:read:fixed_items',
    label: 'Gastos e ingresos fijos',
    description: 'Compromisos recurrentes, frecuencia y prorrateo mensual.',
    kind: 'read',
  },
  {
    id: 'mcp:read:goals',
    label: 'Metas de ahorro',
    description: 'Progreso, montos ahorrados y fechas objetivo.',
    kind: 'read',
  },
  {
    id: 'mcp:read:debts',
    label: 'Deudas y abonos',
    description: 'Préstamos por cobrar y deudas por pagar sin información de contacto externo.',
    kind: 'read',
  },
  {
    id: 'mcp:write:transactions',
    label: 'Registrar y editar movimientos',
    description: 'Crear o corregir movimientos manuales (excluye movimientos fijos automáticos).',
    kind: 'write',
  },
  {
    id: 'mcp:write:fixed_items',
    label: 'Crear y pausar gastos fijos',
    description: 'Añadir gastos o ingresos recurrentes y cambiar su estado activo.',
    kind: 'write',
  },
  {
    id: 'mcp:write:goals',
    label: 'Crear metas y registrar aportaciones',
    description: 'Crear metas nuevas y abonar desde tus cuentas.',
    kind: 'write',
  },
  {
    id: 'mcp:write:debts',
    label: 'Crear deudas y registrar abonos',
    description: 'Dar de alta deudas y registrar pagos o cobros.',
    kind: 'write',
  },
  {
    id: 'mcp:delete:soft',
    label: 'Enviar un registro a la papelera (opt-in)',
    description:
      'Permite enviar 1 registro por vez a la papelera de 30 días tras confirmación de 2 pasos. Cuentas bloqueadas.',
    kind: 'delete',
  },
];

const DEFAULT_READ_IDS = SCOPE_CATALOG.filter((s) => s.kind === 'read').map((s) => s.id);
const WRITE_IDS = new Set(SCOPE_CATALOG.filter((s) => s.kind === 'write').map((s) => s.id));

function safeHttpsClientUri(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const { session, user, refreshSession } = useAuth();

  const clientId = searchParams.get('client_id') ?? '';
  const clientName = searchParams.get('client_name') || clientId || 'Asistente IA externo';
  const redirectUri = searchParams.get('redirect_uri') ?? '';
  const state = searchParams.get('state') ?? '';
  const codeChallenge = searchParams.get('code_challenge') ?? '';
  const codeChallengeMethod = searchParams.get('code_challenge_method') ?? '';
  const resource = searchParams.get('resource') ?? undefined;
  const requestedScopeParam = searchParams.get('scope') ?? '';
  const clientUri = safeHttpsClientUri(searchParams.get('client_uri'));

  const requestValid = Boolean(
    clientId && redirectUri && state && codeChallenge && codeChallengeMethod === 'S256',
  );

  const requestedSet = useMemo(
    () => new Set(requestedScopeParam.split(/\s+/).filter(Boolean)),
    [requestedScopeParam],
  );

  const redirectHost = useMemo(() => {
    try {
      return new URL(redirectUri).host;
    } catch {
      return redirectUri;
    }
  }, [redirectUri]);

  // Safety default: always open in Solo Lectura unless user explicitly unlocks writing
  const [readOnly, setReadOnly] = useState(true);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(() => {
    const initialReads = DEFAULT_READ_IDS.filter((id) =>
      requestedSet.size > 0 ? requestedSet.has(id) : true,
    );
    return new Set(initialReads.length > 0 ? initialReads : DEFAULT_READ_IDS);
  });

  const [mfaLoading, setMfaLoading] = useState(true);
  const [requiresAal2, setRequiresAal2] = useState(false);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [verifyingTotp, setVerifyingTotp] = useState(false);

  const [submitting, setSubmitting] = useState<'approve' | 'deny' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [maxReachedError, setMaxReachedError] = useState(false);

  const sessionUserId = session?.user?.id ?? user?.id ?? null;

  useEffect(() => {
    let active = true;
    async function checkAal2() {
      try {
        const [{ data: aalData }, { data: factorData }] = await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
        ]);
        if (!active) return;

        const allFactors = factorData?.all ?? [];
        const verifiedTotp = allFactors.find(
          (f: { factor_type: string; status: string }) =>
            f.factor_type === 'totp' && f.status === 'verified',
        );

        const hasVerifiedMfa = Boolean(verifiedTotp);
        const currentAal = aalData?.currentLevel ?? 'aal1';
        setRequiresAal2(hasVerifiedMfa && currentAal !== 'aal2');
        setTotpFactorId(verifiedTotp?.id ?? null);
      } catch {
        if (active) {
          setRequiresAal2(false);
        }
      } finally {
        if (active) setMfaLoading(false);
      }
    }

    if (sessionUserId) {
      void checkAal2();
    } else {
      setMfaLoading(false);
    }
    return () => {
      active = false;
    };
  }, [sessionUserId]);

  const handleReadOnlyToggle = (checked: boolean) => {
    setReadOnly(checked);
    if (checked) {
      setSelectedScopes((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if (DEFAULT_READ_IDS.includes(id)) next.add(id);
        }
        return next;
      });
    } else {
      // Unlock writes requested by client (except mcp:delete:soft which remains strictly opt-in)
      setSelectedScopes((prev) => {
        const next = new Set(prev);
        for (const id of WRITE_IDS) {
          if (requestedSet.size === 0 || requestedSet.has(id)) {
            next.add(id);
          }
        }
        return next;
      });
    }
  };

  const toggleScope = (scopeId: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scopeId)) {
        next.delete(scopeId);
      } else {
        next.add(scopeId);
      }
      return next;
    });
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpFactorId || totpCode.trim().length !== 6) {
      setErrorMessage('Ingresa el código TOTP de 6 dígitos de tu app autenticadora.');
      return;
    }
    setVerifyingTotp(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactorId,
        code: totpCode.trim(),
      });
      if (error) {
        setErrorMessage('Código 2FA inválido o expirado. Intenta nuevamente.');
        return;
      }
      await refreshSession();
      setRequiresAal2(false);
      setTotpCode('');
    } catch {
      setErrorMessage('No se pudo validar tu verificación de dos pasos.');
    } finally {
      setVerifyingTotp(false);
    }
  };

  const submitDecision = async (decision: 'approve' | 'deny') => {
    if (!session?.access_token) {
      setErrorMessage('Tu sesión expiró. Recarga la página para volver a iniciar sesión.');
      return;
    }

    setSubmitting(decision);
    setErrorMessage(null);
    setMaxReachedError(false);

    try {
      const effectiveScopes = readOnly
        ? Array.from(selectedScopes).filter((id) => DEFAULT_READ_IDS.includes(id))
        : Array.from(selectedScopes);

      const res = await fetch('/oauth/consent-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          decision,
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          ...(resource ? { resource } : {}),
          read_only: readOnly,
          scopes: effectiveScopes,
        }),
      });

      const data = (await res.json()) as {
        redirectTo?: string;
        error?: string;
        error_description?: string;
      };

      if (!res.ok || !data.redirectTo) {
        if (data.error === 'max_connectors_reached') {
          setMaxReachedError(true);
        }
        if (data.error === 'mfa_aal2_required') {
          setRequiresAal2(true);
        }
        setErrorMessage(
          data.error_description || 'No fue posible procesar la autorización del conector.',
        );
        return;
      }

      window.location.href = data.redirectTo;
    } catch {
      setErrorMessage('Error de red al comunicarse con el servidor de autorización.');
    } finally {
      setSubmitting(null);
    }
  };

  if (!requestValid) {
    return (
      <main className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B0B0A] text-[#191918] dark:text-[#EDEDED] px-6 py-16">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.14em] text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
            <ShieldAlert className="w-4 h-4 text-destructive" strokeWidth={1.5} />
            <span>OAuth 2.1 · Solicitud inválida</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Parámetros de autorización incompletos
          </h1>
          <p className="text-sm text-[#6E6A63] dark:text-[#8E8D8A] leading-relaxed">
            La aplicación externa no envió los parámetros PKCE (`S256`), `client_id` o `redirect_uri`
            válidos requeridos por Finance Pal MCP.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Volver a Finance Pal</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F5] dark:bg-[#0B0B0A] text-[#191918] dark:text-[#EDEDED] px-5 py-10 md:py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Editorial Header */}
        <header className="space-y-4 border-b border-[#E4E0D8] dark:border-white/10 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
              <Bot className="w-4 h-4 text-[#C86446] dark:text-emerald-400" strokeWidth={1.5} />
              <span>Finance Pal · Autorización MCP OAuth 2.1</span>
            </div>
            {user?.email && (
              <span className="text-xs text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
                {user.email}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
            Conectar <span className="text-[#C86446] dark:text-emerald-400">{clientName}</span> con
            tu cuenta
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
            <span>Cliente: {clientId}</span>
            <span>Retorno: {redirectHost}</span>
            {clientUri && (
              <a
                href={clientUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
              >
                Sitio del cliente
                <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
              </a>
            )}
          </div>
        </header>

        {/* Primary Focal Control: Read-Only Mode */}
        <section className="bg-[#F2EFE9] dark:bg-[#141413] border border-[#E4E0D8] dark:border-white/10 rounded-[6px] p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {readOnly ? (
                  <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                ) : (
                  <Lock className="w-4 h-4 text-[#C86446]" strokeWidth={1.5} />
                )}
                <h2 className="text-sm font-semibold">Modo Solo Lectura (Recomendado)</h2>
              </div>
              <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A] max-w-[60ch] leading-relaxed">
                {readOnly
                  ? 'Activo: la IA únicamente puede consultar resúmenes, saldos, movimientos, metas y deudas. No puede crear, modificar ni enviar registros a la papelera.'
                  : 'Desactivado: habilitaste permisos de escritura granular. Siempre puedes volver a Solo Lectura al instante en Ajustes.'}
              </p>
            </div>
            <Switch
              aria-label="Modo Solo Lectura"
              checked={readOnly}
              onCheckedChange={handleReadOnlyToggle}
            />
          </div>
        </section>

        {/* Inline AAL2 MFA Step-up Gate */}
        {!mfaLoading && requiresAal2 && (
          <section className="border border-amber-500/40 bg-amber-500/5 rounded-[6px] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Verificación 2FA requerida (AAL2)</h2>
                <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A]">
                  Tu cuenta tiene autenticación de dos factores activa. Ingresa tu código TOTP actual
                  para autorizar este conector externo.
                </p>
              </div>
            </div>
            <form onSubmit={handleVerifyTotp} className="flex flex-wrap items-center gap-3">
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Código de 6 dígitos"
                inputMode="numeric"
                maxLength={6}
                className="w-44 font-mono-tabular tracking-[0.2em]"
                aria-label="Código TOTP 2FA"
              />
              <Button type="submit" disabled={verifyingTotp || totpCode.length !== 6} size="sm">
                {verifyingTotp ? 'Verificando...' : 'Confirmar 2FA'}
              </Button>
            </form>
          </section>
        )}

        {/* Granular Permissions Hairline List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.14em] text-[#6E6A63] dark:text-[#8E8D8A] font-mono-tabular">
              Permisos solicitados ({selectedScopes.size} activos)
            </h2>
            <span className="text-xs text-[#6E6A63] dark:text-[#8E8D8A]">
              Expira tras inactividad o revocación manual
            </span>
          </div>

          <div className="divide-y divide-[#E4E0D8] dark:divide-white/10 border-y border-[#E4E0D8] dark:border-white/10">
            {SCOPE_CATALOG.map((scope) => {
              const isLockedByReadOnly = readOnly && scope.kind !== 'read';
              const isChecked = !isLockedByReadOnly && selectedScopes.has(scope.id);
              const isDelete = scope.kind === 'delete';

              return (
                <label
                  key={scope.id}
                  className={`flex items-start justify-between gap-4 py-3.5 transition-colors ${
                    isLockedByReadOnly ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isDelete && (
                        <Trash2 className="w-3.5 h-3.5 text-destructive shrink-0" strokeWidth={1.5} />
                      )}
                      <span className="text-sm font-medium">{scope.label}</span>
                      <code className="text-[11px] font-mono-tabular text-[#6E6A63] dark:text-[#8E8D8A]">
                        {scope.id}
                      </code>
                    </div>
                    <p className="text-xs text-[#6E6A63] dark:text-[#8E8D8A] max-w-[58ch]">
                      {scope.description}
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    aria-label={scope.label}
                    disabled={isLockedByReadOnly}
                    checked={isChecked}
                    onChange={() => toggleScope(scope.id)}
                    className="mt-1 h-4 w-4 accent-[#C86446] dark:accent-emerald-500 rounded-[2px]"
                  />
                </label>
              );
            })}
          </div>
        </section>

        {/* Opt-in Soft-Delete Warning Banner */}
        {!readOnly && selectedScopes.has('mcp:delete:soft') && (
          <div className="flex items-start gap-3 border border-destructive/40 bg-destructive/5 rounded-[6px] p-4 text-xs">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="leading-relaxed">
              <strong>Envío a papelera habilitado:</strong> cada eliminación requerirá 2 pasos con
              confirmación explícita tuya (120 s) y permanecerá recuperable durante 30 días en{' '}
              <span className="font-mono-tabular">Ajustes › 10 · Conectores IA</span>. Las cuentas
              y movimientos fijos automáticos permanecen protegidos.
            </p>
          </div>
        )}

        {/* Privacy Notice (Zero PII) */}
        <div className="flex items-start gap-3 text-xs text-[#6E6A63] dark:text-[#8E8D8A] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p>
            Privacidad LFPDPPP / GDPR: tu correo, credenciales bancarias, tokens de sesión y recibos
            adjuntos nunca se exponen vía MCP.
          </p>
        </div>

        {/* Error Display */}
        {errorMessage && (
          <div
            role="alert"
            className="border border-destructive/50 bg-destructive/5 rounded-[6px] p-4 space-y-2 text-xs text-destructive"
          >
            <p className="font-medium">{errorMessage}</p>
            {maxReachedError && (
              <Link
                to="/ajustes"
                className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
              >
                Administrar conectores en Ajustes <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
            )}
          </div>
        )}

        {/* Explicit Action Buttons */}
        <footer className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2 border-t border-[#E4E0D8] dark:border-white/10">
          <Button
            type="button"
            variant="outline"
            disabled={submitting !== null}
            onClick={() => void submitDecision('deny')}
            className="gap-2"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
            {submitting === 'deny' ? 'Cancelando...' : 'Denegar acceso'}
          </Button>
          <Button
            type="button"
            disabled={submitting !== null || mfaLoading || requiresAal2 || selectedScopes.size === 0}
            onClick={() => void submitDecision('approve')}
            className="gap-2 bg-[#191918] text-[#FAF8F5] hover:bg-[#191918]/90 dark:bg-emerald-500 dark:text-[#0B0B0A] dark:hover:bg-emerald-400"
          >
            <Check className="w-4 h-4" strokeWidth={1.5} />
            {submitting === 'approve' ? 'Autorizando...' : 'Autorizar conector'}
          </Button>
        </footer>
      </div>
    </main>
  );
}
