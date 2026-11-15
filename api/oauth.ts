import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getServerEnv, type ServerEnv } from './_lib/env';
import {
  MAX_REDIRECT_URIS,
  OAuthClientError,
  registerDynamicClient,
  resolveOAuthClient,
  type OAuthClientRecord,
} from './_lib/oauth/clients';
import {
  generateOpaqueToken,
  sha256Hex,
  signMcpAccessToken,
  verifyMcpAccessToken,
  verifyPkceS256,
} from './_lib/oauth/crypto';
import {
  MCP_READ_SCOPES,
  enforceReadOnlyScopes,
  filterValidMcpScopes,
  normalizeCanonicalResource,
} from './_lib/oauth/scopes';
import {
  PayloadTooLargeError,
  applySecurityHeaders,
  getClientIp,
  isAllowedCorsOrigin,
  isLocalhostHostname,
  jsonResponse,
  readTextBodyWithLimit,
} from './_lib/security';
import { getSupabaseAdmin, type SupabaseAdminClient } from './_lib/supabase-admin';

const MAX_ACTIVE_GRANTS_PER_USER = 5;
const MAX_STATE_LENGTH = 4096;
const AUTH_CODE_TTL_MS = 60_000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OAUTH_BODY_LIMIT_BYTES = 16 * 1024;
const PKCE_CHALLENGE_RE = /^[A-Za-z0-9\-_]{43,128}$/;

interface OAuthGrantRow {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  scopes: string[];
  read_only: boolean;
  resource: string;
  aal2_verified_at: string | null;
  revoked_at: string | null;
}

interface OAuthCodeRow {
  code_hash: string;
  grant_id: string;
  user_id: string;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  code_challenge: string;
  code_challenge_method: string;
  resource: string;
  expires_at: string;
  used_at: string | null;
}

interface RefreshTokenRow {
  token_hash: string;
  grant_id: string;
  user_id: string;
  client_id: string;
  family_id: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

function resolveRouteSegment(url: URL): string {
  const explicit = url.searchParams.get('route');
  if (explicit) return explicit.replace(/^\/+|\/+$/g, '');
  const match = url.pathname.match(/\/oauth\/(.+)$/);
  return match ? match[1].replace(/^\/+|\/+$/g, '') : '';
}

function isResourceValid(rawResource: string | null | undefined, env: ServerEnv): boolean {
  if (!rawResource) return true;
  const normalized = normalizeCanonicalResource(rawResource, env.mcpResource);
  return normalized === env.mcpResource || normalized === env.mcpIssuer;
}

function parseFormOrJsonBody(rawText: string, contentType: string | null): Record<string, unknown> {
  if (!rawText.trim()) return {};
  if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawText);
    const out: Record<string, unknown> = {};
    for (const [k, v] of params.entries()) {
      out[k] = v;
    }
    return out;
  }
  const parsed = JSON.parse(rawText) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_BODY');
  }
  return parsed as Record<string, unknown>;
}

function isRedirectUriAuthorized(client: OAuthClientRecord, redirectUri: string): boolean {
  try {
    const normalizedInput = new URL(redirectUri).toString();
    return client.redirect_uris.some((allowed) => allowed === redirectUri || allowed === normalizedInput);
  } catch {
    return false;
  }
}

async function isUserMcpEnabled(db: SupabaseAdminClient, userId: string): Promise<boolean> {
  const res = await db.rest<Array<{ mcp_enabled?: boolean }>>(
    `user_settings?user_id=eq.${encodeURIComponent(userId)}&select=mcp_enabled`,
  );
  const row = res.data?.[0];
  return row?.mcp_enabled !== false;
}

async function revokeRefreshFamilyAndGrant(
  db: SupabaseAdminClient,
  familyId: string,
  grantId: string,
): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.rest(
    `mcp_refresh_tokens?family_id=eq.${encodeURIComponent(familyId)}&revoked_at=is.null`,
    { method: 'PATCH', body: { revoked_at: nowIso } },
  );
  await db.rest(
    `mcp_oauth_grants?id=eq.${encodeURIComponent(grantId)}&revoked_at=is.null`,
    { method: 'PATCH', body: { revoked_at: nowIso, updated_at: nowIso } },
  );
}

