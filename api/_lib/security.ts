import { lookup } from 'node:dns/promises';
import net from 'node:net';
import type { ServerEnv } from './env';

const ALLOWED_EXTERNAL_ORIGINS = new Set([
  'https://financepal-web.vercel.app',
  'https://finance-pal.app',
  'https://www.finance-pal.app',
  'https://claude.ai',
  'https://claude.com',
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://gemini.google.com',
  'https://aistudio.google.com',
]);

export function isLocalhostHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return lower === 'localhost' || lower === '127.0.0.1' || lower === '::1' || lower === '[::1]';
}

export function isAllowedCorsOrigin(
  originHeader: string | null,
  env: Pick<ServerEnv, 'mcpIssuer' | 'allowLocalhostOrigins'>,
): string | null {
  if (!originHeader) return null;
  let parsed: URL;
  try {
    parsed = new URL(originHeader);
  } catch {
    return null;
  }

  const normalized = parsed.origin;
  if (normalized === env.mcpIssuer) return normalized;
  if (ALLOWED_EXTERNAL_ORIGINS.has(normalized)) return normalized;

  if (env.allowLocalhostOrigins && parsed.protocol === 'http:' && isLocalhostHostname(parsed.hostname)) {
    return normalized;
  }
  return null;
}

export function applySecurityHeaders(
  headers: Headers,
  corsOrigin: string | null,
  allowMethods = 'GET, POST, DELETE, OPTIONS',
): Headers {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Frame-Options', 'DENY');
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store');
  }
  if (corsOrigin) {
    headers.set('Access-Control-Allow-Origin', corsOrigin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Methods', allowMethods);
    headers.set(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, Accept, Mcp-Protocol-Version, Last-Event-ID',
    );
    headers.set('Access-Control-Expose-Headers', 'WWW-Authenticate');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

export function isPrivateOrReservedIp(ipRaw: string): boolean {
  const ip = ipRaw.replace(/^\[|\]$/g, '').toLowerCase();

  if (ip.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(ip.slice(7));
  }

  const kind = net.isIP(ip);
  if (kind === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 169 && b === 254) return true; // Link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    if (a >= 224) return true; // Multicast / reserved
    return false;
  }

  if (kind === 6) {
    if (ip === '::' || ip === '::1') return true;
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // ULA
    if (ip.startsWith('fe80') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true;
    if (ip.startsWith('ff')) return true; // Multicast
    return false;
  }

  return true;
}

export async function assertPublicFetchableHttpsUrl(
  rawUrl: string,
  dnsLookup: (hostname: string) => Promise<Array<{ address: string }>> = (hostname) =>
    lookup(hostname, { all: true }),
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('INVALID_URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('HTTPS_REQUIRED');
  }
  if (parsed.username || parsed.password) {
    throw new Error('CREDENTIALS_IN_URL_FORBIDDEN');
  }
  if (parsed.port && parsed.port !== '443') {
    throw new Error('NON_STANDARD_PORT_FORBIDDEN');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.arpa')
  ) {
    throw new Error('SSRF_HOST_BLOCKED');
  }

  if (net.isIP(host.replace(/^\[|\]$/g, '')) !== 0) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error('SSRF_IP_BLOCKED');
    }
    return parsed;
  }

  const records = await dnsLookup(host);
  if (!records || records.length === 0) {
    throw new Error('DNS_RESOLUTION_FAILED');
  }
  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error('SSRF_DNS_IP_BLOCKED');
    }
  }

  return parsed;
}

export function buildWwwAuthenticate(
  env: Pick<ServerEnv, 'mcpIssuer'>,
  options: { error?: string; description?: string; scope?: string } = {},
): string {
  const parts = [`resource_metadata="${env.mcpIssuer}/.well-known/oauth-protected-resource"`];
  if (options.error) {
    parts.push(`error="${options.error.replace(/"/g, '')}"`);
  }
  if (options.description) {
    parts.push(`error_description="${options.description.replace(/"/g, '')}"`);
  }
  if (options.scope) {
    parts.push(`scope="${options.scope.replace(/"/g, '')}"`);
  }
  return `Bearer ${parts.join(', ')}`;
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  return 'unknown';
}

export class PayloadTooLargeError extends Error {
  constructor(message = 'Request body exceeds allowed size limit') {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}

export async function readTextBodyWithLimit(request: Request, maxBytes: number): Promise<string> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const declared = Number(contentLengthHeader);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // ignore stream cancel errors
        }
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

export function jsonResponse(
  body: unknown,
  status: number,
  corsOrigin: string | null,
  extraHeaders: Record<string, string> = {},
): Response {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  applySecurityHeaders(headers, corsOrigin);
  for (const [k, v] of Object.entries(extraHeaders)) {
    headers.set(k, v);
  }
  return new Response(JSON.stringify(body), { status, headers });
}
