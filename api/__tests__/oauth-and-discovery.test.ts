// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnvCacheForTests } from '../_lib/env.js';
import {
  registerDynamicClient,
  resolveOAuthClient,
  OAuthClientError,
} from '../_lib/oauth/clients.js';
import {
  sha256Base64Url,
  signMcpAccessToken,
  verifyMcpAccessToken,
  verifyPkceS256,
} from '../_lib/oauth/crypto.js';
import {
  assertPublicFetchableHttpsUrl,
  isAllowedCorsOrigin,
} from '../_lib/security.js';
import {
  setSupabaseAdminForTests,
  type SupabaseAdminClient,
  type VerifiedSupabaseUser,
} from '../_lib/supabase-admin.js';
import { handleWellKnownRequest } from '../well-known.js';
import { handleOAuthRequest } from '../oauth.js';

interface MockDbState {
  clients: Array<Record<string, unknown>>;
  grants: Array<Record<string, unknown>>;
  codes: Array<Record<string, unknown>>;
  refreshTokens: Array<Record<string, unknown>>;
  userSettings: Array<{ user_id: string; mcp_enabled: boolean }>;
  verifiedUsers: Map<string, VerifiedSupabaseUser>;
  rateAllowed: boolean;
}

function createInMemorySupabaseAdmin(state: MockDbState): SupabaseAdminClient {
  function filterRows(table: string, query: URLSearchParams): Array<Record<string, unknown>> {
    let rows: Array<Record<string, unknown>> = [];
    if (table === 'mcp_oauth_clients') rows = state.clients;
    else if (table === 'mcp_oauth_grants') rows = state.grants;
    else if (table === 'mcp_oauth_codes') rows = state.codes;
    else if (table === 'mcp_refresh_tokens') rows = state.refreshTokens;
    else if (table === 'user_settings') rows = state.userSettings as Array<Record<string, unknown>>;

    return rows.filter((row) => {
      for (const [k, rawVal] of query.entries()) {
        if (k === 'select') continue;
        if (rawVal === 'is.null') {
          if (row[k] !== null && row[k] !== undefined) return false;
        } else if (rawVal.startsWith('eq.')) {
          if (String(row[k] ?? '') !== rawVal.slice(3)) return false;
        } else if (rawVal.startsWith('gt.')) {
          if (String(row[k] ?? '') <= rawVal.slice(3)) return false;
        }
      }
      return true;
    });
  }

  return {
    async rest<T>(
      pathWithQuery: string,
      init: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
    ) {
      const [table, qs = ''] = pathWithQuery.split('?');
      const params = new URLSearchParams(qs);
      const method = init.method ?? 'GET';

      if (method === 'GET') {
        return { data: filterRows(table, params) as T, error: null, status: 200 };
      }

      if (method === 'POST') {
        const body = { ...(init.body as Record<string, unknown>) };
        if (table === 'mcp_oauth_grants' && !body.id) {
          body.id = randomUUID();
        }
        if (table === 'mcp_oauth_clients') {
          const idx = state.clients.findIndex((c) => c.client_id === body.client_id);
          if (idx >= 0) state.clients[idx] = body;
          else state.clients.push(body);
        } else if (table === 'mcp_oauth_grants') {
          state.grants.push({ revoked_at: null, aal2_verified_at: null, ...body });
        } else if (table === 'mcp_oauth_codes') {
          state.codes.push({ used_at: null, ...body });
        } else if (table === 'mcp_refresh_tokens') {
          state.refreshTokens.push({ used_at: null, revoked_at: null, ...body });
        }
        return { data: [body] as T, error: null, status: 201 };
      }

      if (method === 'PATCH') {
        const matched = filterRows(table, params);
        const patch = init.body as Record<string, unknown>;
        for (const row of matched) {
          Object.assign(row, patch);
        }
        return { data: matched as T, error: null, status: 200 };
      }

      return { data: null, error: { message: 'Unsupported' }, status: 400 };
    },

    async rpc<T>(fnName: string) {
      if (fnName === 'mcp_check_rate_limit') {
        return {
          data: { allowed: state.rateAllowed, remaining: state.rateAllowed ? 9 : 0 } as T,
          error: null,
          status: 200,
        };
      }
      return { data: null, error: null, status: 200 };
    },

    async verifySupabaseUserAccessToken(token: string) {
      return state.verifiedUsers.get(token) ?? null;
    },
  };
}

