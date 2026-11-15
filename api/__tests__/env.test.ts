// @vitest-environment node
import { describe, expect, it, afterEach } from 'vitest';
import {
  parseServerEnv,
  getServerEnv,
  resetServerEnvCacheForTests,
  ServerEnvError,
} from '../_lib/env';

describe('api/_lib/env', () => {
  afterEach(() => {
    resetServerEnvCacheForTests();
  });

  it('parses valid server env with defaults', () => {
    const parsed = parseServerEnv({
      SUPABASE_URL: 'https://example.supabase.co/',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-value-at-least-20',
      SUPABASE_ANON_KEY: 'anon-key-secret-value-at-least-20',
      MCP_JWT_SIGNING_KEY: 'a'.repeat(32),
      NODE_ENV: 'production',
    });

    expect(parsed.supabaseUrl).toBe('https://example.supabase.co');
    expect(parsed.mcpIssuer).toBe('https://finance-pal.app');
    expect(parsed.mcpResource).toBe('https://finance-pal.app/mcp');
    expect(parsed.allowLocalhostOrigins).toBe(false);
  });

  it('falls back to VITE_SUPABASE_* variables when server aliases are omitted', () => {
    const parsed = parseServerEnv({
      VITE_SUPABASE_URL: 'https://vite-fallback.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-value-at-least-20',
      VITE_SUPABASE_ANON_KEY: 'vite-anon-secret-value-at-least-20',
      MCP_JWT_SIGNING_KEY: 'b'.repeat(48),
      MCP_ISSUER: 'https://preview.finance-pal.app/',
    });

    expect(parsed.supabaseUrl).toBe('https://vite-fallback.supabase.co');
    expect(parsed.mcpIssuer).toBe('https://preview.finance-pal.app');
    expect(parsed.mcpResource).toBe('https://preview.finance-pal.app/mcp');
  });

  it('fails closed without leaking secret values when required variables are missing or weak', () => {
    const secretAttempt = 'short-secret';
    expect(() =>
      parseServerEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'tiny',
        SUPABASE_ANON_KEY: 'anon-key-secret-value-at-least-20',
        MCP_JWT_SIGNING_KEY: secretAttempt,
      }),
    ).toThrow(ServerEnvError);

    try {
      parseServerEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'tiny',
        SUPABASE_ANON_KEY: 'anon-key-secret-value-at-least-20',
        MCP_JWT_SIGNING_KEY: secretAttempt,
      });
    } catch (error) {
      const envErr = error as ServerEnvError;
      expect(envErr.missingFields).toContain('supabaseServiceRoleKey');
      expect(envErr.missingFields).toContain('mcpJwtSecret');
      expect(envErr.message).not.toContain(secretAttempt);
    }
  });

  it('rejects non-HTTPS non-localhost issuer URLs', () => {
    expect(() =>
      parseServerEnv({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-value-at-least-20',
        SUPABASE_ANON_KEY: 'anon-key-secret-value-at-least-20',
        MCP_JWT_SIGNING_KEY: 'c'.repeat(32),
        MCP_ISSUER: 'http://evil.example.com',
      }),
    ).toThrow(ServerEnvError);
  });

  it('caches process.env lazily via getServerEnv', () => {
    const prev = { ...process.env };
    try {
      process.env.SUPABASE_URL = 'https://cached.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-secret-value-at-least-20';
      process.env.SUPABASE_ANON_KEY = 'anon-key-secret-value-at-least-20';
      process.env.MCP_JWT_SIGNING_KEY = 'd'.repeat(32);

      const first = getServerEnv();
      const second = getServerEnv();
      expect(first).toBe(second);
      expect(first.supabaseUrl).toBe('https://cached.supabase.co');
    } finally {
      process.env = prev;
    }
  });
});