async function handleRegister(request: Request, corsOrigin: string | null, db: SupabaseAdminClient): Promise<Response> {
  let rawText: string;
  try {
    rawText = await readTextBodyWithLimit(request, OAUTH_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return jsonResponse({ error: 'invalid_client_metadata', error_description: 'Payload too large' }, 413, corsOrigin);
    }
    throw error;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return jsonResponse({ error: 'invalid_client_metadata', error_description: 'Invalid JSON body' }, 400, corsOrigin);
  }

  try {
    const client = await registerDynamicClient(body, getClientIp(request), db);
    return jsonResponse(
      {
        client_id: client.client_id,
        client_name: client.client_name,
        client_uri: client.client_uri ?? undefined,
        logo_uri: client.logo_uri ?? undefined,
        redirect_uris: client.redirect_uris.slice(0, MAX_REDIRECT_URIS),
        grant_types: client.grant_types,
        response_types: client.response_types,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
      },
      201,
      corsOrigin,
    );
  } catch (error) {
    if (error instanceof OAuthClientError) {
      return jsonResponse({ error: error.oauthError, error_description: error.message }, error.status, corsOrigin);
    }
    throw error;
  }
}

async function handleAuthorize(url: URL, corsOrigin: string | null, env: ServerEnv, db: SupabaseAdminClient): Promise<Response> {
  const clientId = url.searchParams.get('client_id') ?? '';
  const redirectUri = url.searchParams.get('redirect_uri') ?? '';
  const responseType = url.searchParams.get('response_type') ?? '';
  const state = url.searchParams.get('state') ?? '';
  const codeChallenge = url.searchParams.get('code_challenge') ?? '';
  const codeChallengeMethod = url.searchParams.get('code_challenge_method') ?? '';
  const resourceParam = url.searchParams.get('resource');
  const scopeParam = url.searchParams.get('scope') ?? '';

  let client: OAuthClientRecord | null = null;
  try {
    client = await resolveOAuthClient(clientId, db);
  } catch (error) {
    if (error instanceof OAuthClientError) {
      return jsonResponse({ error: error.oauthError, error_description: error.message }, error.status, corsOrigin);
    }
    throw error;
  }

  if (!client || !redirectUri || !isRedirectUriAuthorized(client, redirectUri)) {
    return jsonResponse(
      { error: 'invalid_request', error_description: 'Unknown client_id or unauthorized redirect_uri' },
      400,
      corsOrigin,
    );
  }

  const redirectError = (code: string, desc: string): Response => {
    const target = new URL(redirectUri);
    target.searchParams.set('error', code);
    target.searchParams.set('error_description', desc);
    if (state && state.length <= MAX_STATE_LENGTH) {
      target.searchParams.set('state', state);
    }
    target.searchParams.set('iss', env.mcpIssuer);
    const headers = new Headers({ Location: target.toString() });
    applySecurityHeaders(headers, corsOrigin);
    return new Response(null, { status: 302, headers });
  };

  if (responseType !== 'code') {
    return redirectError('unsupported_response_type', 'Only response_type=code is supported');
  }
  if (!state || state.length > MAX_STATE_LENGTH) {
    return redirectError('invalid_request', 'Missing or oversized state parameter');
  }
  if (!PKCE_CHALLENGE_RE.test(codeChallenge) || codeChallengeMethod !== 'S256') {
    return redirectError('invalid_request', 'PKCE code_challenge_method=S256 is required');
  }
  if (!isResourceValid(resourceParam, env)) {
    return redirectError('invalid_target', 'Requested resource does not match Finance Pal MCP endpoint');
  }

  const requestedScopes = filterValidMcpScopes(scopeParam.split(/\s+/).filter(Boolean));
  const finalRequestedScopes = requestedScopes.length > 0 ? requestedScopes : [...MCP_READ_SCOPES];

  const consentUrl = new URL('/oauth/consent', env.mcpIssuer);
  consentUrl.searchParams.set('client_id', client.client_id);
  consentUrl.searchParams.set('client_name', client.client_name);
  consentUrl.searchParams.set('redirect_uri', redirectUri);
  consentUrl.searchParams.set('state', state);
  consentUrl.searchParams.set('code_challenge', codeChallenge);
  consentUrl.searchParams.set('code_challenge_method', 'S256');
  consentUrl.searchParams.set('resource', env.mcpResource);
  consentUrl.searchParams.set('scope', finalRequestedScopes.join(' '));
  if (client.client_uri) consentUrl.searchParams.set('client_uri', client.client_uri);
  if (client.logo_uri) consentUrl.searchParams.set('logo_uri', client.logo_uri);

  const headers = new Headers({ Location: consentUrl.toString() });
  applySecurityHeaders(headers, corsOrigin);
  return new Response(null, { status: 302, headers });
}

