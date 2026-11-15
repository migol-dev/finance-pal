import type { McpTokenPayload } from '../oauth/crypto.js';
import type { McpScope } from '../oauth/scopes.js';
import { getSupabaseAdmin } from '../supabase-admin.js';

const UNTRUSTED_KEYS = new Set(['concept', 'note', 'person', 'subtitle']);
const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024;
const ANOMALY_WINDOW_MS = 60_000;
const ANOMALY_ERROR_THRESHOLD = 15;
const ANOMALY_WRITE_THRESHOLD = 25;

interface AnomalyBucket {
  windowStart: number;
  total: number;
  errors: number;
  writes: number;
}

const anomalyBuckets = new Map<string, AnomalyBucket>();

/**
 * Neutralizes nested untrusted note tags and wraps user-authored free text
 * to defend external LLM clients against indirect prompt injection.
 */
export function wrapUntrustedUserText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value);
  if (text.trim().length === 0) {
    return '';
  }
  const sanitized = text.replace(/<\/?\s*untrusted_user_note\s*>/gi, '[untrusted_tag]');
  return `<untrusted_user_note>${sanitized}</untrusted_user_note>`;
}

/**
 * Recursively wraps free-text user fields (`concept`, `note`, `person`, `subtitle`)
 * inside structured tool outputs before returning them to an LLM.
 */
export function sanitizeUntrustedFields<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeUntrustedFields(item)) as unknown as T;
  }
  if (typeof data !== 'object') {
    return data;
  }

  const record = data as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (UNTRUSTED_KEYS.has(key) && typeof value === 'string') {
      output[key] = wrapUntrustedUserText(value);
    } else if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
      output[key] = sanitizeUntrustedFields(value);
    } else {
      output[key] = value;
    }
  }
  return output as T;
}

/**
 * Ensures serialized MCP tool payloads remain within the 64 KB response cap,
 * trimming array tails gracefully and marking `truncated: true` when trimmed.
 */
export function enforceResponseByteCap<T extends Record<string, unknown>>(
  payload: T,
  maxBytes: number = DEFAULT_MAX_RESPONSE_BYTES,
): T & { truncated?: boolean } {
  const clone: Record<string, unknown> = { ...payload };
  if (Buffer.byteLength(JSON.stringify(clone), 'utf8') <= maxBytes) {
    return clone as T & { truncated?: boolean };
  }

  const arrayKeys = Object.keys(clone).filter((k) => Array.isArray(clone[k]));
  for (const key of arrayKeys) {
    clone[key] = [...(clone[key] as unknown[])];
  }

  let modified = false;
  while (Buffer.byteLength(JSON.stringify(clone), 'utf8') > maxBytes) {
    let trimmedAny = false;
    for (const key of arrayKeys) {
      const arr = clone[key] as unknown[];
      if (arr.length > 0) {
        const nextLen = Math.max(0, Math.floor(arr.length * 0.75) - (arr.length <= 3 ? 1 : 0));
        clone[key] = arr.slice(0, nextLen);
        trimmedAny = true;
        modified = true;
      }
    }
    if (!trimmedAny) {
      break;
    }
  }

  if (Buffer.byteLength(JSON.stringify(clone), 'utf8') > maxBytes) {
    for (const key of Object.keys(clone)) {
      if (typeof clone[key] === 'string' && (clone[key] as string).length > 256) {
        clone[key] = '[truncated_due_to_size_limit]';
        modified = true;
      }
    }
  }

  if (modified) {
    clone.truncated = true;
    if (typeof clone.count === 'number' && Array.isArray(clone[arrayKeys[0] ?? ''])) {
      clone.returned_count = (clone[arrayKeys[0]] as unknown[]).length;
    }
  }

  return clone as T & { truncated?: boolean };
}

/**
 * Lightweight in-memory burst detector to flag anomalous consecutive errors or writes.
 */
export function checkAndRecordAnomaly(
  grantId: string,
  status: 'success' | 'error' | 'denied',
  isWrite: boolean,
  nowMs: number = Date.now(),
): { anomalyDetected: boolean; reason?: string } {
  if (anomalyBuckets.size > 500) {
    for (const [key, bucket] of anomalyBuckets.entries()) {
      if (nowMs - bucket.windowStart > ANOMALY_WINDOW_MS) {
        anomalyBuckets.delete(key);
      }
    }
  }

  const existing = anomalyBuckets.get(grantId);
  const bucket: AnomalyBucket =
    existing && nowMs - existing.windowStart <= ANOMALY_WINDOW_MS
      ? existing
      : { windowStart: nowMs, total: 0, errors: 0, writes: 0 };

  bucket.total += 1;
  if (status !== 'success') {
    bucket.errors += 1;
  }
  if (isWrite) {
    bucket.writes += 1;
  }
  anomalyBuckets.set(grantId, bucket);

  if (bucket.errors >= ANOMALY_ERROR_THRESHOLD) {
    return { anomalyDetected: true, reason: 'HIGH_ERROR_BURST' };
  }
  if (bucket.writes >= ANOMALY_WRITE_THRESHOLD) {
    return { anomalyDetected: true, reason: 'HIGH_WRITE_BURST' };
  }
  return { anomalyDetected: false };
}

