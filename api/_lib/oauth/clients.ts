import net from 'node:net';
import { z } from 'zod';
import { assertPublicFetchableHttpsUrl, isLocalhostHostname, isPrivateOrReservedIp } from '../security.js';
import type { SupabaseAdminClient } from '../supabase-admin.js';
import { generateOpaqueToken } from './crypto.js';

export const MAX_REDIRECT_URIS = 12;

export interface OAuthClientRecord {
  client_id: string;
  client_name: string;
  client_uri: string | null;
  logo_uri: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  is_cimd: boolean;
  cimd_cached_until: string | null;
}

export function validateRedirectUri(rawUri: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUri);
  } catch {
    return null;
  }
  if (parsed.hash) return null;

  if (parsed.protocol === 'http:') {
    if (!isLocalhostHostname(parsed.hostname)) return null;
    return parsed.toString();
  }

  if (parsed.protocol === 'https:') {
    const host = parsed.hostname.toLowerCase();
    const unbracketed = host.replace(/^\[|\]$/g, '');
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.arpa')
    ) {
      return null;
    }
    if (net.isIP(unbracketed) !== 0 && isPrivateOrReservedIp(unbracketed)) {
      return null;
    }
    return parsed.toString();
  }

  return null;
}

function optionalHttpOrHttpsUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:') return parsed.toString();
  } catch {
    // ignore invalid optional metadata URI
  }
  return null;
}

const dcrRequestSchema = z.object({
  client_name: z.string().trim().min(1, 'client_name is required').max(120),
  redirect_uris: z.array(z.string().trim().min(1)).min(1).max(MAX_REDIRECT_URIS),
  client_uri: z.string().optional(),
  logo_uri: z.string().optional(),
  grant_types: z.array(z.string()).optional(),
  response_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.string().optional(),
});

export class OAuthClientError extends Error {
  public readonly oauthError: string;
  public readonly status: number;

  constructor(oauthError: string, message: string, status = 400) {
    super(message);
    this.oauthError = oauthError;
    this.status = status;
  }
}

export async function registerDynamicClient(
  rawBody: unknown,
  clientIp: string,
  db: SupabaseAdminClient,
): Promise<OAuthClientRecord> {
  const rate = await db.rpc<{ allowed: boolean }>('mcp_check_rate_limit', {
    p_key: `dcr:${clientIp}`,
    p_window_seconds: 3600,
    p_max_requests: 10,
  });
  if (rate.data && rate.data.allowed === false) {
    throw new OAuthClientError('too_many_requests', 'Dynamic client registration rate limit exceeded', 429);
  }

  const parsed = dcrRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new OAuthClientError('invalid_client_metadata', 'Invalid client registration metadata', 400);
  }

  const data = parsed.data;
  if (data.token_endpoint_auth_method && data.token_endpoint_auth_method !== 'none') {
    throw new OAuthClientError(
      'invalid_client_metadata',
      'Only public PKCE clients (token_endpoint_auth_method=none) are supported',
      400,
    );
  }

  const normalizedUris: string[] = [];
  for (const uri of data.redirect_uris) {
    const valid = validateRedirectUri(uri);
    if (!valid) {
      throw new OAuthClientError('invalid_redirect_uri', `Rejected redirect_uri: ${uri}`, 400);
    }
    if (!normalizedUris.includes(valid)) {
      normalizedUris.push(valid);
    }
  }

  const grantTypes =
    data.grant_types && data.grant_types.length > 0
      ? data.grant_types.filter((g) => g === 'authorization_code' || g === 'refresh_token')
      : ['authorization_code', 'refresh_token'];
  if (!grantTypes.includes('authorization_code')) {
    throw new OAuthClientError('invalid_client_metadata', 'authorization_code grant_type is required', 400);
  }

  const responseTypes =
    data.response_types && data.response_types.length > 0
      ? data.response_types.filter((r) => r === 'code')
      : ['code'];
  if (!responseTypes.includes('code')) {
    throw new OAuthClientError('invalid_client_metadata', 'code response_type is required', 400);
  }

  const record: OAuthClientRecord = {
    client_id: `fp_dcr_${generateOpaqueToken(16)}`,
    client_name: data.client_name,
    client_uri: optionalHttpOrHttpsUrl(data.client_uri),
    logo_uri: optionalHttpOrHttpsUrl(data.logo_uri),
    redirect_uris: normalizedUris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: 'none',
    is_cimd: false,
    cimd_cached_until: null,
  };

  const insert = await db.rest<OAuthClientRecord[]>('mcp_oauth_clients', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      ...record,
      created_by_ip: clientIp,
    },
  });

  if (insert.error || !insert.data || insert.data.length === 0) {
    throw new OAuthClientError('server_error', 'Failed to persist registered OAuth client', 500);
  }

  return insert.data[0];
}

