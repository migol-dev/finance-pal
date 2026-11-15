import { supabase } from '@/lib/supabase';

export type SoftDeleteEntityType =
  | 'transaction'
  | 'fixed_item'
  | 'goal'
  | 'debt'
  | 'debt_payment';

export interface McpOAuthGrant {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string;
  scopes: string[];
  read_only: boolean;
  resource: string;
  aal2_verified_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface McpAuditLogEntry {
  id: string;
  grant_id: string | null;
  client_id: string | null;
  tool_name: string;
  is_write: boolean;
  status: string;
  error_code: string | null;
  summary: Record<string, unknown>;
  duration_ms: number | null;
  created_at: string;
}

export interface SoftDeletedItem {
  entity_type: SoftDeleteEntityType;
  entity_id: string;
  title: string;
  subtitle: string;
  amount: number;
  deleted_at: string;
  days_remaining: number;
}

export async function listActiveMcpGrants(userId: string): Promise<McpOAuthGrant[]> {
  const { data, error } = await supabase
    .from('mcp_oauth_grants')
    .select(
      'id, user_id, client_id, client_name, scopes, read_only, resource, aal2_verified_at, last_used_at, revoked_at, created_at, updated_at',
    )
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as McpOAuthGrant[];
}

export async function updateMcpGrantPermissions(
  grantId: string,
  userId: string,
  updates: { read_only?: boolean; scopes?: string[] },
): Promise<void> {
  const { error } = await supabase
    .from('mcp_oauth_grants')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', grantId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function revokeMcpGrant(grantId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('mcp_oauth_grants')
    .update({
      revoked_at: now,
      updated_at: now,
    })
    .eq('id', grantId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function revokeAllMcpGrants(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('mcp_oauth_grants')
    .update({
      revoked_at: now,
      updated_at: now,
    })
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (error) throw new Error(error.message);
}

export async function getMcpKillSwitchState(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('mcp_enabled')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || typeof data.mcp_enabled !== 'boolean') return true;
  return data.mcp_enabled;
}

export async function setMcpKillSwitchState(userId: string, enabled: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userId,
        mcp_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) throw new Error(error.message);
  return enabled;
}

export async function listMcpAuditLogs(userId: string, limit = 25): Promise<McpAuditLogEntry[]> {
  const { data, error } = await supabase
    .from('mcp_audit_log')
    .select('id, grant_id, client_id, tool_name, is_write, status, error_code, summary, duration_ms, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as McpAuditLogEntry[];
}

export async function listSoftDeletedItems(): Promise<SoftDeletedItem[]> {
  const { data, error } = await supabase.rpc('list_soft_deleted_items');
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? (data as SoftDeletedItem[]) : [];
}

export async function restoreSoftDeletedItem(
  entityType: SoftDeleteEntityType,
  entityId: string,
): Promise<{ restored: boolean; entity_type: string; entity_id: string }> {
  const { data, error } = await supabase.rpc('restore_soft_deleted_item', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw new Error(error.message);
  return data as { restored: boolean; entity_type: string; entity_id: string };
}

export async function purgeSoftDeletedItem(
  entityType: SoftDeleteEntityType,
  entityId: string,
): Promise<{ purged: boolean; entity_type: string; entity_id: string }> {
  const { data, error } = await supabase.rpc('purge_soft_deleted_item', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw new Error(error.message);
  return data as { purged: boolean; entity_type: string; entity_id: string };
}
