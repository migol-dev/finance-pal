import { z } from 'zod';

const DEFAULT_ISSUER = 'https://financepal-web.vercel.app';

const nonEmptyUrl = z
  .string()
  .trim()
  .url()
  .transform((val) => val.replace(/\/+$/, ''))
  .refine((val) => {
    try {
      const parsed = new URL(val);
      return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }, 'URL must use https:// (or http://localhost in dev/test)');

const serverEnvSchema = z.object({
  supabaseUrl: nonEmptyUrl,
  supabaseServiceRoleKey: z.string().trim().min(20, 'SUPABASE_SERVICE_ROLE_KEY is required and must be >= 20 chars'),
  supabaseAnonKey: z.string().trim().min(20, 'SUPABASE_ANON_KEY is required and must be >= 20 chars'),
  mcpJwtSecret: z.string().trim().min(32, 'MCP_JWT_SIGNING_KEY is required and must be >= 32 chars'),
  mcpIssuer: nonEmptyUrl,
  mcpResource: nonEmptyUrl,
  allowLocalhostOrigins: z.boolean(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class ServerEnvError extends Error {
  public readonly missingFields: string[];

  constructor(message: string, missingFields: string[] = []) {
    super(message);
    this.name = 'ServerEnvError';
    this.missingFields = missingFields;
  }
}

function resolveDefaultIssuer(rawEnv: Record<string, string | undefined>): string {
  const explicit = rawEnv.MCP_ISSUER?.trim();
  if (explicit) return explicit;

  if (rawEnv.VERCEL_ENV === 'preview') {
    const previewHost = (rawEnv.VERCEL_BRANCH_URL?.trim() || rawEnv.VERCEL_URL?.trim() || '').replace(
      /^https?:\/\//i,
      '',
    );
    if (previewHost) {
      return `https://${previewHost}`;
    }
  }

  if (rawEnv.VERCEL_ENV !== 'preview') {
    const publicUrl = rawEnv.VITE_PUBLIC_URL?.trim().replace(/\/+$/, '');
    if (publicUrl) return publicUrl;
  }

  return DEFAULT_ISSUER;
}

export function parseServerEnv(rawEnv: Record<string, string | undefined>): ServerEnv {
  const issuerInput = resolveDefaultIssuer(rawEnv);
  const normalizedIssuer = issuerInput.replace(/\/+$/, '');
  const resourceInput = rawEnv.MCP_RESOURCE_URL?.trim() || `${normalizedIssuer}/mcp`;

  const candidate = {
    supabaseUrl: rawEnv.SUPABASE_URL?.trim() || rawEnv.VITE_SUPABASE_URL?.trim() || '',
    supabaseServiceRoleKey: rawEnv.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
    supabaseAnonKey: rawEnv.SUPABASE_ANON_KEY?.trim() || rawEnv.VITE_SUPABASE_ANON_KEY?.trim() || '',
    mcpJwtSecret: rawEnv.MCP_JWT_SIGNING_KEY?.trim() || '',
    mcpIssuer: normalizedIssuer,
    mcpResource: resourceInput.replace(/\/+$/, ''),
    allowLocalhostOrigins:
      rawEnv.MCP_ALLOW_LOCALHOST === '1' ||
      rawEnv.MCP_ALLOW_LOCALHOST === 'true' ||
      rawEnv.NODE_ENV === 'test',
  };

  const result = serverEnvSchema.safeParse(candidate);
  if (!result.success) {
    const fields = Array.from(
      new Set(result.error.issues.map((issue) => String(issue.path[0] ?? 'unknown'))),
    );
    throw new ServerEnvError(
      `Invalid MCP server environment configuration for: ${fields.join(', ')}`,
      fields,
    );
  }

  return result.data;
}

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv(process.env);
  }
  return cachedEnv;
}

export function resetServerEnvCacheForTests(): void {
  cachedEnv = null;
}
