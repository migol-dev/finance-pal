// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetServerEnvCacheForTests } from '../_lib/env.js';
import { resetAnomalyBucketsForTests } from '../_lib/mcp/audit.js';
import { sha256Base64Url, sha256Hex } from '../_lib/oauth/crypto.js';
import {
  setSupabaseAdminForTests,
  type SupabaseAdminClient,
  type VerifiedSupabaseUser,
} from '../_lib/supabase-admin.js';
import { handleMcpRequest } from '../mcp.js';
import { handleOAuthRequest } from '../oauth.js';
import { handleWellKnownRequest } from '../well-known.js';

interface E2ETransactionRow {
  id: string;
  user_id: string;
  type: string;
  category: string;
  concept: string;
  amount: number;
  payment_method: string;
  deleted_at: string | null;
}

interface E2EDbState {
  clients: Array<Record<string, unknown>>;
  grants: Array<Record<string, unknown>>;
  codes: Array<Record<string, unknown>>;
  refreshTokens: Array<Record<string, unknown>>;
  confirmations: Array<Record<string, unknown>>;
  transactions: E2ETransactionRow[];
  auditLogs: Array<Record<string, unknown>>;
  userSettings: Array<{ user_id: string; mcp_enabled: boolean }>;
  verifiedUsers: Map<string, VerifiedSupabaseUser>;
}