export function resetAnomalyBucketsForTests(): void {
  anomalyBuckets.clear();
}

export interface RpcMappedError {
  code: string;
  message: string;
  status: 'denied' | 'error';
}

const RPC_ERROR_MAP: Array<{ pattern: RegExp; code: string; message: string; status: 'denied' | 'error' }> = [
  {
    pattern: /GRANT_NOT_FOUND_OR_REVOKED/,
    code: 'GRANT_NOT_FOUND_OR_REVOKED',
    message: 'Este conector fue revocado o ya no es válido. Reconéctalo desde Ajustes › Conectores IA en Finance Pal.',
    status: 'denied',
  },
  {
    pattern: /MCP_DISABLED_BY_USER/,
    code: 'MCP_DISABLED_BY_USER',
    message: 'El interruptor maestro (Kill Switch) de MCP está desactivado en Finance Pal. Actívalo en Ajustes › Conectores IA.',
    status: 'denied',
  },
  {
    pattern: /MFA_AAL2_REQUIRED/,
    code: 'MFA_AAL2_REQUIRED',
    message: 'Esta cuenta requiere verificación MFA (AAL2). Autoriza nuevamente el conector completando el código TOTP.',
    status: 'denied',
  },
  {
    pattern: /READ_ONLY_MODE_ACTIVE/,
    code: 'READ_ONLY_MODE_ACTIVE',
    message: 'El conector está en modo Solo Lectura. Desactiva "Solo lectura" en Ajustes › Conectores IA si deseas permitir modificaciones.',
    status: 'denied',
  },
  {
    pattern: /INSUFFICIENT_SCOPE:([a-z0-9:_-]+)/i,
    code: 'INSUFFICIENT_SCOPE',
    message: 'El conector no tiene el permiso requerido para esta operación.',
    status: 'denied',
  },
  {
    pattern: /ACCOUNT_SOFT_DELETE_NOT_ALLOWED/,
    code: 'ACCOUNT_SOFT_DELETE_NOT_ALLOWED',
    message: 'Las cuentas financieras no pueden eliminarse vía MCP para proteger la integridad del balance.',
    status: 'denied',
  },
  {
    pattern: /SCHEDULED_TX_IMMUTABLE/,
    code: 'SCHEDULED_TX_IMMUTABLE',
    message: 'Los movimientos generados automáticamente por gastos o ingresos fijos son inmutables vía MCP.',
    status: 'denied',
  },
  {
    pattern: /INVALID_OR_EXPIRED_CONFIRMATION/,
    code: 'INVALID_OR_EXPIRED_CONFIRMATION',
    message: 'El token de confirmación expiró (120 s) o ya fue usado. Ejecuta prepare_soft_delete nuevamente si el usuario aún desea borrarlo.',
    status: 'denied',
  },
  {
    pattern: /INVALID_PAYMENT_METHOD_FOR_ACCOUNT/,
    code: 'INVALID_PAYMENT_METHOD_FOR_ACCOUNT',
    message: 'Método de pago incompatible con el tipo de cuenta: efectivo usa "cash"; bancos usan "card" o "transfer".',
    status: 'error',
  },
  {
    pattern: /INVALID_PAYMENT_METHOD/,
    code: 'INVALID_PAYMENT_METHOD',
    message: 'Método de pago inválido. Valores permitidos: cash, transfer, card, other.',
    status: 'error',
  },
  {
    pattern: /ENTITY_NOT_FOUND|ENTITY_ALREADY_DELETED_OR_MISSING/,
    code: 'ENTITY_NOT_FOUND',
    message: 'No se encontró el registro solicitado o ya fue enviado a la papelera.',
    status: 'error',
  },
  {
    pattern: /ACCOUNT_NOT_FOUND/,
    code: 'ACCOUNT_NOT_FOUND',
    message: 'No se encontró la cuenta especificada en el perfil del usuario.',
    status: 'error',
  },
  {
    pattern: /INVALID_DATE_RANGE/,
    code: 'INVALID_DATE_RANGE',
    message: 'Rango de fechas inválido. La consulta de movimientos permite un máximo de 90 días por llamada.',
    status: 'error',
  },
  {
    pattern: /INVALID_TRANSFER_TARGET/,
    code: 'INVALID_TRANSFER_TARGET',
    message: 'Las transferencias requieren cuenta origen y cuenta destino distintas y activas.',
    status: 'error',
  },
  {
    pattern: /AMOUNT_MUST_BE_POSITIVE/,
    code: 'AMOUNT_MUST_BE_POSITIVE',
    message: 'El monto debe ser un número positivo mayor a cero.',
    status: 'error',
  },
];

