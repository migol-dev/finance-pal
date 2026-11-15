import { getServerEnv, type ServerEnv } from './env';

export interface PostgrestError {
  message: string;
  code?: string;
}

export interface RestResponse<T> {
  data: T | null;
  error: PostgrestError | null;
  status: number;
}

export interface VerifiedSupabaseUser {
  id: string;
  aal: 'aal1' | 'aal2';
  hasVerifiedMfaFactor: boolean;
}

export interface SupabaseAdminClient {
  rest<T>(
    pathWithQuery: string,
    init?: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: unknown;
      prefer?: string;
      headers?: Record<string, string>;
    },
  ): Promise<RestResponse<T>>;
  rpc<T>(fnName: string, params?: Record<string, unknown>): Promise<RestResponse<T>>;
  verifySupabaseUserAccessToken(accessToken: string): Promise<VerifiedSupabaseUser | null>;
}

function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createSupabaseAdminClient(
  env: Pick<ServerEnv, 'supabaseUrl' | 'supabaseServiceRoleKey' | 'supabaseAnonKey'>,
  fetchImpl: typeof fetch = fetch,
): SupabaseAdminClient {
  const baseHeaders = (): Record<string, string> => ({
    apikey: env.supabaseServiceRoleKey,
    Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
  });

  async function rest<T>(
    pathWithQuery: string,
    init: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: unknown;
      prefer?: string;
      headers?: Record<string, string>;
    } = {},
  ): Promise<RestResponse<T>> {
    const headers: Record<string, string> = {
      ...baseHeaders(),
      ...(init.headers ?? {}),
    };
    if (init.prefer) {
      headers.Prefer = init.prefer;
    }

    const res = await fetchImpl(`${env.supabaseUrl}/rest/v1/${pathWithQuery}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    if (!res.ok) {
      const errObj = (parsed && typeof parsed === 'object' ? parsed : {}) as {
        message?: string;
        code?: string;
        hint?: string;
      };
      return {
        data: null,
        error: {
          message: errObj.message ?? `Supabase REST error (${res.status})`,
          code: errObj.code,
        },
        status: res.status,
      };
    }

    return {
      data: parsed as T,
      error: null,
      status: res.status,
    };
  }

  async function rpc<T>(fnName: string, params: Record<string, unknown> = {}): Promise<RestResponse<T>> {
    return rest<T>(`rpc/${fnName}`, {
      method: 'POST',
      body: params,
    });
  }

  async function verifySupabaseUserAccessToken(accessToken: string): Promise<VerifiedSupabaseUser | null> {
    if (!accessToken || accessToken.length > 8192) return null;

    const res = await fetchImpl(`${env.supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;

    const userData = (await res.json()) as {
      id?: string;
      factors?: Array<{ status?: string }>;
    };
    if (!userData?.id) return null;

    const claims = decodeJwtPayloadUnsafe(accessToken);
    if (!claims || claims.sub !== userData.id) return null;

    let hasVerifiedMfaFactor = Array.isArray(userData.factors)
      ? userData.factors.some((f) => f.status === 'verified')
      : false;

    if (!hasVerifiedMfaFactor) {
      // Double-check via admin endpoint so factor detection is authoritative even if /auth/v1/user omits factors.
      const adminUserRes = await fetchImpl(`${env.supabaseUrl}/auth/v1/admin/users/${userData.id}`, {
        method: 'GET',
        headers: baseHeaders(),
      });
      if (adminUserRes.ok) {
        const adminData = (await adminUserRes.json()) as {
          factors?: Array<{ status?: string }>;
        };
        hasVerifiedMfaFactor = Array.isArray(adminData.factors)
          ? adminData.factors.some((f) => f.status === 'verified')
          : false;
      }
    }

    const aal = claims.aal === 'aal2' ? 'aal2' : 'aal1';
    return {
      id: userData.id,
      aal,
      hasVerifiedMfaFactor,
    };
  }

  return { rest, rpc, verifySupabaseUserAccessToken };
}

let customAdminOverrideForTests: SupabaseAdminClient | null = null;

export function setSupabaseAdminForTests(client: SupabaseAdminClient | null): void {
  customAdminOverrideForTests = client;
}

export function getSupabaseAdmin(): SupabaseAdminClient {
  if (customAdminOverrideForTests) return customAdminOverrideForTests;
  return createSupabaseAdminClient(getServerEnv());
}