function createE2ESupabaseAdmin(state: E2EDbState): SupabaseAdminClient {
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

  function assertActiveGrant(grantId: unknown, scope: string, requireWrite: boolean): string | null {
    const grant = state.grants.find((g) => g.id === grantId && !g.revoked_at);
    if (!grant) return 'GRANT_NOT_FOUND_OR_REVOKED';
    const settings = state.userSettings.find((s) => s.user_id === grant.user_id);
    if (settings && settings.mcp_enabled === false) return 'MCP_DISABLED_BY_USER';
    if (requireWrite && grant.read_only === true) return 'READ_ONLY_MODE_ACTIVE';
    const scopes = Array.isArray(grant.scopes) ? (grant.scopes as string[]) : [];
    if (!scopes.includes(scope)) return `INSUFFICIENT_SCOPE:${scope}`;
    grant.last_used_at = new Date().toISOString();
    return null;
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
        if (table === 'mcp_oauth_grants' && !body.id) body.id = randomUUID();

        if (table === 'mcp_oauth_clients') {
          state.clients.push(body);
        } else if (table === 'mcp_oauth_grants') {
          state.grants.push({ revoked_at: null, ...body });
        } else if (table === 'mcp_oauth_codes') {
          state.codes.push({ used_at: null, ...body });
        } else if (table === 'mcp_refresh_tokens') {
          state.refreshTokens.push({ used_at: null, revoked_at: null, ...body });
        } else if (table === 'mcp_audit_log') {
          state.auditLogs.push(body);
        }
        return { data: [body] as T, error: null, status: 201 };
      }

      if (method === 'PATCH') {
        const matched = filterRows(table, params);
        const patch = init.body as Record<string, unknown>;
        for (const row of matched) Object.assign(row, patch);
        return { data: matched as T, error: null, status: 200 };
      }

      return { data: null, error: { message: 'Unsupported HTTP method' }, status: 400 };
    },

    async rpc<T>(fnName: string, params: Record<string, unknown> = {}) {
      if (fnName === 'mcp_check_rate_limit') {
        return { data: { allowed: true, remaining: 50 } as T, error: null, status: 200 };
      }

      const grant = state.grants.find((g) => g.id === params.p_grant_id);
      const userId = grant ? String(grant.user_id) : 'user-missing';

      if (fnName === 'mcp_get_financial_overview') {
        const err = assertActiveGrant(params.p_grant_id, 'mcp:read:overview', false);
        if (err) return { data: null, error: { message: err }, status: 400 };
        const activeTxs = state.transactions.filter((t) => t.user_id === userId && !t.deleted_at);
        const expenseTotal = activeTxs
          .filter((t) => t.type === 'expense')
          .reduce((acc, t) => acc + t.amount, 0);
        return {
          data: {
            expense_total: expenseTotal,
            transaction_count: activeTxs.length,
          } as T,
          error: null,
          status: 200,
        };
      }

      if (fnName === 'mcp_create_transaction') {
        const err = assertActiveGrant(params.p_grant_id, 'mcp:write:transactions', true);
        if (err) return { data: null, error: { message: err }, status: 400 };
        const row: E2ETransactionRow = {
          id: randomUUID(),
          user_id: userId,
          type: String(params.p_type),
          category: String(params.p_category),
          concept: String(params.p_concept),
          amount: Number(params.p_amount),
          payment_method: String(params.p_payment_method ?? 'cash'),
          deleted_at: null,
        };
        state.transactions.push(row);
        return { data: row as unknown as T, error: null, status: 200 };
      }

      if (fnName === 'mcp_list_transactions') {
        const err = assertActiveGrant(params.p_grant_id, 'mcp:read:transactions', false);
        if (err) return { data: null, error: { message: err }, status: 400 };
        const items = state.transactions.filter((t) => t.user_id === userId && t.deleted_at === null);
        return {
          data: { transactions: items, count: items.length } as T,
          error: null,
          status: 200,
        };
      }

      if (fnName === 'mcp_prepare_soft_delete') {
        const err = assertActiveGrant(params.p_grant_id, 'mcp:delete:soft', true);
        if (err) return { data: null, error: { message: err }, status: 400 };
        const tx = state.transactions.find(
          (t) => t.id === params.p_entity_id && t.user_id === userId && t.deleted_at === null,
        );
        if (!tx) return { data: null, error: { message: 'ENTITY_NOT_FOUND' }, status: 400 };

        state.confirmations.push({
          token_hash: params.p_token_hash,
          user_id: userId,
          grant_id: params.p_grant_id,
          entity_type: params.p_entity_type,
          entity_id: params.p_entity_id,
          used_at: null,
          expires_at: new Date(Date.now() + 120_000).toISOString(),
        });
        return {
          data: {
            preview: { entity_type: 'transaction', id: tx.id, concept: tx.concept, amount: tx.amount },
            expires_in_seconds: 120,
            recoverable_days: 30,
          } as T,
          error: null,
          status: 200,
        };
      }

      if (fnName === 'mcp_confirm_soft_delete') {
        const err = assertActiveGrant(params.p_grant_id, 'mcp:delete:soft', true);
        if (err) return { data: null, error: { message: err }, status: 400 };
        const conf = state.confirmations.find(
          (c) =>
            c.token_hash === params.p_token_hash &&
            c.grant_id === params.p_grant_id &&
            !c.used_at &&
            String(c.expires_at) > new Date().toISOString(),
        );
        if (!conf) return { data: null, error: { message: 'INVALID_OR_EXPIRED_CONFIRMATION' }, status: 400 };
        conf.used_at = new Date().toISOString();

        const tx = state.transactions.find((t) => t.id === conf.entity_id && t.user_id === userId);
        if (!tx || tx.deleted_at !== null) {
          return { data: null, error: { message: 'ENTITY_ALREADY_DELETED_OR_MISSING' }, status: 400 };
        }
        tx.deleted_at = new Date().toISOString();
        return {
          data: {
            status: 'soft_deleted',
            entity_type: conf.entity_type,
            entity_id: conf.entity_id,
            purge_after_days: 30,
          } as T,
          error: null,
          status: 200,
        };
      }

      return { data: null, error: { message: `Unhandled RPC ${fnName}` }, status: 500 };
    },

    async verifySupabaseUserAccessToken(token: string) {
      return state.verifiedUsers.get(token) ?? null;
    },
  };
}