const consentDecisionSchema = z.object({
  decision: z.enum(['approve', 'deny']),
  client_id: z.string().min(1).max(512),
  redirect_uri: z.string().url(),
  state: z.string().min(1).max(MAX_STATE_LENGTH),
  code_challenge: z.string().regex(PKCE_CHALLENGE_RE),
  code_challenge_method: z.literal('S256'),
  resource: z.string().optional(),
  read_only: z.boolean().default(true),
  scopes: z.array(z.string()).default([]),
});

async function handleConsentDecision(
  request: Request,
  originHeader: string | null,
  env: ServerEnv,
  db: SupabaseAdminClient,
): Promise<Response> {
  // Strictly restrict consent decisions to same-origin Finance Pal UI (or localhost dev)
  let sameOriginCors: string | null = null;
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      const isSameIssuer = originUrl.origin === env.mcpIssuer;
      const isDevLocal =
        env.allowLocalhostOrigins && originUrl.protocol === 'http:' && isLocalhostHostname(originUrl.hostname);
      if (!isSameIssuer && !isDevLocal) {
        return jsonResponse({ error: 'forbidden_origin' }, 403, null);
      }
      sameOriginCors = originUrl.origin;
    } catch {
      return jsonResponse({ error: 'forbidden_origin' }, 403, null);
    }
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) {
    return jsonResponse({ error: 'unauthorized', error_description: 'Missing Supabase session token' }, 401, sameOriginCors);
  }

  const user = await db.verifySupabaseUserAccessToken(bearerMatch[1].trim());
  if (!user) {
    return jsonResponse({ error: 'unauthorized', error_description: 'Invalid Supabase session token' }, 401, sameOriginCors);
  }

  if (user.hasVerifiedMfaFactor && user.aal !== 'aal2') {
    return jsonResponse(
      { error: 'mfa_aal2_required', error_description: 'Multi-factor AAL2 verification required' },
      403,
      sameOriginCors,
    );
  }

  let rawText: string;
  try {
    rawText = await readTextBodyWithLimit(request, OAUTH_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return jsonResponse({ error: 'invalid_request', error_description: 'Payload too large' }, 413, sameOriginCors);
    }
    throw error;
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawText);
  } catch {
    return jsonResponse({ error: 'invalid_request', error_description: 'Invalid JSON body' }, 400, sameOriginCors);
  }

  const decisionParsed = consentDecisionSchema.safeParse(parsedBody);
  if (!decisionParsed.success) {
    return jsonResponse({ error: 'invalid_request', error_description: 'Invalid consent payload' }, 400, sameOriginCors);
  }

  const input = decisionParsed.data;
  if (!isResourceValid(input.resource, env)) {
    return jsonResponse({ error: 'invalid_target', error_description: 'Invalid target resource' }, 400, sameOriginCors);
  }

  const client = await resolveOAuthClient(input.client_id, db);
  if (!client || !isRedirectUriAuthorized(client, input.redirect_uri)) {
    return jsonResponse({ error: 'invalid_client', error_description: 'Unauthorized client or redirect_uri' }, 400, sameOriginCors);
  }

  if (input.decision === 'deny') {
    const denyTarget = new URL(input.redirect_uri);
    denyTarget.searchParams.set('error', 'access_denied');
    denyTarget.searchParams.set('state', input.state);
    denyTarget.searchParams.set('iss', env.mcpIssuer);
    return jsonResponse({ redirectTo: denyTarget.toString() }, 200, sameOriginCors);
  }

  const activeGrantsRes = await db.rest<Array<{ id: string }>>(
    `mcp_oauth_grants?user_id=eq.${encodeURIComponent(user.id)}&revoked_at=is.null&select=id`,
  );
  if ((activeGrantsRes.data?.length ?? 0) >= MAX_ACTIVE_GRANTS_PER_USER) {
    return jsonResponse(
      {
        error: 'max_connectors_reached',
        max: MAX_ACTIVE_GRANTS_PER_USER,
        error_description: 'Has alcanzado el límite de 5 conectores activos. Revoca uno en Ajustes antes de autorizar otro.',
      },
      409,
      sameOriginCors,
    );
  }

  const finalScopes = enforceReadOnlyScopes(filterValidMcpScopes(input.scopes), input.read_only);
  const nowIso = new Date().toISOString();

  const grantRes = await db.rest<OAuthGrantRow[]>('mcp_oauth_grants', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      user_id: user.id,
      client_id: client.client_id,
      client_name: client.client_name,
      scopes: finalScopes,
      read_only: input.read_only,
      resource: env.mcpResource,
      aal2_verified_at: user.aal === 'aal2' ? nowIso : null,
    },
  });

  const grant = grantRes.data?.[0];
  if (grantRes.error || !grant) {
    return jsonResponse({ error: 'server_error', error_description: 'Failed to create OAuth grant' }, 500, sameOriginCors);
  }

  const rawCode = generateOpaqueToken(32);
  const codeHash = sha256Hex(rawCode);
  const codeExpiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();

  const codeRes = await db.rest('mcp_oauth_codes', {
    method: 'POST',
    body: {
      code_hash: codeHash,
      grant_id: grant.id,
      user_id: user.id,
      client_id: client.client_id,
      redirect_uri: input.redirect_uri,
      scopes: finalScopes,
      code_challenge: input.code_challenge,
      code_challenge_method: 'S256',
      resource: env.mcpResource,
      expires_at: codeExpiresAt,
    },
  });

  if (codeRes.error) {
    return jsonResponse({ error: 'server_error', error_description: 'Failed to store authorization code' }, 500, sameOriginCors);
  }

  const approveTarget = new URL(input.redirect_uri);
  approveTarget.searchParams.set('code', rawCode);
  approveTarget.searchParams.set('state', input.state);
  approveTarget.searchParams.set('iss', env.mcpIssuer);

  return jsonResponse({ redirectTo: approveTarget.toString() }, 200, sameOriginCors);
}

