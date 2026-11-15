// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseServerEnv } from '../_lib/env';

const BASE_ENV = {
  SUPABASE_URL: 'https://rjforcrdyfuodsqtopvp.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-that-is-at-least-20-chars',
  SUPABASE_ANON_KEY: 'anon-key-that-is-at-least-20-chars',
  MCP_JWT_SIGNING_KEY: '0123456789abcdef0123456789abcdef',
};

describe('MCP Server Env & Vercel Routing Contract', () => {
  it('auto-detects VERCEL_BRANCH_URL for preview deployments when MCP_ISSUER is unset', () => {
    const env = parseServerEnv({
      ...BASE_ENV,
      VERCEL_ENV: 'preview',
      VERCEL_BRANCH_URL: 'finance-pal-git-feat-mcp.vercel.app',
      VERCEL_URL: 'finance-pal-abc123.vercel.app',
    });

    expect(env.mcpIssuer).toBe('https://finance-pal-git-feat-mcp.vercel.app');
    expect(env.mcpResource).toBe('https://finance-pal-git-feat-mcp.vercel.app/mcp');
  });

  it('falls back to VERCEL_URL for preview deployments when VERCEL_BRANCH_URL is unset', () => {
    const env = parseServerEnv({
      ...BASE_ENV,
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'https://finance-pal-abc123.vercel.app/',
    });

    expect(env.mcpIssuer).toBe('https://finance-pal-abc123.vercel.app');
    expect(env.mcpResource).toBe('https://finance-pal-abc123.vercel.app/mcp');
  });

  it('prefers explicit MCP_ISSUER over Vercel preview host', () => {
    const env = parseServerEnv({
      ...BASE_ENV,
      VERCEL_ENV: 'preview',
      VERCEL_BRANCH_URL: 'finance-pal-git-feat-mcp.vercel.app',
      MCP_ISSUER: 'https://finance-pal.app/',
    });

    expect(env.mcpIssuer).toBe('https://finance-pal.app');
    expect(env.mcpResource).toBe('https://finance-pal.app/mcp');
  });

  it('routes /oauth/consent to /index.html before /oauth/(.*) in vercel.json', () => {
    const vercelConfigPath = path.resolve(__dirname, '../../vercel.json');
    const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8')) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    const consentIdx = config.rewrites.findIndex(
      (r) => r.source === '/oauth/consent' && r.destination === '/index.html',
    );
    const wildcardIdx = config.rewrites.findIndex(
      (r) => r.source === '/oauth/(.*)' && r.destination === '/api/oauth?route=$1',
    );

    expect(consentIdx).toBeGreaterThanOrEqual(0);
    expect(wildcardIdx).toBeGreaterThan(consentIdx);
  });
});