describe('Phase 5: Full End-to-End MCP OAuth + Financial + 2-Step Soft Delete Journey', () => {
  let dbState: E2EDbState;
  const prevEnv = { ...process.env };
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  beforeEach(() => {
    resetServerEnvCacheForTests();
    resetAnomalyBucketsForTests();
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-secret-value-2026';
    process.env.SUPABASE_ANON_KEY = 'anon-key-secret-value-2026';
    process.env.MCP_JWT_SIGNING_KEY = 'super-secret-jwt-signing-key-32bytes!';
    process.env.MCP_ISSUER = 'https://finance-pal.app';
    process.env.MCP_RESOURCE_URL = 'https://finance-pal.app/mcp';

    dbState = {
      clients: [],
      grants: [],
      codes: [],
      refreshTokens: [],
      confirmations: [],
      transactions: [],
      auditLogs: [],
      userSettings: [{ user_id: userId, mcp_enabled: true }],
      verifiedUsers: new Map([
        [
          'supabase-aal2-jwt',
          { id: userId, aal: 'aal2', hasVerifiedMfaFactor: true },
        ],
      ]),
    };

    setSupabaseAdminForTests(createE2ESupabaseAdmin(dbState));
  });

  afterEach(() => {
    setSupabaseAdminForTests(null);
    process.env = { ...prevEnv };
    resetServerEnvCacheForTests();
  });

  it('completes Discovery -> DCR -> Authorize -> Consent -> PKCE Token -> MCP Write/Read -> 2-Step Soft Delete -> Restore -> Revoke', async () => {
    // 1. Discovery
    const prmRes = await handleWellKnownRequest(
      new Request('https://finance-pal.app/.well-known/oauth-protected-resource'),
    );
    expect(prmRes.status).toBe(200);
    const prm = (await prmRes.json()) as { resource: string; authorization_servers: string[] };
    expect(prm.resource).toBe('https://finance-pal.app/mcp');

    const asRes = await handleWellKnownRequest(
      new Request('https://finance-pal.app/.well-known/oauth-authorization-server'),
    );
    expect(asRes.status).toBe(200);
    const asMeta = (await asRes.json()) as {
      token_endpoint: string;
      registration_endpoint: string;
      revocation_endpoint: string;
      code_challenge_methods_supported: string[];
    };
    expect(asMeta.code_challenge_methods_supported).toEqual(['S256']);

    // 2. Dynamic Client Registration (DCR)
    const dcrRes = await handleOAuthRequest(
      new Request(asMeta.registration_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Claude E2E',
          redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        }),
      }),
    );
    expect(dcrRes.status).toBe(201);
    const dcr = (await dcrRes.json()) as { client_id: string };
    expect(dcr.client_id).toBeTruthy();

    // 3. OAuth Authorize -> Redirect to SPA /oauth/consent
    const codeVerifier = 'e2e_verifier_value_with_enough_entropy_1234567890';
    const codeChallenge = sha256Base64Url(codeVerifier);
    const authUrl = new URL('https://finance-pal.app/oauth/authorize');
    authUrl.searchParams.set('client_id', dcr.client_id);
    authUrl.searchParams.set('redirect_uri', 'https://claude.ai/api/mcp/auth_callback');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', 'e2e_state_1');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('resource', 'https://finance-pal.app/mcp');

    const authRes = await handleOAuthRequest(new Request(authUrl.toString()));
    expect(authRes.status).toBe(302);
    const consentLocation = authRes.headers.get('location')!;
    expect(consentLocation).toContain('https://finance-pal.app/oauth/consent');

    // 4. User Consent Decision (AAL2 session, write + opt-in soft delete)
    const consentRes = await handleOAuthRequest(
      new Request('https://finance-pal.app/oauth/consent-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://finance-pal.app',
          Authorization: 'Bearer supabase-aal2-jwt',
        },
        body: JSON.stringify({
          decision: 'approve',
          client_id: dcr.client_id,
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          state: 'e2e_state_1',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          resource: 'https://finance-pal.app/mcp',
          read_only: false,
          scopes: [
            'mcp:read:overview',
            'mcp:read:transactions',
            'mcp:write:transactions',
            'mcp:delete:soft',
          ],
        }),
      }),
    );
    expect(consentRes.status).toBe(200);
    const consentBody = (await consentRes.json()) as { redirectTo: string };
    const authCode = new URL(consentBody.redirectTo).searchParams.get('code')!;
    expect(authCode).toBeTruthy();

    // 5. Token Exchange + Refresh Rotation
    const tokenRes = await handleOAuthRequest(
      new Request(asMeta.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: dcr.client_id,
          code: authCode,
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          code_verifier: codeVerifier,
          resource: 'https://finance-pal.app/mcp',
        }).toString(),
      }),
    );
    expect(tokenRes.status).toBe(200);
    const tokens1 = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
    };

    const rotatedRes = await handleOAuthRequest(
      new Request(asMeta.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: dcr.client_id,
          refresh_token: tokens1.refresh_token,
          resource: 'https://finance-pal.app/mcp',
        }).toString(),
      }),
    );
    expect(rotatedRes.status).toBe(200);
    const tokens2 = (await rotatedRes.json()) as {
      access_token: string;
      refresh_token: string;
    };
    expect(tokens2.refresh_token).not.toBe(tokens1.refresh_token);

    // 6. MCP Initialize -> Write Transaction -> Read Overview & Transactions
    const callMcp = async (payload: unknown) => {
      const r = await handleMcpRequest(
        new Request(prm.resource, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokens2.access_token}`,
          },
          body: JSON.stringify(payload),
        }),
      );
      expect(r.status).toBe(200);
      return (await r.json()) as {
        result: { isError?: boolean; structuredContent: Record<string, unknown> };
      };
    };

    await callMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'Claude', version: '1' } },
    });

    const createTx = await callMcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'create_transaction',
        arguments: {
          idempotency_key: 'e2e-tx-1',
          type: 'expense',
          category: 'Café',
          concept: 'Café de especialidad',
          amount: 145,
          payment_method: 'cash',
        },
      },
    });
    expect(createTx.result.isError).toBeFalsy();
    const txId = String(createTx.result.structuredContent.id);

    const listTx = await callMcp({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'list_transactions', arguments: {} },
    });
    const txs = listTx.result.structuredContent.transactions as Array<{ id: string; concept: string }>;
    expect(txs).toHaveLength(1);
    expect(txs[0].concept).toBe('<untrusted_user_note>Café de especialidad</untrusted_user_note>');

    // 7. 2-Step Soft Delete + Restore Verification
    const prepDel = await callMcp({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'prepare_soft_delete', arguments: { entity_type: 'transaction', entity_id: txId } },
    });
    const confirmToken = String(prepDel.result.structuredContent.confirmation_token);

    const confirmDel = await callMcp({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'confirm_soft_delete', arguments: { confirmation_token: confirmToken } },
    });
    expect(confirmDel.result.structuredContent.status).toBe('soft_deleted');
    expect(dbState.transactions[0].deleted_at).toBeTruthy();

    const listAfterDel = await callMcp({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'list_transactions', arguments: {} },
    });
    expect(listAfterDel.result.structuredContent.count).toBe(0);

    // Simulate user restoring from 30-day Trash UI
    dbState.transactions[0].deleted_at = null;
    const listAfterRestore = await callMcp({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: { name: 'list_transactions', arguments: {} },
    });
    expect(listAfterRestore.result.structuredContent.count).toBe(1);

    // 8. Token/Grant Revocation -> MCP denies further execution cleanly
    const revokeRes = await handleOAuthRequest(
      new Request(asMeta.revocation_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: tokens2.refresh_token,
          client_id: dcr.client_id,
        }).toString(),
      }),
    );
    expect(revokeRes.status).toBe(200);

    const afterRevoke = await callMcp({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: { name: 'get_financial_overview', arguments: {} },
    });
    expect(afterRevoke.result.isError).toBe(true);
    expect(JSON.stringify(afterRevoke.result)).toContain('GRANT_NOT_FOUND_OR_REVOKED');
    expect(sha256Hex(confirmToken)).toBeTruthy();
  });
});