async function handleToken(
  request: Request,
  corsOrigin: string | null,
  env: ServerEnv,
  db: SupabaseAdminClient,
): Promise<Response> {
  const rate = await db.rpc<{ allowed: boolean }>('mcp_check_rate_limit', {
    p_key: `oauth_token:${getClientIp(request)}`,
    p_window_seconds: 60,
    p_max_requests: 60,
  });
  if (rate.data && rate.data.allowed === false) {
    return jsonResponse({ error: 'too_many_requests', error_description: 'Rate limit exceeded' }, 429, corsOrigin);
  }

  let rawText: string;
  try {
    rawText = await readTextBodyWithLimit(request, OAUTH_BODY_LIMIT_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return jsonResponse({ error: 'invalid_request', error_description: 'Payload too large' }, 413, corsOrigin);
    }
    throw error;
  }

  let body: Record<string, unknown>;
  try {
    body = parseFormOrJsonBody(rawText, request.headers.get('content-type'));
  } catch {
    return jsonResponse({ error: 'invalid_request', error_description: 'Malformed request body' }, 400, corsOrigin);
  }

  const grantType = typeof body.grant_type === 'string' ? body.grant_type : '';
  const clientId = typeof body.client_id === 'string' ? body.client_id : '';
  const resourceParam = typeof body.resource === 'string' ? body.resource : undefined;

  if (!clientId) {
    return jsonResponse({ error: 'invalid_request', error_description: 'client_id is required' }, 400, corsOrigin);
  }

  if (grantType === 'authorization_code') {
    const code = typeof body.code === 'string' ? body.code : '';
    const redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri : '';
    const codeVerifier = typeof body.code_verifier === 'string' ? body.code_verifier : '';

    if (!code || !redirectUri || !codeVerifier) {
      return jsonResponse({ error: 'invalid_request', error_description: 'Missing authorization code parameters' }, 400, corsOrigin);
    }

    const nowIso = new Date().toISOString();
    const codeHash = sha256Hex(code);
    const consumeRes = await db.rest<OAuthCodeRow[]>(
      `mcp_oauth_codes?code_hash=eq.${codeHash}&used_at=is.null&expires_at=gt.${encodeURIComponent(nowIso)}`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: { used_at: nowIso },
      },
    );

    const codeRow = consumeRes.data?.[0];
    if (!codeRow) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'Authorization code is invalid, expired, or already used' }, 400, corsOrigin);
    }

    if (
      codeRow.client_id !== clientId ||
      codeRow.redirect_uri !== redirectUri ||
      (resourceParam && normalizeCanonicalResource(resourceParam, env.mcpResource) !== codeRow.resource) ||
      !verifyPkceS256(codeVerifier, codeRow.code_challenge)
    ) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'PKCE or binding validation failed' }, 400, corsOrigin);
    }

    const grantRes = await db.rest<OAuthGrantRow[]>(
      `mcp_oauth_grants?id=eq.${encodeURIComponent(codeRow.grant_id)}&revoked_at=is.null&select=*`,
    );
    const grant = grantRes.data?.[0];
    if (!grant || !(await isUserMcpEnabled(db, grant.user_id))) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'Connector grant is revoked or disabled' }, 400, corsOrigin);
    }

    const familyId = randomUUID();
    const rawRefresh = generateOpaqueToken(32);
    await db.rest('mcp_refresh_tokens', {
      method: 'POST',
      body: {
        token_hash: sha256Hex(rawRefresh),
        grant_id: grant.id,
        user_id: grant.user_id,
        client_id: grant.client_id,
        family_id: familyId,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
      },
    });

    const effectiveScopes = enforceReadOnlyScopes(filterValidMcpScopes(grant.scopes), grant.read_only);
    const jwt = await signMcpAccessToken(
      {
        sub: grant.user_id,
        grantId: grant.id,
        clientId: grant.client_id,
        scopes: effectiveScopes,
        resource: grant.resource,
        aal: grant.aal2_verified_at ? 'aal2' : 'aal1',
      },
      env,
    );

    return jsonResponse(
      {
        access_token: jwt.token,
        token_type: 'Bearer',
        expires_in: jwt.expiresIn,
        refresh_token: rawRefresh,
        scope: effectiveScopes.join(' '),
      },
      200,
      corsOrigin,
    );
  }

  if (grantType === 'refresh_token') {
    const rawRefresh = typeof body.refresh_token === 'string' ? body.refresh_token : '';
    if (!rawRefresh) {
      return jsonResponse({ error: 'invalid_request', error_description: 'refresh_token is required' }, 400, corsOrigin);
    }

    const tokenHash = sha256Hex(rawRefresh);
    const lookupRes = await db.rest<RefreshTokenRow[]>(
      `mcp_refresh_tokens?token_hash=eq.${tokenHash}&select=*`,
    );
    const existing = lookupRes.data?.[0];
    if (!existing) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'Unknown refresh token' }, 400, corsOrigin);
    }

    // Reuse detection: if token was already used or revoked, nuke entire family and grant!
    if (existing.used_at !== null || existing.revoked_at !== null) {
      await revokeRefreshFamilyAndGrant(db, existing.family_id, existing.grant_id);
      return jsonResponse(
        { error: 'invalid_grant', error_description: 'Refresh token reuse detected; connector revoked' },
        400,
        corsOrigin,
      );
    }

    if (
      existing.client_id !== clientId ||
      new Date(existing.expires_at).getTime() <= Date.now()
    ) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'Refresh token expired or client mismatch' }, 400, corsOrigin);
    }

    const nowIso = new Date().toISOString();
    const markUsedRes = await db.rest<RefreshTokenRow[]>(
      `mcp_refresh_tokens?token_hash=eq.${tokenHash}&used_at=is.null&revoked_at=is.null`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: { used_at: nowIso },
      },
    );
    if (!markUsedRes.data || markUsedRes.data.length === 0) {
      await revokeRefreshFamilyAndGrant(db, existing.family_id, existing.grant_id);
      return jsonResponse(
        { error: 'invalid_grant', error_description: 'Concurrent refresh token reuse detected' },
        400,
        corsOrigin,
      );
    }

    const grantRes = await db.rest<OAuthGrantRow[]>(
      `mcp_oauth_grants?id=eq.${encodeURIComponent(existing.grant_id)}&revoked_at=is.null&select=*`,
    );
    const grant = grantRes.data?.[0];
    if (
      !grant ||
      (resourceParam && normalizeCanonicalResource(resourceParam, env.mcpResource) !== grant.resource) ||
      !(await isUserMcpEnabled(db, grant.user_id))
    ) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'Grant is revoked or disabled' }, 400, corsOrigin);
    }

    const nextRefresh = generateOpaqueToken(32);
    await db.rest('mcp_refresh_tokens', {
      method: 'POST',
      body: {
        token_hash: sha256Hex(nextRefresh),
        grant_id: grant.id,
        user_id: grant.user_id,
        client_id: grant.client_id,
        family_id: existing.family_id,
        parent_token_hash: tokenHash,
        expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
      },
    });

    const effectiveScopes = enforceReadOnlyScopes(filterValidMcpScopes(grant.scopes), grant.read_only);
    const jwt = await signMcpAccessToken(
      {
        sub: grant.user_id,
        grantId: grant.id,
        clientId: grant.client_id,
        scopes: effectiveScopes,
        resource: grant.resource,
        aal: grant.aal2_verified_at ? 'aal2' : 'aal1',
      },
      env,
    );

    return jsonResponse(
      {
        access_token: jwt.token,
        token_type: 'Bearer',
        expires_in: jwt.expiresIn,
        refresh_token: nextRefresh,
        scope: effectiveScopes.join(' '),
      },
      200,
      corsOrigin,
    );
  }

  return jsonResponse({ error: 'unsupported_grant_type' }, 400, corsOrigin);
}

