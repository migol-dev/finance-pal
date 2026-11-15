import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { ServerEnv } from '../env.js';
import { filterValidMcpScopes, type McpScope } from './scopes.js';

const PKCE_VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;

export interface McpTokenPayload {
  sub: string;
  grantId: string;
  clientId: string;
  scopes: McpScope[];
  resource: string;
  aal: 'aal1' | 'aal2';
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

export function sha256Base64Url(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('base64url');
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function verifyPkceS256(codeVerifier: string, expectedChallenge: string): boolean {
  if (!PKCE_VERIFIER_RE.test(codeVerifier) || !expectedChallenge) {
    return false;
  }
  const computed = sha256Base64Url(codeVerifier);
  const a = Buffer.from(computed, 'utf8');
  const b = Buffer.from(expectedChallenge, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function getSigningKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signMcpAccessToken(
  payload: McpTokenPayload,
  env: Pick<ServerEnv, 'mcpIssuer' | 'mcpJwtSecret'>,
  ttlSeconds = 3600,
): Promise<{ token: string; expiresIn: number }> {
  const token = await new SignJWT({
    grant_id: payload.grantId,
    client_id: payload.clientId,
    scope: payload.scopes.join(' '),
    aal: payload.aal,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(env.mcpIssuer)
    .setSubject(payload.sub)
    .setAudience(payload.resource)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .setJti(generateOpaqueToken(12))
    .sign(getSigningKey(env.mcpJwtSecret));

  return { token, expiresIn: ttlSeconds };
}

export async function verifyMcpAccessToken(
  token: string,
  env: Pick<ServerEnv, 'mcpIssuer' | 'mcpResource' | 'mcpJwtSecret'>,
): Promise<McpTokenPayload> {
  const { payload } = await jwtVerify(token, getSigningKey(env.mcpJwtSecret), {
    issuer: env.mcpIssuer,
    audience: env.mcpResource,
    algorithms: ['HS256'],
  });

  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  const grantId = typeof payload.grant_id === 'string' ? payload.grant_id : '';
  const clientId = typeof payload.client_id === 'string' ? payload.client_id : '';
  const rawScope = typeof payload.scope === 'string' ? payload.scope : '';
  const aal = payload.aal === 'aal2' ? 'aal2' : 'aal1';

  if (!sub || !grantId || !clientId) {
    throw new Error('INVALID_TOKEN_CLAIMS');
  }

  return {
    sub,
    grantId,
    clientId,
    scopes: filterValidMcpScopes(rawScope.split(/\s+/).filter(Boolean)),
    resource: env.mcpResource,
    aal,
  };
}
