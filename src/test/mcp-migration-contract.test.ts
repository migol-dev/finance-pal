import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION_PATH = path.resolve(
  __dirname,
  '../../supabase/migrations/20261116000000_mcp_oauth_and_security.sql',
);

const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
const sqlNoComments = sql.replace(/--.*$/gm, '');

describe('Phase 1 Migration Contract (20261116000000_mcp_oauth_and_security.sql)', () => {
  it('never uses SET ROLE or SET LOCAL ROLE inside SECURITY DEFINER functions (PG17 guard)', () => {
    expect(sqlNoComments).not.toMatch(/SET\s+(LOCAL\s+)?ROLE\b/i);
  });

  it('adds mcp_enabled kill switch, ensures deleted_at columns and hardens goal_folders RLS', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN NOT NULL DEFAULT true');
    expect(sql).toContain('ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;');
    expect(sql).toContain('ALTER TABLE public.goal_folders ENABLE ROW LEVEL SECURITY');
  });

  it('schedules daily pg_cron cleanup for mcp_cleanup_expired()', () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pg_cron;');
    expect(sql).toContain("'mcp-cleanup-expired-daily'");
    expect(sql).toContain('SELECT public.mcp_cleanup_expired();');
  });

  it('creates all 8 mcp_* tables with ENABLE and FORCE ROW LEVEL SECURITY', () => {
    const tables = [
      'mcp_oauth_clients',
      'mcp_oauth_grants',
      'mcp_oauth_codes',
      'mcp_refresh_tokens',
      'mcp_rate_limits',
      'mcp_audit_log',
      'mcp_idempotency_keys',
      'mcp_delete_confirmations',
    ];
    for (const table of tables) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
      expect(sql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY`);
      expect(sql).toContain(`GRANT ALL ON public.${table} TO service_role`);
    }
  });

  it('locks down MCP gateway RPCs to service_role and requires is_mfa_compliant() + search_path', () => {
    const gatewayRpcs = [
      'mcp_assert_grant_context',
      'mcp_check_rate_limit',
      'mcp_compute_account_balances',
      'mcp_get_financial_overview',
      'mcp_list_accounts',
      'mcp_list_transactions',
      'mcp_get_spending_by_category',
      'mcp_list_fixed_items',
      'mcp_list_goals',
      'mcp_list_debts',
      'mcp_get_budget_60_20_20_status',
      'mcp_create_transaction',
      'mcp_update_transaction',
      'mcp_toggle_fixed_item',
      'mcp_create_fixed_item',
      'mcp_contribute_goal',
      'mcp_record_debt_payment',
      'mcp_create_goal',
      'mcp_create_debt',
      'mcp_prepare_soft_delete',
      'mcp_confirm_soft_delete',
      'mcp_cleanup_expired',
    ];

    for (const fn of gatewayRpcs) {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION public.${fn}(`);
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`, 's'));
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO service_role;`, 's'));
    }

    expect(sql).toContain('SET search_path = \'\'');
    expect(sql).toContain('public.is_mfa_compliant()');
    expect(sql).toContain("pg_catalog.set_config('statement_timeout', '3000ms', true)");
  });

  it('defines the 3 authenticated recovery trash RPCs and protects scheduled txs and accounts', () => {
    for (const fn of ['list_soft_deleted_items', 'restore_soft_deleted_item', 'purge_soft_deleted_item']) {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION public.${fn}(`);
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO authenticated, service_role;`, 's'));
    }

    expect(sql).toContain("IF p_entity_type = 'account' THEN");
    expect(sql).toContain('ACCOUNT_SOFT_DELETE_NOT_ALLOWED');
    expect(sql).toContain('v_tx.fixed_id IS NOT NULL');
    expect(sql).toContain('v_fixed_id IS NOT NULL');
    expect(sql).toContain('SCHEDULED_TX_IMMUTABLE');
  });

  it('never leaks bank/payee PII columns inside MCP read RPCs', () => {
    const readSection = sql
      .slice(sql.indexOf('-- Read RPC 1:'), sql.indexOf('-- 1.3 Idempotency'))
      .replace(/--.*$/gm, '');
    for (const forbidden of ['clabe', 'bank', 'holder_name', 'external_payee', 'receipt_url', 'purchase_url']) {
      expect(readSection).not.toContain(forbidden);
    }
  });
});