async function handleRevoke(
  request: Request,
  corsOrigin: string | null,
  env: ServerEnv,
  db: SupabaseAdminClient,
): Promise<Response> {
  let rawText: string;
  try {
    rawText = await readTextBodyWithLimit(request, 8 * 1024);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return jsonResponse({ error: 'invalid_request' }, 413, corsOrigin);
    }
    throw error;
  }

  let token = '';
  try {
    const body = parseFormOrJsonBody(rawText, request.headers.get('content-type'));
    if (typeof body.token === 'string') token = body.token.trim();
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400, corsOrigin);
  }

  if (token) {
    const tokenHash = sha256Hex(token);
    const refreshRes = await db.rest<RefreshTokenRow[]>(
      `mcp_refresh_tokens?token_hash=eq.${tokenHash}&select=grant_id,family_id`,
    );
    const refreshRow = refreshRes.data?.[0];
    if (refreshRow) {
      await revokeRefreshFamilyAndGrant(db, refreshRow.family_id, refreshRow.grant_id);
    } else {
      try {
        const verified = await verifyMcpAccessToken(token, env);
        const nowIso = new Date().toISOString();
        await db.rest(
          `mcp_oauth_grants?id=eq.${encodeURIComponent(verified.grantId)}&revoked_at=is.null`,
          { method: 'PATCH', body: { revoked_at: nowIso, updated_at: nowIso } },
        );
      } catch {
        // RFC 7009: invalid/unknown token still returns 200 OK
      }
    }
  }

  return jsonResponse({ revoked: true }, 200, corsOrigin);
}

export async function handleOAuthRequest(request: Request): Promise<Response> {
  const env = getServerEnv();
  const db = getSupabaseAdmin();
  const corsOrigin = isAllowedCorsOrigin(request.headers.get('origin'), env);

  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    applySecurityHeaders(headers, corsOrigin, 'GET, POST, OPTIONS');
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url, env.mcpIssuer);
  const route = resolveRouteSegment(url);

  if (route === 'register' && request.method === 'POST') {
    return handleRegister(request, corsOrigin, db);
  }
  if (route === 'authorize' && request.method === 'GET') {
    return handleAuthorize(url, corsOrigin, env, db);
  }
  if (route === 'consent-decision' && request.method === 'POST') {
    return handleConsentDecision(request, request.headers.get('origin'), env, db);
  }
  if (route === 'token' && request.method === 'POST') {
    return handleToken(request, corsOrigin, env, db);
  }
  if (route === 'revoke' && request.method === 'POST') {
    return handleRevoke(request, corsOrigin, env, db);
  }

  return jsonResponse({ error: 'not_found' }, 404, corsOrigin);
}

export default {
  fetch: handleOAuthRequest,
};