export function mapRpcError(error: unknown): RpcMappedError {
  const raw = error instanceof Error ? error.message : String(error ?? 'UNKNOWN_ERROR');
  for (const entry of RPC_ERROR_MAP) {
    if (entry.pattern.test(raw)) {
      return {
        code: entry.code,
        message: entry.message,
        status: entry.status,
      };
    }
  }
  return {
    code: 'MCP_EXECUTION_ERROR',
    message: 'No se pudo completar la operación solicitada en Finance Pal.',
    status: 'error',
  };
}

export interface AuditLogEntry {
  userId: string;
  grantId: string;
  clientId: string;
  toolName: string;
  isWrite: boolean;
  status: 'success' | 'error' | 'denied';
  errorCode?: string | null;
  summary?: Record<string, unknown>;
  durationMs: number;
}

const ALLOWED_SUMMARY_KEYS = new Set([
  'entity_type',
  'entity_id',
  'count',
  'returned_count',
  'amount',
  'direction',
  'frequency',
  'anomaly',
  'truncated',
  'status',
]);

function filterSafeAuditSummary(summary?: Record<string, unknown>): Record<string, unknown> {
  if (!summary) return {};
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(summary)) {
    if (ALLOWED_SUMMARY_KEYS.has(key)) {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Persists a privacy-safe audit event to `mcp_audit_log` without raw PII or user text.
 */
export async function recordMcpAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const anomaly = checkAndRecordAnomaly(entry.grantId, entry.status, entry.isWrite);
    const safeSummary = filterSafeAuditSummary(entry.summary);
    if (anomaly.anomalyDetected) {
      safeSummary.anomaly = anomaly.reason;
    }

    const admin = getSupabaseAdmin();
    await admin.rest('mcp_audit_log', {
      method: 'POST',
      prefer: 'return=minimal',
      body: {
        user_id: entry.userId,
        grant_id: entry.grantId,
        client_id: entry.clientId,
        tool_name: entry.toolName,
        is_write: entry.isWrite,
        status: entry.status,
        error_code: entry.errorCode ?? null,
        summary: safeSummary,
        duration_ms: Math.max(0, Math.round(entry.durationMs)),
      },
    });
  } catch {
    // Telemetry must never break tool execution or leak stack traces.
  }
}

export interface ExecuteRpcToolOptions {
  token: McpTokenPayload;
  toolName: string;
  requiredScope: McpScope;
  isWrite: boolean;
  rpcName: string;
  rpcParams: Record<string, unknown>;
  summarize?: (result: Record<string, unknown>) => Record<string, unknown>;
  transform?: (result: Record<string, unknown>) => Record<string, unknown>;
}

export interface McpToolExecutionResult {
  [x: string]: unknown;
  isError?: boolean;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
}

/**
 * Shared execution wrapper for all MCP read and write tools:
 * verifies token scope, calls parameterized PG17 RPC, wraps free-text fields
 * against prompt injection, caps response at 64 KB, and persists audit telemetry.
 */
export async function executeRpcTool(options: ExecuteRpcToolOptions): Promise<McpToolExecutionResult> {
  const started = Date.now();
  const { token, toolName, requiredScope, isWrite, rpcName, rpcParams, summarize, transform } = options;

  if (!token.scopes.includes(requiredScope)) {
    await recordMcpAuditLog({
      userId: token.sub,
      grantId: token.grantId,
      clientId: token.clientId,
      toolName,
      isWrite,
      status: 'denied',
      errorCode: 'INSUFFICIENT_SCOPE',
      durationMs: Date.now() - started,
    });
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'INSUFFICIENT_SCOPE',
            required_scope: requiredScope,
            message: `El token actual no incluye el permiso requerido (${requiredScope}).`,
          }),
        },
      ],
    };
  }

  try {
    const admin = getSupabaseAdmin();
    const rpcRes = await admin.rpc<Record<string, unknown>>(rpcName, rpcParams);
    if (rpcRes.error) {
      throw new Error(rpcRes.error.message || 'MCP_EXECUTION_ERROR');
    }
    const raw = rpcRes.data;
    const normalized = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : { data: raw };
    const transformed = transform ? transform(normalized) : normalized;
    const sanitized = sanitizeUntrustedFields(transformed);
    const capped = enforceResponseByteCap(sanitized);

    const summary = summarize ? summarize(capped) : undefined;
    if (capped.truncated && summary) {
      summary.truncated = true;
    }

    await recordMcpAuditLog({
      userId: token.sub,
      grantId: token.grantId,
      clientId: token.clientId,
      toolName,
      isWrite,
      status: 'success',
      summary,
      durationMs: Date.now() - started,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(capped) }],
      structuredContent: capped,
    };
  } catch (err) {
    const mapped = mapRpcError(err);
    await recordMcpAuditLog({
      userId: token.sub,
      grantId: token.grantId,
      clientId: token.clientId,
      toolName,
      isWrite,
      status: mapped.status,
      errorCode: mapped.code,
      durationMs: Date.now() - started,
    });

    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: mapped.code,
            message: mapped.message,
          }),
        },
      ],
    };
  }
}