const cimdDocumentSchema = z.object({
  client_id: z.string().url(),
  client_name: z.string().trim().min(1).max(120),
  redirect_uris: z.array(z.string().trim().min(1)).min(1).max(MAX_REDIRECT_URIS),
  client_uri: z.string().optional(),
  logo_uri: z.string().optional(),
  token_endpoint_auth_method: z.string().optional(),
});

export async function resolveOAuthClient(
  clientId: string,
  db: SupabaseAdminClient,
  options: {
    fetchImpl?: typeof fetch;
    dnsLookup?: (hostname: string) => Promise<Array<{ address: string }>>;
  } = {},
): Promise<OAuthClientRecord | null> {
  if (!clientId || clientId.length > 512) return null;

  const existingRes = await db.rest<OAuthClientRecord[]>(
    `mcp_oauth_clients?client_id=eq.${encodeURIComponent(clientId)}&select=*`,
  );
  const existing = existingRes.data?.[0] ?? null;

  if (!clientId.startsWith('https://')) {
    return existing;
  }

  if (existing && existing.is_cimd && existing.cimd_cached_until) {
    if (new Date(existing.cimd_cached_until).getTime() > Date.now()) {
      return existing;
    }
  }

  const safeUrl = await assertPublicFetchableHttpsUrl(clientId, options.dnsLookup).catch(() => null);
  if (!safeUrl) {
    throw new OAuthClientError('invalid_client', 'CIMD client_id URL rejected by SSRF policy', 400);
  }

  const fetchFn = options.fetchImpl ?? fetch;
  let resp: Response;
  try {
    resp = await fetchFn(safeUrl.toString(), {
      method: 'GET',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    throw new OAuthClientError('invalid_client', 'Failed to fetch CIMD metadata document', 400);
  }

  if (!resp.ok) {
    throw new OAuthClientError('invalid_client', `CIMD metadata fetch returned ${resp.status}`, 400);
  }

  const rawText = await resp.text();
  if (Buffer.byteLength(rawText, 'utf8') > 16 * 1024) {
    throw new OAuthClientError('invalid_client', 'CIMD metadata document exceeds 16 KB limit', 400);
  }

  let jsonDoc: unknown;
  try {
    jsonDoc = JSON.parse(rawText);
  } catch {
    throw new OAuthClientError('invalid_client', 'CIMD metadata is not valid JSON', 400);
  }

  const parsedDoc = cimdDocumentSchema.safeParse(jsonDoc);
  if (!parsedDoc.success || parsedDoc.data.client_id !== clientId) {
    throw new OAuthClientError('invalid_client', 'CIMD document client_id mismatch or invalid schema', 400);
  }

  if (parsedDoc.data.token_endpoint_auth_method && parsedDoc.data.token_endpoint_auth_method !== 'none') {
    throw new OAuthClientError('invalid_client', 'CIMD clients must use token_endpoint_auth_method=none', 400);
  }

  const validUris: string[] = [];
  for (const uri of parsedDoc.data.redirect_uris) {
    const valid = validateRedirectUri(uri);
    if (!valid) {
      throw new OAuthClientError('invalid_redirect_uri', `Invalid CIMD redirect_uri: ${uri}`, 400);
    }
    if (!validUris.includes(valid)) validUris.push(valid);
  }

  const cachedUntil = new Date(Date.now() + 3600_000).toISOString();
  const cimdRecord: OAuthClientRecord = {
    client_id: clientId,
    client_name: parsedDoc.data.client_name,
    client_uri: optionalHttpOrHttpsUrl(parsedDoc.data.client_uri),
    logo_uri: optionalHttpOrHttpsUrl(parsedDoc.data.logo_uri),
    redirect_uris: validUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    is_cimd: true,
    cimd_cached_until: cachedUntil,
  };

  await db.rest('mcp_oauth_clients', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: cimdRecord,
  });

  return cimdRecord;
}
