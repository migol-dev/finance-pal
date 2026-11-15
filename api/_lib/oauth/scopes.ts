export const MCP_READ_SCOPES = [
  'mcp:read:overview',
  'mcp:read:accounts',
  'mcp:read:transactions',
  'mcp:read:fixed_items',
  'mcp:read:goals',
  'mcp:read:debts',
] as const;

export const MCP_WRITE_SCOPES = [
  'mcp:write:transactions',
  'mcp:write:fixed_items',
  'mcp:write:goals',
  'mcp:write:debts',
  'mcp:delete:soft',
] as const;

export const MCP_ALL_SCOPES = [...MCP_READ_SCOPES, ...MCP_WRITE_SCOPES] as const;

export type McpScope = (typeof MCP_ALL_SCOPES)[number];

const ALL_SCOPE_SET = new Set<string>(MCP_ALL_SCOPES);
const READ_SCOPE_SET = new Set<string>(MCP_READ_SCOPES);

export function filterValidMcpScopes(scopes: readonly string[]): McpScope[] {
  const unique = new Set<McpScope>();
  for (const s of scopes) {
    if (ALL_SCOPE_SET.has(s)) {
      unique.add(s as McpScope);
    }
  }
  return Array.from(unique);
}

export function enforceReadOnlyScopes(scopes: readonly McpScope[], readOnly: boolean): McpScope[] {
  const filtered = filterValidMcpScopes(scopes);
  if (!readOnly) {
    return filtered.length > 0 ? filtered : [...MCP_READ_SCOPES];
  }
  const readOnlyScopes = filtered.filter((s) => READ_SCOPE_SET.has(s));
  return readOnlyScopes.length > 0 ? readOnlyScopes : [...MCP_READ_SCOPES];
}

export function normalizeCanonicalResource(rawResource: string | null | undefined, canonicalResource: string): string {
  if (!rawResource) return canonicalResource;
  return rawResource.trim().replace(/\/+$/, '');
}