describe('Phase 2: Discovery, Security Guards & OAuth 2.1 + PKCE + DCR/CIMD', () => {
  let dbState: MockDbState;
  const prevEnv = { ...process.env };

  beforeEach(() => {
    resetServerEnvCacheForTests();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-secret-value-2026';
    process.env.SUPABASE_ANON_KEY = 'anon-key-secret-value-2026';
    process.env.MCP_JWT_SIGNING_KEY = 'super-secret-jwt-signing-key-32bytes!';
    process.env.MCP_ISSUER = 'https://finance-pal.app';
    process.env.MCP_ALLOW_LOCALHOST = '1';

    dbState = {
      clients: [],
      grants: [],
      codes: [],
      refreshTokens: [],
      userSettings: [],
      verifiedUsers: new Map([
        ['sb-jwt-aal2', { id: 'user-1', aal: 'aal2', hasVerifiedMfaFactor: true }],
        ['sb-jwt-aal1-mfa', { id: 'user-1', aal: 'aal1', hasVerifiedMfaFactor: true }],
        ['sb-jwt-no-mfa', { id: 'user-2', aal: 'aal1', hasVerifiedMfaFactor: false }],
      ]),
      rateAllowed: true,
    };
    setSupabaseAdminForTests(createInMemorySupabaseAdmin(dbState));
  });

  afterEach(() => {
    setSupabaseAdminForTests(null);
    resetServerEnvCacheForTests();
    process.env = { ...prevEnv };
  });

  it('serves RFC 9728 Protected Resource and RFC 8414 Authorization Server metadata', async () => {
    const prRes = await handleWellKnownRequest(
      new Request('https://finance-pal.app/.well-known/oauth-protected-resource'),
    );
    expect(prRes.status).toBe(200);
    const prJson = (await prRes.json()) as Record<string, unknown>;
    expect(prJson.resource).toBe('https://finance-pal.app/mcp');
    expect(prJson.authorization_servers).toEqual(['https://finance-pal.app']);

    const asRes = await handleWellKnownRequest(
      new Request('https://finance-pal.app/api/well-known?kind=authorization-server'),
    );
    expect(asRes.status).toBe(200);
    const asJson = (await asRes.json()) as Record<string, unknown>;
    expect(asJson.issuer).toBe('https://finance-pal.app');
    expect(asJson.code_challenge_methods_supported).toEqual(['S256']);
    expect(asJson.client_id_metadata_document_supported).toBe(true);
    expect(asJson.authorization_response_iss_parameter_supported).toBe(true);
  });

  it('enforces exact CORS Origin allowlist and SSRF DNS/IP protections', async () => {
    const env = { mcpIssuer: 'https://finance-pal.app', allowLocalhostOrigins: false };
    expect(isAllowedCorsOrigin('https://claude.ai', env)).toBe('https://claude.ai');
    expect(isAllowedCorsOrigin('https://chatgpt.com', env)).toBe('https://chatgpt.com');
    expect(isAllowedCorsOrigin('https://gemini.google.com', env)).toBe('https://gemini.google.com');
    expect(isAllowedCorsOrigin('https://claude.ai.evil.com', env)).toBeNull();
    expect(isAllowedCorsOrigin('http://localhost:8080', env)).toBeNull();

    await expect(assertPublicFetchableHttpsUrl('http://127.0.0.1/meta.json')).rejects.toThrow('HTTPS_REQUIRED');
    await expect(assertPublicFetchableHttpsUrl('https://169.254.169.254/latest')).rejects.toThrow('SSRF_IP_BLOCKED');
    await expect(assertPublicFetchableHttpsUrl('https://localhost/client.json')).rejects.toThrow('SSRF_HOST_BLOCKED');
    await expect(
      assertPublicFetchableHttpsUrl('https://rebind.attacker.example/client.json', async () => [
        { address: '192.168.1.50' },
      ]),
    ).rejects.toThrow('SSRF_DNS_IP_BLOCKED');
  });

  it('verifies PKCE S256 strictly and signs/verifies MCP JWT bound to aud', async () => {
    const verifier = 'a'.repeat(43);
    const challenge = sha256Base64Url(verifier);
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
    expect(verifyPkceS256('b'.repeat(43), challenge)).toBe(false);
    expect(verifyPkceS256('short', challenge)).toBe(false);

    const { token } = await signMcpAccessToken(
      {
        sub: 'user-1',
        grantId: 'grant-1',
        clientId: 'fp_dcr_123',
        scopes: ['mcp:read:overview'],
        resource: 'https://finance-pal.app/mcp',
        aal: 'aal2',
      },
      { mcpIssuer: 'https://finance-pal.app', mcpJwtSecret: 'super-secret-jwt-signing-key-32bytes!' },
    );

    const verified = await verifyMcpAccessToken(token, {
      mcpIssuer: 'https://finance-pal.app',
      mcpResource: 'https://finance-pal.app/mcp',
      mcpJwtSecret: 'super-secret-jwt-signing-key-32bytes!',
    });
    expect(verified.sub).toBe('user-1');
    expect(verified.aal).toBe('aal2');

    await expect(
      verifyMcpAccessToken(token, {
        mcpIssuer: 'https://finance-pal.app',
        mcpResource: 'https://other-server.example/mcp',
        mcpJwtSecret: 'super-secret-jwt-signing-key-32bytes!',
      }),
    ).rejects.toThrow();
  });

  it('registers DCR clients up to 12 redirect URIs (Gemini 6 URIs) and resolves CIMD securely', async () => {
    const db = createInMemorySupabaseAdmin(dbState);
    const geminiRedirects = Array.from({ length: 6 }, (_, i) => `https://gemini.google.com/callback/${i}`);

    const created = await registerDynamicClient(
      {
        client_name: 'Google Gemini Connected Apps',
        redirect_uris: geminiRedirects,
        token_endpoint_auth_method: 'none',
      },
      '203.0.113.10',
      db,
    );
    expect(created.client_id).toMatch(/^fp_dcr_/);
    expect(created.redirect_uris).toHaveLength(6);

    const tooMany = Array.from({ length: 13 }, (_, i) => `https://example.com/cb/${i}`);
    await expect(
      registerDynamicClient({ client_name: 'Too Many', redirect_uris: tooMany }, '203.0.113.10', db),
    ).rejects.toThrow(OAuthClientError);

    const cimdUrl = 'https://claude.ai/oauth/mcp-client.json';
    const cimdFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          client_id: cimdUrl,
          client_name: 'Claude Official',
          redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
          token_endpoint_auth_method: 'none',
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const cimdClient = await resolveOAuthClient(cimdUrl, db, {
      fetchImpl: cimdFetch,
      dnsLookup: async () => [{ address: '104.18.10.10' }],
    });
    expect(cimdClient?.client_name).toBe('Claude Official');
    expect(cimdClient?.is_cimd).toBe(true);
  });

  it('completes OAuth 2.1 + PKCE flow with 3000-char state, MFA check, RFC 9207 iss, and refresh reuse revocation', async () => {
    // 1. Register DCR client
    const regRes = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Claude Web',
          redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        }),
      }),
    );
    expect(regRes.status).toBe(201);
    const { client_id } = (await regRes.json()) as { client_id: string };

    // 2. Authorize with 3000-char Gemini-style state
    const verifier = 'v'.repeat(50);
    const challenge = sha256Base64Url(verifier);
    const bigState = 'S'.repeat(3000);
    const authUrl = new URL('https://finance-pal.app/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', client_id);
    authUrl.searchParams.set('redirect_uri', 'https://claude.ai/api/mcp/auth_callback');
    authUrl.searchParams.set('state', bigState);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('scope', 'mcp:read:overview mcp:write:transactions');

    const authRes = await handleOAuthRequest(new Request(authUrl.toString()));
    expect(authRes.status).toBe(302);
    const consentRedirect = new URL(authRes.headers.get('location') ?? '');
    expect(consentRedirect.pathname).toBe('/oauth/consent');
    expect(consentRedirect.searchParams.get('state')).toBe(bigState);

    // 3a. Cross-origin consent POST must fail 403
    const evilDecision = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/consent-decision', {
        method: 'POST',
        headers: {
          Origin: 'https://claude.ai',
          Authorization: 'Bearer sb-jwt-aal2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approve',
          client_id,
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: bigState,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          read_only: true,
          scopes: ['mcp:read:overview', 'mcp:write:transactions'],
        }),
      }),
    );
    expect(evilDecision.status).toBe(403);

    // 3b. MFA-enrolled user with only aal1 token must fail 403 mfa_aal2_required
    const aal1Decision = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/consent-decision', {
        method: 'POST',
        headers: {
          Origin: 'https://finance-pal.app',
          Authorization: 'Bearer sb-jwt-aal1-mfa',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approve',
          client_id,
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: bigState,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          read_only: true,
          scopes: ['mcp:read:overview', 'mcp:write:transactions'],
        }),
      }),
    );
    expect(aal1Decision.status).toBe(403);

    // 3c. Approved AAL2 decision returns redirectTo with code, state, and iss; read_only strips write scope
    const okDecision = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/consent-decision', {
        method: 'POST',
        headers: {
          Origin: 'https://finance-pal.app',
          Authorization: 'Bearer sb-jwt-aal2',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approve',
          client_id,
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: bigState,
          code_challenge: challenge,
          code_challenge_method: 'S256',
          read_only: true,
          scopes: ['mcp:read:overview', 'mcp:write:transactions'],
        }),
      }),
    );
    expect(okDecision.status).toBe(200);
    const { redirectTo } = (await okDecision.json()) as { redirectTo: string };
    const cbUrl = new URL(redirectTo);
    expect(cbUrl.searchParams.get('iss')).toBe('https://finance-pal.app');
    expect(cbUrl.searchParams.get('state')).toBe(bigState);
    const authCode = cbUrl.searchParams.get('code') ?? '';
    expect(authCode.length).toBeGreaterThan(20);

    // 4. Token exchange (authorization_code)
    const tokenForm = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      client_id,
      code_verifier: verifier,
      resource: 'https://finance-pal.app/mcp/',
    });
    const tokRes = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenForm.toString(),
      }),
    );
    expect(tokRes.status).toBe(200);
    const tokJson = (await tokRes.json()) as {
      access_token: string;
      refresh_token: string;
      scope: string;
    };
    expect(tokJson.scope).toBe('mcp:read:overview');

    // Replay auth code must fail 400
    const replayCode = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenForm.toString(),
      }),
    );
    expect(replayCode.status).toBe(400);

    // 5. Refresh rotation
    const refresh1 = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokJson.refresh_token,
      client_id,
    });
    const rotRes = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: refresh1.toString(),
      }),
    );
    expect(rotRes.status).toBe(200);
    const rotJson = (await rotRes.json()) as { refresh_token: string };
    expect(rotJson.refresh_token).not.toBe(tokJson.refresh_token);

    // Reuse old refresh token -> detects theft & revokes entire family + grant!
    const reuseRes = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: refresh1.toString(),
      }),
    );
    expect(reuseRes.status).toBe(400);
    expect((dbState.grants[0].revoked_at as string | null)).not.toBeNull();
  });

  it('enforces max 5 active connectors per user', async () => {
    const db = createInMemorySupabaseAdmin(dbState);
    const client = await registerDynamicClient(
      { client_name: 'Client X', redirect_uris: ['https://chatgpt.com/cb'] },
      '203.0.113.10',
      db,
    );
    const challenge = sha256Base64Url('k'.repeat(43));

    for (let i = 0; i < 5; i++) {
      dbState.grants.push({
        id: randomUUID(),
        user_id: 'user-2',
        client_id: client.client_id,
        client_name: `Grant ${i}`,
        scopes: ['mcp:read:overview'],
        read_only: true,
        resource: 'https://finance-pal.app/mcp',
        revoked_at: null,
      });
    }

    const sixth = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/consent-decision', {
        method: 'POST',
        headers: {
          Origin: 'https://finance-pal.app',
          Authorization: 'Bearer sb-jwt-no-mfa',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: 'approve',
          client_id: client.client_id,
          redirect_uri: 'https://chatgpt.com/cb',
          state: 'abc',
          code_challenge: challenge,
          code_challenge_method: 'S256',
          read_only: true,
          scopes: ['mcp:read:overview'],
        }),
      }),
    );

    expect(sixth.status).toBe(409);
    const errJson = (await sixth.json()) as { error: string };
    expect(errJson.error).toBe('max_connectors_reached');
  });
});
