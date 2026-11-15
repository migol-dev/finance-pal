-- ============================================================================
-- Sprint 11 — Remote MCP Server + OAuth 2.1 + Security Gateway + 30d Trash
-- Target: PostgreSQL 17 (Supabase)
-- NOTE: Intentionally idempotent. Do not use SET LOCAL ROLE inside
--       SECURITY DEFINER functions (forbidden in PostgreSQL 17).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 Schema Hardening, User Settings Kill Switch & MCP OAuth/Security Tables
-- ----------------------------------------------------------------------------

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.goal_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own goal folders" ON public.goal_folders;
CREATE POLICY "Users can view their own goal folders"
  ON public.goal_folders FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert their own goal folders" ON public.goal_folders;
CREATE POLICY "Users can insert their own goal folders"
  ON public.goal_folders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goal folders" ON public.goal_folders;
CREATE POLICY "Users can update their own goal folders"
  ON public.goal_folders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goal folders" ON public.goal_folders;
CREATE POLICY "Users can delete their own goal folders"
  ON public.goal_folders FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.goal_folders;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.goal_folders AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

-- Partial indexes (active non-deleted records)
CREATE INDEX IF NOT EXISTS idx_accounts_active_user
  ON public.accounts (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_active_user_date
  ON public.transactions (user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fixed_items_active_user
  ON public.fixed_items (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goals_active_user
  ON public.goals (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_debts_active_user
  ON public.debts (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_debt_payments_active_user_debt
  ON public.debt_payments (user_id, debt_id) WHERE deleted_at IS NULL;

-- 1. OAuth Registered & CIMD Clients
CREATE TABLE IF NOT EXISTS public.mcp_oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_uri TEXT,
  logo_uri TEXT,
  redirect_uris TEXT[] NOT NULL,
  grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code', 'refresh_token'],
  response_types TEXT[] NOT NULL DEFAULT ARRAY['code'],
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
  is_cimd BOOLEAN NOT NULL DEFAULT false,
  cimd_cached_until TIMESTAMPTZ,
  created_by_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User OAuth Grants / Active AI Connectors (max 5 enforced at API layer)
CREATE TABLE IF NOT EXISTS public.mcp_oauth_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  read_only BOOLEAN NOT NULL DEFAULT true,
  resource TEXT NOT NULL,
  aal2_verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_grants_user_active
  ON public.mcp_oauth_grants (user_id, created_at DESC) WHERE revoked_at IS NULL;

-- 3. Authorization Codes (hashed, single-use, 60s TTL, PKCE S256 mandatory)
CREATE TABLE IF NOT EXISTS public.mcp_oauth_codes (
  code_hash TEXT PRIMARY KEY,
  grant_id UUID NOT NULL REFERENCES public.mcp_oauth_grants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL DEFAULT 'S256' CHECK (code_challenge_method = 'S256'),
  resource TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_codes_expires ON public.mcp_oauth_codes (expires_at);

-- 4. Rotating Refresh Tokens with Family Reuse Detection
CREATE TABLE IF NOT EXISTS public.mcp_refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  grant_id UUID NOT NULL REFERENCES public.mcp_oauth_grants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  family_id UUID NOT NULL,
  parent_token_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mcp_refresh_tokens_family ON public.mcp_refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS idx_mcp_refresh_tokens_expires ON public.mcp_refresh_tokens (expires_at);

-- 5. Distributed Fixed-Window Rate Limits
CREATE TABLE IF NOT EXISTS public.mcp_rate_limits (
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);

-- 6. Privacy-Safe Audit Log (90-day retention, zero PII)
CREATE TABLE IF NOT EXISTS public.mcp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id UUID REFERENCES public.mcp_oauth_grants(id) ON DELETE SET NULL,
  client_id TEXT,
  tool_name TEXT NOT NULL,
  is_write BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL,
  error_code TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_user_created
  ON public.mcp_audit_log (user_id, created_at DESC);

-- 7. Mutation Idempotency Keys (24h TTL)
CREATE TABLE IF NOT EXISTS public.mcp_idempotency_keys (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  response_payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_name, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_mcp_idempotency_expires ON public.mcp_idempotency_keys (expires_at);

-- 8. 2-Step Soft-Delete Confirmations (120s TTL, single-use)
CREATE TABLE IF NOT EXISTS public.mcp_delete_confirmations (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES public.mcp_oauth_grants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('transaction', 'fixed_item', 'goal', 'debt', 'debt_payment')),
  entity_id UUID NOT NULL,
  preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mcp_delete_confirmations_expires ON public.mcp_delete_confirmations (expires_at);

-- Force RLS on all 8 MCP tables
ALTER TABLE public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_oauth_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_refresh_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_idempotency_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_delete_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_delete_confirmations FORCE ROW LEVEL SECURITY;

-- Least-privilege table grants
REVOKE ALL ON public.mcp_oauth_clients FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mcp_oauth_grants FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mcp_oauth_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mcp_refresh_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mcp_rate_limits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mcp_audit_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mcp_idempotency_keys FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mcp_delete_confirmations FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.mcp_oauth_clients TO service_role;
GRANT ALL ON public.mcp_oauth_grants TO service_role;
GRANT ALL ON public.mcp_oauth_codes TO service_role;
GRANT ALL ON public.mcp_refresh_tokens TO service_role;
GRANT ALL ON public.mcp_rate_limits TO service_role;
GRANT ALL ON public.mcp_audit_log TO service_role;
GRANT ALL ON public.mcp_idempotency_keys TO service_role;
GRANT ALL ON public.mcp_delete_confirmations TO service_role;

-- Authenticated user self-management of active grants & audit log inspection
GRANT SELECT, UPDATE (read_only, scopes, revoked_at, updated_at)
  ON public.mcp_oauth_grants TO authenticated;
GRANT SELECT ON public.mcp_audit_log TO authenticated;

DROP POLICY IF EXISTS "Users can view their own MCP grants" ON public.mcp_oauth_grants;
CREATE POLICY "Users can view their own MCP grants"
  ON public.mcp_oauth_grants FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_mfa_compliant());

DROP POLICY IF EXISTS "Users can update their own MCP grants" ON public.mcp_oauth_grants;
CREATE POLICY "Users can update their own MCP grants"
  ON public.mcp_oauth_grants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_mfa_compliant())
  WITH CHECK (auth.uid() = user_id AND public.is_mfa_compliant());

DROP POLICY IF EXISTS "Users can view their own MCP audit log" ON public.mcp_audit_log;
CREATE POLICY "Users can view their own MCP audit log"
  ON public.mcp_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_mfa_compliant());

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ----------------------------------------------------------------------------
-- 1.2 Gateway Security Context, Rate Limiter, Balance Helper & 8 Read RPCs
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mcp_assert_grant_context(
  p_grant_id UUID,
  p_required_scope TEXT,
  p_require_write BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_grant RECORD;
  v_mcp_enabled BOOLEAN;
  v_aal TEXT;
BEGIN
  PERFORM pg_catalog.set_config('statement_timeout', '3000ms', true);

  IF p_grant_id IS NULL THEN
    RAISE EXCEPTION 'GRANT_NOT_FOUND_OR_REVOKED';
  END IF;

  SELECT g.id, g.user_id, g.scopes, g.read_only, g.aal2_verified_at, g.revoked_at
  INTO v_grant
  FROM public.mcp_oauth_grants g
  WHERE g.id = p_grant_id;

  IF NOT FOUND OR v_grant.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'GRANT_NOT_FOUND_OR_REVOKED';
  END IF;

  SELECT COALESCE(us.mcp_enabled, true)
  INTO v_mcp_enabled
  FROM public.user_settings us
  WHERE us.user_id = v_grant.user_id;

  IF v_mcp_enabled IS FALSE THEN
    RAISE EXCEPTION 'MCP_DISABLED_BY_USER';
  END IF;

  -- Strictly derive AAL from database grant verification timestamp (no claim forging)
  v_aal := CASE WHEN v_grant.aal2_verified_at IS NOT NULL THEN 'aal2' ELSE 'aal1' END;
  PERFORM pg_catalog.set_config('request.jwt.claim.sub', v_grant.user_id::text, true);
  PERFORM pg_catalog.set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM pg_catalog.set_config(
    'request.jwt.claims',
    pg_catalog.jsonb_build_object(
      'sub', v_grant.user_id::text,
      'role', 'authenticated',
      'aal', v_aal
    )::text,
    true
  );

  IF NOT public.is_mfa_compliant() THEN
    RAISE EXCEPTION 'MFA_AAL2_REQUIRED';
  END IF;

  IF p_require_write AND v_grant.read_only THEN
    RAISE EXCEPTION 'READ_ONLY_MODE_ACTIVE';
  END IF;

  IF p_required_scope IS NOT NULL AND NOT (p_required_scope = ANY(v_grant.scopes)) THEN
    RAISE EXCEPTION 'INSUFFICIENT_SCOPE:%', p_required_scope;
  END IF;

  UPDATE public.mcp_oauth_grants
  SET last_used_at = pg_catalog.now()
  WHERE id = p_grant_id;

  RETURN v_grant.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_assert_grant_context(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_assert_grant_context(UUID, TEXT, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.mcp_check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER,
  p_max_requests INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_epoch DOUBLE PRECISION;
  v_win_sec INTEGER;
  v_window_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  PERFORM pg_catalog.set_config('statement_timeout', '3000ms', true);

  v_win_sec := GREATEST(COALESCE(p_window_seconds, 60), 1);
  v_epoch := pg_catalog.floor(EXTRACT(EPOCH FROM pg_catalog.now()) / v_win_sec) * v_win_sec;
  v_window_start := pg_catalog.to_timestamp(v_epoch);
  v_reset_at := v_window_start + pg_catalog.make_interval(secs => v_win_sec);

  INSERT INTO public.mcp_rate_limits (bucket_key, window_start, request_count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET request_count = public.mcp_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN pg_catalog.jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_count),
    'reset_at', v_reset_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Balance helper matching src/lib/finance.ts computeBalances()
CREATE OR REPLACE FUNCTION public.mcp_compute_account_balances(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cash_acc UUID;
  v_bank_acc UUID;
  v_first_acc UUID;
  v_balances JSONB := '{}'::jsonb;
  v_acc RECORD;
  v_tx RECORD;
  v_debt RECORD;
  v_pay RECORD;
  v_origin UUID;
  v_dest UUID;
  v_bal NUMERIC;
  v_is_i_owe BOOLEAN;
BEGIN
  SELECT id INTO v_cash_acc
  FROM public.accounts
  WHERE user_id = p_user_id AND deleted_at IS NULL AND type = 'cash'
  ORDER BY created_at ASC, id ASC LIMIT 1;

  SELECT id INTO v_bank_acc
  FROM public.accounts
  WHERE user_id = p_user_id AND deleted_at IS NULL AND type = 'bank'
  ORDER BY created_at ASC, id ASC LIMIT 1;
  v_bank_acc := COALESCE(v_bank_acc, v_cash_acc);

  SELECT id INTO v_first_acc
  FROM public.accounts
  WHERE user_id = p_user_id AND deleted_at IS NULL
  ORDER BY created_at ASC, id ASC LIMIT 1;

  FOR v_acc IN
    SELECT id, COALESCE(initial_balance, 0) AS initial_balance
    FROM public.accounts
    WHERE user_id = p_user_id AND deleted_at IS NULL
  LOOP
    v_balances := pg_catalog.jsonb_set(
      v_balances,
      ARRAY[v_acc.id::text],
      pg_catalog.to_jsonb(v_acc.initial_balance)
    );
  END LOOP;

  FOR v_tx IN
    SELECT type, amount, payment_method, account_id, transfer_to_account_id
    FROM public.transactions
    WHERE user_id = p_user_id AND deleted_at IS NULL
  LOOP
    v_origin := COALESCE(
      v_tx.account_id,
      CASE
        WHEN v_tx.payment_method = 'cash' THEN v_cash_acc
        WHEN v_tx.payment_method IN ('transfer', 'card') THEN v_bank_acc
        ELSE COALESCE(v_cash_acc, v_first_acc)
      END
    );

    IF v_tx.type = 'transfer' OR v_tx.transfer_to_account_id IS NOT NULL THEN
      IF v_origin IS NOT NULL AND v_balances ? (v_origin::text) THEN
        v_bal := (v_balances ->> v_origin::text)::numeric - ABS(v_tx.amount);
        v_balances := pg_catalog.jsonb_set(v_balances, ARRAY[v_origin::text], pg_catalog.to_jsonb(v_bal));
      END IF;
      v_dest := v_tx.transfer_to_account_id;
      IF v_dest IS NOT NULL AND v_balances ? (v_dest::text) THEN
        v_bal := (v_balances ->> v_dest::text)::numeric + ABS(v_tx.amount);
        v_balances := pg_catalog.jsonb_set(v_balances, ARRAY[v_dest::text], pg_catalog.to_jsonb(v_bal));
      END IF;
    ELSE
      IF v_origin IS NOT NULL AND v_balances ? (v_origin::text) THEN
        v_bal := (v_balances ->> v_origin::text)::numeric +
          CASE WHEN v_tx.type = 'income' THEN ABS(v_tx.amount) ELSE -ABS(v_tx.amount) END;
        v_balances := pg_catalog.jsonb_set(v_balances, ARRAY[v_origin::text], pg_catalog.to_jsonb(v_bal));
      END IF;
    END IF;
  END LOOP;

  FOR v_debt IN
    SELECT id, amount, note, account_id
    FROM public.debts
    WHERE user_id = p_user_id AND deleted_at IS NULL
  LOOP
    v_is_i_owe := COALESCE(v_debt.note, '') LIKE '%[yo_debo]%';

    IF v_debt.account_id IS NOT NULL AND v_balances ? (v_debt.account_id::text) THEN
      v_bal := (v_balances ->> v_debt.account_id::text)::numeric +
        CASE WHEN v_is_i_owe THEN v_debt.amount ELSE -v_debt.amount END;
      v_balances := pg_catalog.jsonb_set(v_balances, ARRAY[v_debt.account_id::text], pg_catalog.to_jsonb(v_bal));
    END IF;

    FOR v_pay IN
      SELECT amount, payment_method, account_id
      FROM public.debt_payments
      WHERE user_id = p_user_id AND debt_id = v_debt.id AND deleted_at IS NULL
    LOOP
      v_origin := COALESCE(
        v_pay.account_id,
        CASE
          WHEN v_pay.payment_method = 'cash' THEN v_cash_acc
          WHEN v_pay.payment_method IN ('transfer', 'card') THEN v_bank_acc
          ELSE COALESCE(v_cash_acc, v_first_acc)
        END
      );
      IF v_origin IS NOT NULL AND v_balances ? (v_origin::text) THEN
        v_bal := (v_balances ->> v_origin::text)::numeric +
          CASE WHEN v_is_i_owe THEN -v_pay.amount ELSE v_pay.amount END;
        v_balances := pg_catalog.jsonb_set(v_balances, ARRAY[v_origin::text], pg_catalog.to_jsonb(v_bal));
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_balances;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_compute_account_balances(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_compute_account_balances(UUID) TO service_role;

-- Helper: monthly equivalent matching src/lib/finance.ts monthlyAmount()
CREATE OR REPLACE FUNCTION public.mcp_fixed_monthly_amount(
  p_amount NUMERIC,
  p_frequency TEXT,
  p_active BOOLEAN
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN COALESCE(p_active, false) IS FALSE THEN 0
    WHEN p_frequency = 'monthly' THEN p_amount
    WHEN p_frequency = 'biweekly' THEN p_amount * 2
    WHEN p_frequency = 'weekly' THEN p_amount * 4.345
    WHEN p_frequency IN ('yearly', 'annual') THEN p_amount / 12.0
    WHEN p_frequency = 'bimonthly' THEN p_amount / 2.0
    WHEN p_frequency = 'quarterly' THEN p_amount / 3.0
    WHEN p_frequency = 'fourmonthly' THEN p_amount / 4.0
    WHEN p_frequency = 'biannual' THEN p_amount / 6.0
    ELSE 0
  END;
$$;

REVOKE ALL ON FUNCTION public.mcp_fixed_monthly_amount(NUMERIC, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_fixed_monthly_amount(NUMERIC, TEXT, BOOLEAN) TO service_role;

-- Read RPC 1: Financial Overview
CREATE OR REPLACE FUNCTION public.mcp_get_financial_overview(
  p_grant_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_year INTEGER;
  v_month INTEGER;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_balances JSONB;
  v_total_balance NUMERIC := 0;
  v_income NUMERIC := 0;
  v_expenses NUMERIC := 0;
  v_savings NUMERIC := 0;
  v_transfers NUMERIC := 0;
  v_tx_count INTEGER := 0;
  v_goals_saved NUMERIC := 0;
  v_goals_target NUMERIC := 0;
  v_owed_to_me NUMERIC := 0;
  v_i_owe NUMERIC := 0;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:read:overview', false);
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM (pg_catalog.now() AT TIME ZONE 'UTC'))::int);
  v_month := COALESCE(p_month, EXTRACT(MONTH FROM (pg_catalog.now() AT TIME ZONE 'UTC'))::int);

  IF v_year < 2000 OR v_year > 2100 OR v_month < 1 OR v_month > 12 THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;

  v_start := pg_catalog.make_timestamptz(v_year, v_month, 1, 0, 0, 0, 'UTC');
  v_end := v_start + INTERVAL '1 month';
  v_balances := public.mcp_compute_account_balances(v_user_id);

  SELECT COALESCE(SUM((kv.value)::numeric), 0)
  INTO v_total_balance
  FROM pg_catalog.jsonb_each_text(v_balances) kv;

  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'saving' THEN ABS(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'transfer' OR t.transfer_to_account_id IS NOT NULL THEN ABS(t.amount) ELSE 0 END), 0),
    COUNT(*)::int
  INTO v_income, v_expenses, v_savings, v_transfers, v_tx_count
  FROM public.transactions t
  WHERE t.user_id = v_user_id
    AND t.deleted_at IS NULL
    AND t.date >= v_start
    AND t.date < v_end;

  SELECT COALESCE(SUM(g.saved), 0), COALESCE(SUM(g.target), 0)
  INTO v_goals_saved, v_goals_target
  FROM public.goals g
  WHERE g.user_id = v_user_id AND g.deleted_at IS NULL;

  SELECT
    COALESCE(SUM(CASE WHEN NOT (COALESCE(d.note, '') LIKE '%[yo_debo]%')
      THEN GREATEST(0, d.amount - COALESCE(p.paid, 0)) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN COALESCE(d.note, '') LIKE '%[yo_debo]%'
      THEN GREATEST(0, d.amount - COALESCE(p.paid, 0)) ELSE 0 END), 0)
  INTO v_owed_to_me, v_i_owe
  FROM public.debts d
  LEFT JOIN (
    SELECT debt_id, SUM(amount) AS paid
    FROM public.debt_payments
    WHERE user_id = v_user_id AND deleted_at IS NULL
    GROUP BY debt_id
  ) p ON p.debt_id = d.id
  WHERE d.user_id = v_user_id AND d.deleted_at IS NULL;

  RETURN pg_catalog.jsonb_build_object(
    'period', pg_catalog.jsonb_build_object('year', v_year, 'month', v_month),
    'total_balance', pg_catalog.round(v_total_balance, 2),
    'month_income', pg_catalog.round(v_income, 2),
    'month_expenses', pg_catalog.round(v_expenses, 2),
    'month_savings', pg_catalog.round(v_savings, 2),
    'month_transfers', pg_catalog.round(v_transfers, 2),
    'month_net_cashflow', pg_catalog.round(v_income - v_expenses - v_savings, 2),
    'transaction_count', v_tx_count,
    'goals_saved_total', pg_catalog.round(v_goals_saved, 2),
    'goals_target_total', pg_catalog.round(v_goals_target, 2),
    'debts_owed_to_me_remaining', pg_catalog.round(v_owed_to_me, 2),
    'debts_i_owe_remaining', pg_catalog.round(v_i_owe, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_get_financial_overview(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_get_financial_overview(UUID, INTEGER, INTEGER) TO service_role;

-- Read RPC 2: List Accounts (zero PII: omits clabe, bank, holder_name)
CREATE OR REPLACE FUNCTION public.mcp_list_accounts(p_grant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_balances JSONB;
  v_items JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:read:accounts', false);
  v_balances := public.mcp_compute_account_balances(v_user_id);

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', a.id,
        'name', a.name,
        'type', a.type,
        'currency', COALESCE(a.currency, 'MXN'),
        'initial_balance', COALESCE(a.initial_balance, 0),
        'current_balance', COALESCE((v_balances ->> a.id::text)::numeric, COALESCE(a.initial_balance, 0)),
        'updated_at', a.updated_at
      )
      ORDER BY a.created_at ASC, a.id ASC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.accounts a
  WHERE a.user_id = v_user_id AND a.deleted_at IS NULL;

  RETURN pg_catalog.jsonb_build_object('accounts', v_items, 'count', pg_catalog.jsonb_array_length(v_items));
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_list_accounts(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_list_accounts(UUID) TO service_role;

-- Read RPC 3: List Transactions (max 50 rows, max 90 days, zero PII)
CREATE OR REPLACE FUNCTION public.mcp_list_transactions(
  p_grant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_limit INTEGER;
  v_offset INTEGER;
  v_search_esc TEXT;
  v_items JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:read:transactions', false);
  v_end := COALESCE(p_end_date, pg_catalog.now());
  v_start := COALESCE(p_start_date, v_end - INTERVAL '30 days');

  IF v_start > v_end OR (v_end - v_start) > INTERVAL '90 days' THEN
    RAISE EXCEPTION 'INVALID_DATE_RANGE';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 50);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  IF p_search IS NOT NULL AND pg_catalog.btrim(p_search) <> '' THEN
    v_search_esc := '%' || pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
      pg_catalog.btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', sub.id,
        'type', sub.type,
        'category', sub.category,
        'concept', sub.concept,
        'amount', sub.amount,
        'date', sub.date,
        'note', sub.note,
        'payment_method', sub.payment_method,
        'account_id', sub.account_id,
        'transfer_to_account_id', sub.transfer_to_account_id,
        'is_scheduled', (sub.fixed_id IS NOT NULL)
      )
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT t.id, t.type, t.category, t.concept, t.amount, t.date, t.note,
           t.payment_method, t.account_id, t.transfer_to_account_id, t.fixed_id
    FROM public.transactions t
    WHERE t.user_id = v_user_id
      AND t.deleted_at IS NULL
      AND t.date >= v_start
      AND t.date <= v_end
      AND (p_type IS NULL OR t.type = p_type)
      AND (p_category IS NULL OR LOWER(t.category) = LOWER(p_category))
      AND (p_account_id IS NULL OR t.account_id = p_account_id OR t.transfer_to_account_id = p_account_id)
      AND (
        v_search_esc IS NULL
        OR t.concept ILIKE v_search_esc ESCAPE '\'
        OR t.category ILIKE v_search_esc ESCAPE '\'
        OR COALESCE(t.note, '') ILIKE v_search_esc ESCAPE '\'
      )
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  ) sub;

  RETURN pg_catalog.jsonb_build_object(
    'transactions', v_items,
    'count', pg_catalog.jsonb_array_length(v_items),
    'limit', v_limit,
    'offset', v_offset,
    'window', pg_catalog.jsonb_build_object('start_date', v_start, 'end_date', v_end)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_list_transactions(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_list_transactions(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- Read RPC 4: Spending by Category (max 90 days)
CREATE OR REPLACE FUNCTION public.mcp_get_spending_by_category(
  p_grant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_categories JSONB;
  v_total NUMERIC := 0;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:read:transactions', false);
  v_end := COALESCE(p_end_date, pg_catalog.now());
  v_start := COALESCE(p_start_date, v_end - INTERVAL '30 days');

  IF v_start > v_end OR (v_end - v_start) > INTERVAL '90 days' THEN
    RAISE EXCEPTION 'INVALID_DATE_RANGE';
  END IF;

  SELECT COALESCE(SUM(ABS(t.amount)), 0)
  INTO v_total
  FROM public.transactions t
  WHERE t.user_id = v_user_id
    AND t.deleted_at IS NULL
    AND t.type = 'expense'
    AND t.date >= v_start
    AND t.date <= v_end;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'category', c.category,
        'total', pg_catalog.round(c.total, 2),
        'count', c.cnt,
        'percentage', CASE WHEN v_total > 0 THEN pg_catalog.round((c.total / v_total) * 100.0, 2) ELSE 0 END
      )
      ORDER BY c.total DESC
    ),
    '[]'::jsonb
  )
  INTO v_categories
  FROM (
    SELECT t.category, SUM(ABS(t.amount)) AS total, COUNT(*)::int AS cnt
    FROM public.transactions t
    WHERE t.user_id = v_user_id
      AND t.deleted_at IS NULL
      AND t.type = 'expense'
      AND t.date >= v_start
      AND t.date <= v_end
    GROUP BY t.category
  ) c;

  RETURN pg_catalog.jsonb_build_object(
    'total_expense', pg_catalog.round(v_total, 2),
    'categories', v_categories,
    'window', pg_catalog.jsonb_build_object('start_date', v_start, 'end_date', v_end)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_get_spending_by_category(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_get_spending_by_category(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- Read RPC 5: List Fixed Items
CREATE OR REPLACE FUNCTION public.mcp_list_fixed_items(
  p_grant_id UUID,
  p_active_only BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_items JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:read:fixed_items', false);

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', f.id,
        'type', f.type,
        'category', f.category,
        'concept', f.concept,
        'amount', f.amount,
        'frequency', f.frequency,
        'monthly_equivalent', pg_catalog.round(public.mcp_fixed_monthly_amount(f.amount, f.frequency, f.active), 2),
        'active', COALESCE(f.active, true),
        'priority', f.priority,
        'pay_day', f.pay_day,
        'pay_week_day', f.pay_week_day,
        'payment_method', f.payment_method,
        'account_id', f.account_id,
        'start_date', f.start_date,
        'end_date', f.end_date,
        'note', f.note
      )
      ORDER BY f.type ASC, f.concept ASC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.fixed_items f
  WHERE f.user_id = v_user_id
    AND f.deleted_at IS NULL
    AND (NOT COALESCE(p_active_only, false) OR COALESCE(f.active, true) IS TRUE);

  RETURN pg_catalog.jsonb_build_object('fixed_items', v_items, 'count', pg_catalog.jsonb_array_length(v_items));
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_list_fixed_items(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_list_fixed_items(UUID, BOOLEAN) TO service_role;

-- Read RPC 6: List Goals (omits purchase_url)
CREATE OR REPLACE FUNCTION public.mcp_list_goals(p_grant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_items JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:read:goals', false);

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'target', g.target,
        'saved', COALESCE(g.saved, 0),
        'remaining', GREATEST(0, g.target - COALESCE(g.saved, 0)),
        'progress_pct', CASE WHEN g.target > 0
          THEN LEAST(100, pg_catalog.round((COALESCE(g.saved, 0) / g.target) * 100.0, 2))
          ELSE 0 END,
        'deadline', g.deadline,
        'pinned', COALESCE(g.pinned, false),
        'folder_id', g.folder_id,
        'contribution_count', CASE WHEN pg_catalog.jsonb_typeof(g.contributions) = 'array'
          THEN pg_catalog.jsonb_array_length(g.contributions) ELSE 0 END
      )
      ORDER BY COALESCE(g.pinned, false) DESC, g.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.goals g
  WHERE g.user_id = v_user_id AND g.deleted_at IS NULL;

  RETURN pg_catalog.jsonb_build_object('goals', v_items, 'count', pg_catalog.jsonb_array_length(v_items));
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_list_goals(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_list_goals(UUID) TO service_role;

-- Read RPC 7: List Debts with aggregated public.debt_payments
CREATE OR REPLACE FUNCTION public.mcp_list_debts(p_grant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_items JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:read:debts', false);

  SELECT COALESCE(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', d.id,
        'person', d.person,
        'concept', d.concept,
        'direction', CASE WHEN COALESCE(d.note, '') LIKE '%[yo_debo]%' THEN 'i_owe' ELSE 'owed_to_me' END,
        'amount', d.amount,
        'paid_amount', COALESCE(p.paid_total, 0),
        'remaining_amount', GREATEST(0, d.amount - COALESCE(p.paid_total, 0)),
        'status', CASE WHEN COALESCE(p.paid_total, 0) >= d.amount THEN 'settled' ELSE 'open' END,
        'date', d.date,
        'due_date', d.due_date,
        'account_id', d.account_id,
        'note', d.note,
        'recent_payments', COALESCE(p.payments_json, '[]'::jsonb)
      )
      ORDER BY d.date DESC
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.debts d
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(dp.amount), 0) AS paid_total,
      COALESCE(
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', dp.id,
            'amount', dp.amount,
            'date', dp.date,
            'payment_method', dp.payment_method,
            'account_id', dp.account_id,
            'note', dp.note
          )
          ORDER BY dp.date DESC
        ),
        '[]'::jsonb
      ) AS payments_json
    FROM public.debt_payments dp
    WHERE dp.user_id = v_user_id AND dp.debt_id = d.id AND dp.deleted_at IS NULL
  ) p ON true
  WHERE d.user_id = v_user_id AND d.deleted_at IS NULL;

  RETURN pg_catalog.jsonb_build_object('debts', v_items, 'count', pg_catalog.jsonb_array_length(v_items));
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_list_debts(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_list_debts(UUID) TO service_role;

-- Read RPC 8: 60 / 20 / 20 Budget Status
CREATE OR REPLACE FUNCTION public.mcp_get_budget_60_20_20_status(
  p_grant_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_year INTEGER;
  v_month INTEGER;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_month_income NUMERIC := 0;
  v_month_expense NUMERIC := 0;
  v_month_saving NUMERIC := 0;
  v_fixed_income NUMERIC := 0;
  v_fixed_needs NUMERIC := 0;
  v_fixed_saving NUMERIC := 0;
  v_base_income NUMERIC := 0;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:read:overview', false);
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM (pg_catalog.now() AT TIME ZONE 'UTC'))::int);
  v_month := COALESCE(p_month, EXTRACT(MONTH FROM (pg_catalog.now() AT TIME ZONE 'UTC'))::int);

  IF v_year < 2000 OR v_year > 2100 OR v_month < 1 OR v_month > 12 THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;

  v_start := pg_catalog.make_timestamptz(v_year, v_month, 1, 0, 0, 0, 'UTC');
  v_end := v_start + INTERVAL '1 month';

  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN ABS(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'saving' THEN ABS(t.amount) ELSE 0 END), 0)
  INTO v_month_income, v_month_expense, v_month_saving
  FROM public.transactions t
  WHERE t.user_id = v_user_id
    AND t.deleted_at IS NULL
    AND t.date >= v_start
    AND t.date < v_end;

  SELECT
    COALESCE(SUM(CASE WHEN f.type = 'income_fixed' THEN public.mcp_fixed_monthly_amount(f.amount, f.frequency, f.active) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN f.type IN ('expense_fixed', 'expense_variable') THEN public.mcp_fixed_monthly_amount(f.amount, f.frequency, f.active) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN f.type = 'saving_fixed' THEN public.mcp_fixed_monthly_amount(f.amount, f.frequency, f.active) ELSE 0 END), 0)
  INTO v_fixed_income, v_fixed_needs, v_fixed_saving
  FROM public.fixed_items f
  WHERE f.user_id = v_user_id AND f.deleted_at IS NULL;

  v_base_income := GREATEST(v_month_income, v_fixed_income);

  RETURN pg_catalog.jsonb_build_object(
    'period', pg_catalog.jsonb_build_object('year', v_year, 'month', v_month),
    'income_base', pg_catalog.round(v_base_income, 2),
    'fixed_plan', pg_catalog.jsonb_build_object(
      'income', pg_catalog.round(v_fixed_income, 2),
      'fixed_obligations', pg_catalog.round(v_fixed_needs, 2),
      'planned_savings', pg_catalog.round(v_fixed_saving, 2)
    ),
    'actuals', pg_catalog.jsonb_build_object(
      'income', pg_catalog.round(v_month_income, 2),
      'expenses', pg_catalog.round(v_month_expense, 2),
      'savings', pg_catalog.round(v_month_saving, 2)
    ),
    'targets_60_20_20', pg_catalog.jsonb_build_object(
      'needs_60_budget', pg_catalog.round(v_base_income * 0.60, 2),
      'wants_20_budget', pg_catalog.round(v_base_income * 0.20, 2),
      'savings_20_target', pg_catalog.round(v_base_income * 0.20, 2),
      'actual_expense_pct', CASE WHEN v_base_income > 0 THEN pg_catalog.round((v_month_expense / v_base_income) * 100.0, 2) ELSE 0 END,
      'actual_saving_pct', CASE WHEN v_base_income > 0 THEN pg_catalog.round((v_month_saving / v_base_income) * 100.0, 2) ELSE 0 END
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_get_budget_60_20_20_status(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_get_budget_60_20_20_status(UUID, INTEGER, INTEGER) TO service_role;

-- ----------------------------------------------------------------------------
-- 1.3 Idempotency, Validation Helpers, 9 Write/Soft-Delete RPCs, Cleanup & Trash
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mcp_validate_payment_method(
  p_user_id UUID,
  p_account_id UUID,
  p_payment_method TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_acc_type TEXT;
BEGIN
  IF p_payment_method NOT IN ('cash', 'transfer', 'card', 'other') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD';
  END IF;

  IF p_account_id IS NULL THEN
    RETURN;
  END IF;

  SELECT a.type INTO v_acc_type
  FROM public.accounts a
  WHERE a.id = p_account_id AND a.user_id = p_user_id AND a.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_FOUND';
  END IF;

  IF v_acc_type = 'cash' AND p_payment_method <> 'cash' THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_FOR_ACCOUNT';
  ELSIF v_acc_type = 'bank' AND p_payment_method NOT IN ('card', 'transfer') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_FOR_ACCOUNT';
  ELSIF v_acc_type = 'other' AND p_payment_method NOT IN ('card', 'transfer', 'other') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD_FOR_ACCOUNT';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_validate_payment_method(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_validate_payment_method(UUID, UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.mcp_check_idempotency(
  p_user_id UUID,
  p_tool_name TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payload JSONB;
BEGIN
  IF p_idempotency_key IS NULL OR pg_catalog.btrim(p_idempotency_key) = '' THEN
    RETURN NULL;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_user_id::text || ':' || p_tool_name || ':' || p_idempotency_key)
  );

  SELECT k.response_payload INTO v_payload
  FROM public.mcp_idempotency_keys k
  WHERE k.user_id = p_user_id
    AND k.tool_name = p_tool_name
    AND k.idempotency_key = p_idempotency_key
    AND k.expires_at > pg_catalog.now();

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_check_idempotency(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_check_idempotency(UUID, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.mcp_save_idempotency(
  p_user_id UUID,
  p_tool_name TEXT,
  p_idempotency_key TEXT,
  p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_idempotency_key IS NULL OR pg_catalog.btrim(p_idempotency_key) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.mcp_idempotency_keys (user_id, tool_name, idempotency_key, response_payload, expires_at)
  VALUES (p_user_id, p_tool_name, p_idempotency_key, p_payload, pg_catalog.now() + INTERVAL '24 hours')
  ON CONFLICT (user_id, tool_name, idempotency_key)
  DO UPDATE SET response_payload = EXCLUDED.response_payload, expires_at = EXCLUDED.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_save_idempotency(UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_save_idempotency(UUID, TEXT, TEXT, JSONB) TO service_role;

-- Write RPC 1: Create Transaction
CREATE OR REPLACE FUNCTION public.mcp_create_transaction(
  p_grant_id UUID,
  p_idempotency_key TEXT,
  p_type TEXT,
  p_category TEXT,
  p_concept TEXT,
  p_amount NUMERIC,
  p_date TIMESTAMPTZ DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_transfer_to_account_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_method TEXT;
  v_tx_id UUID;
  v_dest_exists BOOLEAN;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:write:transactions', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'create_transaction', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  IF p_type NOT IN ('income', 'expense', 'saving', 'transfer') THEN
    RAISE EXCEPTION 'INVALID_TRANSACTION_TYPE';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'AMOUNT_MUST_BE_POSITIVE';
  END IF;

  v_method := COALESCE(p_payment_method, CASE WHEN p_type = 'transfer' THEN 'transfer' ELSE 'cash' END);
  PERFORM public.mcp_validate_payment_method(v_user_id, p_account_id, v_method);

  IF p_type = 'transfer' THEN
    IF p_account_id IS NULL OR p_transfer_to_account_id IS NULL OR p_account_id = p_transfer_to_account_id THEN
      RAISE EXCEPTION 'INVALID_TRANSFER_TARGET';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = p_transfer_to_account_id AND a.user_id = v_user_id AND a.deleted_at IS NULL
    ) INTO v_dest_exists;
    IF NOT v_dest_exists THEN
      RAISE EXCEPTION 'INVALID_TRANSFER_TARGET';
    END IF;
  END IF;

  INSERT INTO public.transactions (
    user_id, type, category, concept, amount, date, note, payment_method, account_id, transfer_to_account_id
  )
  VALUES (
    v_user_id,
    p_type,
    LEFT(pg_catalog.btrim(p_category), 60),
    LEFT(pg_catalog.btrim(p_concept), 140),
    pg_catalog.round(p_amount, 2),
    COALESCE(p_date, pg_catalog.now()),
    LEFT(p_note, 500),
    v_method,
    p_account_id,
    CASE WHEN p_type = 'transfer' THEN p_transfer_to_account_id ELSE NULL END
  )
  RETURNING id INTO v_tx_id;

  v_res := pg_catalog.jsonb_build_object(
    'id', v_tx_id,
    'type', p_type,
    'category', LEFT(pg_catalog.btrim(p_category), 60),
    'concept', LEFT(pg_catalog.btrim(p_concept), 140),
    'amount', pg_catalog.round(p_amount, 2),
    'payment_method', v_method,
    'account_id', p_account_id
  );

  PERFORM public.mcp_save_idempotency(v_user_id, 'create_transaction', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_create_transaction(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_create_transaction(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT) TO service_role;

-- Write RPC 2: Update Transaction (blocks scheduled transactions where fixed_id IS NOT NULL)
CREATE OR REPLACE FUNCTION public.mcp_update_transaction(
  p_grant_id UUID,
  p_idempotency_key TEXT,
  p_transaction_id UUID,
  p_category TEXT DEFAULT NULL,
  p_concept TEXT DEFAULT NULL,
  p_amount NUMERIC DEFAULT NULL,
  p_date TIMESTAMPTZ DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_tx RECORD;
  v_next_method TEXT;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:write:transactions', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'update_transaction', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  SELECT * INTO v_tx
  FROM public.transactions t
  WHERE t.id = p_transaction_id AND t.user_id = v_user_id AND t.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSACTION_NOT_FOUND';
  END IF;

  IF v_tx.fixed_id IS NOT NULL THEN
    RAISE EXCEPTION 'SCHEDULED_TX_IMMUTABLE';
  END IF;

  IF p_amount IS NOT NULL AND p_amount <= 0 THEN
    RAISE EXCEPTION 'AMOUNT_MUST_BE_POSITIVE';
  END IF;

  v_next_method := COALESCE(p_payment_method, v_tx.payment_method, 'cash');
  IF p_payment_method IS NOT NULL THEN
    PERFORM public.mcp_validate_payment_method(v_user_id, v_tx.account_id, v_next_method);
  END IF;

  UPDATE public.transactions
  SET
    category = COALESCE(NULLIF(LEFT(pg_catalog.btrim(p_category), 60), ''), category),
    concept = COALESCE(NULLIF(LEFT(pg_catalog.btrim(p_concept), 140), ''), concept),
    amount = COALESCE(CASE WHEN p_amount IS NOT NULL THEN pg_catalog.round(p_amount, 2) END, amount),
    date = COALESCE(p_date, date),
    note = COALESCE(LEFT(p_note, 500), note),
    payment_method = v_next_method,
    updated_at = pg_catalog.now()
  WHERE id = p_transaction_id AND user_id = v_user_id;

  SELECT pg_catalog.jsonb_build_object(
    'id', t.id,
    'type', t.type,
    'category', t.category,
    'concept', t.concept,
    'amount', t.amount,
    'date', t.date,
    'payment_method', t.payment_method,
    'updated_at', t.updated_at
  )
  INTO v_res
  FROM public.transactions t
  WHERE t.id = p_transaction_id;

  PERFORM public.mcp_save_idempotency(v_user_id, 'update_transaction', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_update_transaction(UUID, TEXT, UUID, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_update_transaction(UUID, TEXT, UUID, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, TEXT) TO service_role;

-- Write RPC 3: Toggle Fixed Item
CREATE OR REPLACE FUNCTION public.mcp_toggle_fixed_item(
  p_grant_id UUID,
  p_idempotency_key TEXT,
  p_fixed_item_id UUID,
  p_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_current BOOLEAN;
  v_next BOOLEAN;
  v_concept TEXT;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:write:fixed_items', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'toggle_fixed_item', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  SELECT COALESCE(f.active, true), f.concept INTO v_current, v_concept
  FROM public.fixed_items f
  WHERE f.id = p_fixed_item_id AND f.user_id = v_user_id AND f.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FIXED_ITEM_NOT_FOUND';
  END IF;

  v_next := COALESCE(p_active, NOT v_current);

  UPDATE public.fixed_items
  SET active = v_next, updated_at = pg_catalog.now()
  WHERE id = p_fixed_item_id AND user_id = v_user_id;

  v_res := pg_catalog.jsonb_build_object(
    'id', p_fixed_item_id,
    'concept', v_concept,
    'active', v_next
  );

  PERFORM public.mcp_save_idempotency(v_user_id, 'toggle_fixed_item', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_toggle_fixed_item(UUID, TEXT, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_toggle_fixed_item(UUID, TEXT, UUID, BOOLEAN) TO service_role;

-- Write RPC 4: Create Fixed Item
CREATE OR REPLACE FUNCTION public.mcp_create_fixed_item(
  p_grant_id UUID,
  p_idempotency_key TEXT,
  p_type TEXT,
  p_category TEXT,
  p_concept TEXT,
  p_amount NUMERIC,
  p_frequency TEXT,
  p_priority TEXT DEFAULT 'medium',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_pay_day INTEGER DEFAULT NULL,
  p_pay_week_day INTEGER DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_id UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_method TEXT;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:write:fixed_items', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'create_fixed_item', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  IF p_type NOT IN ('income_fixed', 'expense_fixed', 'expense_variable', 'saving_fixed') THEN
    RAISE EXCEPTION 'INVALID_FIXED_ITEM_TYPE';
  END IF;
  IF p_frequency NOT IN ('monthly', 'biweekly', 'weekly', 'yearly', 'one_time', 'bimonthly', 'quarterly', 'fourmonthly', 'biannual') THEN
    RAISE EXCEPTION 'INVALID_FREQUENCY';
  END IF;
  IF p_priority NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'INVALID_PRIORITY';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'AMOUNT_MUST_BE_POSITIVE';
  END IF;

  v_method := COALESCE(p_payment_method, 'cash');
  PERFORM public.mcp_validate_payment_method(v_user_id, p_account_id, v_method);

  v_start := COALESCE(p_start_date, pg_catalog.now());
  v_end := COALESCE(p_end_date, v_start + INTERVAL '10 years');

  INSERT INTO public.fixed_items (
    user_id, type, category, concept, amount, frequency, active, note,
    start_date, end_date, priority, pay_day, pay_week_day, payment_method, account_id
  )
  VALUES (
    v_user_id, p_type, LEFT(pg_catalog.btrim(p_category), 60),
    LEFT(pg_catalog.btrim(p_concept), 140), pg_catalog.round(p_amount, 2), p_frequency, true,
    LEFT(p_note, 500), v_start, v_end, p_priority, p_pay_day, p_pay_week_day, v_method, p_account_id
  )
  RETURNING id INTO v_id;

  v_res := pg_catalog.jsonb_build_object(
    'id', v_id,
    'type', p_type,
    'category', LEFT(pg_catalog.btrim(p_category), 60),
    'concept', LEFT(pg_catalog.btrim(p_concept), 140),
    'amount', pg_catalog.round(p_amount, 2),
    'frequency', p_frequency,
    'active', true
  );

  PERFORM public.mcp_save_idempotency(v_user_id, 'create_fixed_item', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_create_fixed_item(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_create_fixed_item(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER, TEXT, UUID, TEXT) TO service_role;

-- Write RPC 5: Contribute to Goal (atomic goal update + Meta transaction)
CREATE OR REPLACE FUNCTION public.mcp_contribute_goal(
  p_grant_id UUID,
  p_idempotency_key TEXT,
  p_goal_id UUID,
  p_amount NUMERIC,
  p_date TIMESTAMPTZ DEFAULT NULL,
  p_account_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_goal RECORD;
  v_new_saved NUMERIC;
  v_contrib JSONB;
  v_method TEXT;
  v_tx_id UUID;
  v_when TIMESTAMPTZ;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:write:goals', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'contribute_goal', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'AMOUNT_MUST_BE_NONZERO';
  END IF;

  SELECT id, name, target, COALESCE(saved, 0) AS saved,
         CASE WHEN pg_catalog.jsonb_typeof(contributions) = 'array' THEN contributions ELSE '[]'::jsonb END AS contributions
  INTO v_goal
  FROM public.goals
  WHERE id = p_goal_id AND user_id = v_user_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GOAL_NOT_FOUND';
  END IF;

  v_new_saved := pg_catalog.round(v_goal.saved + p_amount, 2);
  IF v_new_saved < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_GOAL_SAVED';
  END IF;

  v_when := COALESCE(p_date, pg_catalog.now());
  v_method := CASE
    WHEN p_account_id IS NOT NULL THEN (CASE WHEN p_amount >= 0 THEN 'transfer' ELSE 'cash' END)
    ELSE 'cash'
  END;

  IF p_account_id IS NOT NULL THEN
    SELECT CASE WHEN a.type = 'cash' THEN 'cash' ELSE 'transfer' END INTO v_method
    FROM public.accounts a
    WHERE a.id = p_account_id AND a.user_id = v_user_id AND a.deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ACCOUNT_NOT_FOUND';
    END IF;
  END IF;

  v_contrib := pg_catalog.jsonb_build_object(
    'id', pg_catalog.gen_random_uuid()::text,
    'amount', p_amount,
    'date', v_when,
    'accountId', p_account_id
  );

  UPDATE public.goals
  SET saved = v_new_saved,
      contributions = v_goal.contributions || pg_catalog.jsonb_build_array(v_contrib),
      updated_at = pg_catalog.now()
  WHERE id = p_goal_id AND user_id = v_user_id;

  INSERT INTO public.transactions (
    user_id, type, category, concept, amount, date, account_id, payment_method
  )
  VALUES (
    v_user_id,
    CASE WHEN p_amount >= 0 THEN 'saving' ELSE 'income' END,
    'Meta',
    LEFT((CASE WHEN p_amount >= 0 THEN 'Aporte ' ELSE 'Retiro ' END) || v_goal.name, 140),
    ABS(pg_catalog.round(p_amount, 2)),
    v_when,
    p_account_id,
    v_method
  )
  RETURNING id INTO v_tx_id;

  v_res := pg_catalog.jsonb_build_object(
    'goal_id', p_goal_id,
    'goal_name', v_goal.name,
    'saved', v_new_saved,
    'target', v_goal.target,
    'transaction_id', v_tx_id
  );

  PERFORM public.mcp_save_idempotency(v_user_id, 'contribute_goal', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_contribute_goal(UUID, TEXT, UUID, NUMERIC, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_contribute_goal(UUID, TEXT, UUID, NUMERIC, TIMESTAMPTZ, UUID) TO service_role;

-- Write RPC 6: Record Debt Payment (inserts ONLY into debt_payments; computeBalances aggregates debt_payments directly)
CREATE OR REPLACE FUNCTION public.mcp_record_debt_payment(
  p_grant_id UUID,
  p_idempotency_key TEXT,
  p_debt_id UUID,
  p_amount NUMERIC,
  p_date TIMESTAMPTZ DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_debt RECORD;
  v_method TEXT;
  v_pay_id UUID;
  v_paid_total NUMERIC;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:write:debts', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'record_debt_payment', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'AMOUNT_MUST_BE_POSITIVE';
  END IF;

  SELECT id, person, concept, amount INTO v_debt
  FROM public.debts
  WHERE id = p_debt_id AND user_id = v_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEBT_NOT_FOUND';
  END IF;

  v_method := COALESCE(p_payment_method, CASE WHEN p_account_id IS NULL THEN 'cash' ELSE 'transfer' END);
  PERFORM public.mcp_validate_payment_method(v_user_id, p_account_id, v_method);

  INSERT INTO public.debt_payments (
    user_id, debt_id, amount, date, note, payment_method, account_id
  )
  VALUES (
    v_user_id, p_debt_id, pg_catalog.round(p_amount, 2),
    COALESCE(p_date, pg_catalog.now()), LEFT(p_note, 500), v_method, p_account_id
  )
  RETURNING id INTO v_pay_id;

  SELECT COALESCE(SUM(dp.amount), 0) INTO v_paid_total
  FROM public.debt_payments dp
  WHERE dp.user_id = v_user_id AND dp.debt_id = p_debt_id AND dp.deleted_at IS NULL;

  v_res := pg_catalog.jsonb_build_object(
    'payment_id', v_pay_id,
    'debt_id', p_debt_id,
    'person', v_debt.person,
    'paid_amount', pg_catalog.round(v_paid_total, 2),
    'remaining_amount', GREATEST(0, pg_catalog.round(v_debt.amount - v_paid_total, 2))
  );

  PERFORM public.mcp_save_idempotency(v_user_id, 'record_debt_payment', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_record_debt_payment(UUID, TEXT, UUID, NUMERIC, TIMESTAMPTZ, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_record_debt_payment(UUID, TEXT, UUID, NUMERIC, TIMESTAMPTZ, UUID, TEXT, TEXT) TO service_role;

-- Write RPC 7: Create Goal
CREATE OR REPLACE FUNCTION public.mcp_create_goal(
  p_grant_id UUID,
  p_idempotency_key TEXT,
  p_name TEXT,
  p_target NUMERIC,
  p_saved NUMERIC DEFAULT 0,
  p_deadline TIMESTAMPTZ DEFAULT NULL,
  p_pinned BOOLEAN DEFAULT false,
  p_color TEXT DEFAULT '#C86446'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_goal_id UUID;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:write:goals', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'create_goal', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  IF p_target IS NULL OR p_target <= 0 THEN
    RAISE EXCEPTION 'AMOUNT_MUST_BE_POSITIVE';
  END IF;
  IF COALESCE(p_saved, 0) < 0 THEN
    RAISE EXCEPTION 'INVALID_SAVED_AMOUNT';
  END IF;

  INSERT INTO public.goals (user_id, name, target, saved, color, deadline, pinned, contributions)
  VALUES (
    v_user_id,
    LEFT(pg_catalog.btrim(p_name), 100),
    pg_catalog.round(p_target, 2),
    pg_catalog.round(COALESCE(p_saved, 0), 2),
    COALESCE(NULLIF(p_color, ''), '#C86446'),
    p_deadline,
    COALESCE(p_pinned, false),
    '[]'::jsonb
  )
  RETURNING id INTO v_goal_id;

  v_res := pg_catalog.jsonb_build_object(
    'id', v_goal_id,
    'name', LEFT(pg_catalog.btrim(p_name), 100),
    'target', pg_catalog.round(p_target, 2),
    'saved', pg_catalog.round(COALESCE(p_saved, 0), 2)
  );

  PERFORM public.mcp_save_idempotency(v_user_id, 'create_goal', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_create_goal(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TIMESTAMPTZ, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_create_goal(UUID, TEXT, TEXT, NUMERIC, NUMERIC, TIMESTAMPTZ, BOOLEAN, TEXT) TO service_role;

-- Write RPC 8: Create Debt (auto-prefixes [yo_debo] when direction = 'i_owe')
CREATE OR REPLACE FUNCTION public.mcp_create_debt(
  p_grant_id UUID,
  p_idempotency_key TEXT,
  p_person TEXT,
  p_concept TEXT,
  p_amount NUMERIC,
  p_direction TEXT DEFAULT 'owed_to_me',
  p_date TIMESTAMPTZ DEFAULT NULL,
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_acc_exists BOOLEAN;
  v_note TEXT;
  v_debt_id UUID;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:write:debts', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'create_debt', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'AMOUNT_MUST_BE_POSITIVE';
  END IF;
  IF p_direction NOT IN ('owed_to_me', 'i_owe') THEN
    RAISE EXCEPTION 'INVALID_DEBT_DIRECTION';
  END IF;

  IF p_account_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = p_account_id AND a.user_id = v_user_id AND a.deleted_at IS NULL
    ) INTO v_acc_exists;
    IF NOT v_acc_exists THEN
      RAISE EXCEPTION 'ACCOUNT_NOT_FOUND';
    END IF;
  END IF;

  v_note := NULLIF(pg_catalog.btrim(LEFT(COALESCE(p_note, ''), 480)), '');
  IF p_direction = 'i_owe' THEN
    IF v_note IS NULL THEN
      v_note := '[yo_debo]';
    ELSIF v_note NOT LIKE '%[yo_debo]%' THEN
      v_note := '[yo_debo] ' || v_note;
    END IF;
  END IF;

  INSERT INTO public.debts (
    user_id, person, concept, amount, date, due_date, note, account_id
  )
  VALUES (
    v_user_id,
    LEFT(pg_catalog.btrim(p_person), 100),
    LEFT(pg_catalog.btrim(p_concept), 140),
    pg_catalog.round(p_amount, 2),
    COALESCE(p_date, pg_catalog.now()),
    p_due_date,
    v_note,
    p_account_id
  )
  RETURNING id INTO v_debt_id;

  v_res := pg_catalog.jsonb_build_object(
    'id', v_debt_id,
    'person', LEFT(pg_catalog.btrim(p_person), 100),
    'concept', LEFT(pg_catalog.btrim(p_concept), 140),
    'amount', pg_catalog.round(p_amount, 2),
    'direction', p_direction
  );

  PERFORM public.mcp_save_idempotency(v_user_id, 'create_debt', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_create_debt(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_create_debt(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT) TO service_role;

-- Write RPC 9a: Prepare 2-Step Soft Delete (120s token, blocks accounts & scheduled txs)
CREATE OR REPLACE FUNCTION public.mcp_prepare_soft_delete(
  p_grant_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_preview JSONB;
  v_fixed_id UUID;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:delete:soft', true);

  IF p_entity_type = 'account' THEN
    RAISE EXCEPTION 'ACCOUNT_SOFT_DELETE_NOT_ALLOWED';
  END IF;
  IF p_entity_type NOT IN ('transaction', 'fixed_item', 'goal', 'debt', 'debt_payment') THEN
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE';
  END IF;

  IF p_entity_type = 'transaction' THEN
    SELECT t.fixed_id,
           pg_catalog.jsonb_build_object(
             'entity_type', 'transaction',
             'id', t.id,
             'concept', t.concept,
             'category', t.category,
             'amount', t.amount,
             'date', t.date
           )
    INTO v_fixed_id, v_preview
    FROM public.transactions t
    WHERE t.id = p_entity_id AND t.user_id = v_user_id AND t.deleted_at IS NULL;

    IF NOT FOUND THEN RAISE EXCEPTION 'ENTITY_NOT_FOUND'; END IF;
    IF v_fixed_id IS NOT NULL THEN RAISE EXCEPTION 'SCHEDULED_TX_IMMUTABLE'; END IF;

  ELSIF p_entity_type = 'fixed_item' THEN
    SELECT pg_catalog.jsonb_build_object(
      'entity_type', 'fixed_item', 'id', f.id, 'concept', f.concept, 'amount', f.amount, 'frequency', f.frequency
    ) INTO v_preview
    FROM public.fixed_items f
    WHERE f.id = p_entity_id AND f.user_id = v_user_id AND f.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTITY_NOT_FOUND'; END IF;

  ELSIF p_entity_type = 'goal' THEN
    SELECT pg_catalog.jsonb_build_object(
      'entity_type', 'goal', 'id', g.id, 'name', g.name, 'saved', COALESCE(g.saved, 0), 'target', g.target
    ) INTO v_preview
    FROM public.goals g
    WHERE g.id = p_entity_id AND g.user_id = v_user_id AND g.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTITY_NOT_FOUND'; END IF;

  ELSIF p_entity_type = 'debt' THEN
    SELECT pg_catalog.jsonb_build_object(
      'entity_type', 'debt', 'id', d.id, 'person', d.person, 'concept', d.concept, 'amount', d.amount
    ) INTO v_preview
    FROM public.debts d
    WHERE d.id = p_entity_id AND d.user_id = v_user_id AND d.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTITY_NOT_FOUND'; END IF;

  ELSIF p_entity_type = 'debt_payment' THEN
    SELECT pg_catalog.jsonb_build_object(
      'entity_type', 'debt_payment', 'id', dp.id, 'debt_id', dp.debt_id, 'amount', dp.amount, 'date', dp.date
    ) INTO v_preview
    FROM public.debt_payments dp
    WHERE dp.id = p_entity_id AND dp.user_id = v_user_id AND dp.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTITY_NOT_FOUND'; END IF;
  END IF;

  INSERT INTO public.mcp_delete_confirmations (
    token_hash, user_id, grant_id, entity_type, entity_id, preview, expires_at
  )
  VALUES (
    p_token_hash, v_user_id, p_grant_id, p_entity_type, p_entity_id, v_preview,
    pg_catalog.now() + INTERVAL '120 seconds'
  );

  RETURN pg_catalog.jsonb_build_object(
    'preview', v_preview,
    'expires_in_seconds', 120,
    'recoverable_days', 30
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_prepare_soft_delete(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_prepare_soft_delete(UUID, TEXT, UUID, TEXT) TO service_role;

-- Write RPC 9b: Confirm 2-Step Soft Delete (sets deleted_at = now(), cascades debt -> debt_payments)
CREATE OR REPLACE FUNCTION public.mcp_confirm_soft_delete(
  p_grant_id UUID,
  p_token_hash TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_cached JSONB;
  v_conf RECORD;
  v_now TIMESTAMPTZ := pg_catalog.now();
  v_affected INTEGER := 0;
  v_res JSONB;
BEGIN
  v_user_id := public.mcp_assert_grant_context(p_grant_id, 'mcp:delete:soft', true);
  v_cached := public.mcp_check_idempotency(v_user_id, 'confirm_soft_delete', p_idempotency_key);
  IF v_cached IS NOT NULL THEN RETURN v_cached; END IF;

  UPDATE public.mcp_delete_confirmations
  SET used_at = v_now
  WHERE token_hash = p_token_hash
    AND user_id = v_user_id
    AND grant_id = p_grant_id
    AND used_at IS NULL
    AND expires_at > v_now
  RETURNING entity_type, entity_id, preview INTO v_conf;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_OR_EXPIRED_CONFIRMATION';
  END IF;

  IF v_conf.entity_type = 'transaction' THEN
    UPDATE public.transactions
    SET deleted_at = v_now, updated_at = v_now
    WHERE id = v_conf.entity_id AND user_id = v_user_id AND deleted_at IS NULL AND fixed_id IS NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF v_conf.entity_type = 'fixed_item' THEN
    UPDATE public.fixed_items
    SET deleted_at = v_now, updated_at = v_now
    WHERE id = v_conf.entity_id AND user_id = v_user_id AND deleted_at IS NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF v_conf.entity_type = 'goal' THEN
    UPDATE public.goals
    SET deleted_at = v_now, updated_at = v_now
    WHERE id = v_conf.entity_id AND user_id = v_user_id AND deleted_at IS NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF v_conf.entity_type = 'debt' THEN
    UPDATE public.debts
    SET deleted_at = v_now, updated_at = v_now
    WHERE id = v_conf.entity_id AND user_id = v_user_id AND deleted_at IS NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    UPDATE public.debt_payments
    SET deleted_at = v_now
    WHERE debt_id = v_conf.entity_id AND user_id = v_user_id AND deleted_at IS NULL;

  ELSIF v_conf.entity_type = 'debt_payment' THEN
    UPDATE public.debt_payments
    SET deleted_at = v_now
    WHERE id = v_conf.entity_id AND user_id = v_user_id AND deleted_at IS NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  END IF;

  IF v_affected = 0 THEN
    RAISE EXCEPTION 'ENTITY_ALREADY_DELETED_OR_MISSING';
  END IF;

  v_res := pg_catalog.jsonb_build_object(
    'status', 'soft_deleted',
    'entity_type', v_conf.entity_type,
    'entity_id', v_conf.entity_id,
    'deleted_at', v_now,
    'purge_after_days', 30,
    'preview', v_conf.preview
  );

  PERFORM public.mcp_save_idempotency(v_user_id, 'confirm_soft_delete', p_idempotency_key, v_res);
  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_confirm_soft_delete(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_confirm_soft_delete(UUID, TEXT, TEXT) TO service_role;

-- Cleanup job for expired ephemeral state and >30d soft-deleted records
CREATE OR REPLACE FUNCTION public.mcp_cleanup_expired()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := pg_catalog.now();
  v_codes INT := 0;
  v_tokens INT := 0;
  v_rates INT := 0;
  v_idem INT := 0;
  v_confs INT := 0;
  v_audits INT := 0;
  v_purged INT := 0;
  v_tmp INT := 0;
BEGIN
  DELETE FROM public.mcp_oauth_codes WHERE expires_at < v_now - INTERVAL '1 day';
  GET DIAGNOSTICS v_codes = ROW_COUNT;

  DELETE FROM public.mcp_refresh_tokens WHERE expires_at < v_now - INTERVAL '7 days' OR revoked_at < v_now - INTERVAL '7 days';
  GET DIAGNOSTICS v_tokens = ROW_COUNT;

  DELETE FROM public.mcp_rate_limits WHERE window_start < v_now - INTERVAL '2 hours';
  GET DIAGNOSTICS v_rates = ROW_COUNT;

  DELETE FROM public.mcp_idempotency_keys WHERE expires_at < v_now;
  GET DIAGNOSTICS v_idem = ROW_COUNT;

  DELETE FROM public.mcp_delete_confirmations WHERE expires_at < v_now - INTERVAL '1 day';
  GET DIAGNOSTICS v_confs = ROW_COUNT;

  DELETE FROM public.mcp_audit_log WHERE created_at < v_now - INTERVAL '90 days';
  GET DIAGNOSTICS v_audits = ROW_COUNT;

  DELETE FROM public.transactions WHERE deleted_at < v_now - INTERVAL '30 days';
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_purged := v_purged + v_tmp;
  DELETE FROM public.fixed_items WHERE deleted_at < v_now - INTERVAL '30 days';
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_purged := v_purged + v_tmp;
  DELETE FROM public.goals WHERE deleted_at < v_now - INTERVAL '30 days';
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_purged := v_purged + v_tmp;
  DELETE FROM public.debt_payments WHERE deleted_at < v_now - INTERVAL '30 days';
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_purged := v_purged + v_tmp;
  DELETE FROM public.debts WHERE deleted_at < v_now - INTERVAL '30 days';
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_purged := v_purged + v_tmp;
  DELETE FROM public.goal_folders WHERE deleted_at < v_now - INTERVAL '30 days';
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_purged := v_purged + v_tmp;
  DELETE FROM public.accounts WHERE deleted_at < v_now - INTERVAL '30 days';
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_purged := v_purged + v_tmp;

  RETURN pg_catalog.jsonb_build_object(
    'codes_deleted', v_codes,
    'refresh_tokens_deleted', v_tokens,
    'rate_limits_deleted', v_rates,
    'idempotency_deleted', v_idem,
    'confirmations_deleted', v_confs,
    'audit_logs_deleted', v_audits,
    'soft_deleted_records_purged', v_purged
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mcp_cleanup_expired() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_cleanup_expired() TO service_role;

-- ----------------------------------------------------------------------------
-- User-Facing Recovery Trash RPCs (authenticated + is_mfa_compliant())
-- Needed because table RLS policies enforce `AND deleted_at IS NULL`.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_soft_deleted_items()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cutoff TIMESTAMPTZ := pg_catalog.now() - INTERVAL '30 days';
  v_items JSONB;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_mfa_compliant() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT COALESCE(
    pg_catalog.jsonb_agg(sub.item),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT t.deleted_at AS sort_at, pg_catalog.jsonb_build_object(
      'entity_type', 'transaction',
      'entity_id', t.id,
      'title', t.concept,
      'subtitle', t.category,
      'amount', t.amount,
      'deleted_at', t.deleted_at,
      'days_remaining', GREATEST(0, pg_catalog.ceil(EXTRACT(EPOCH FROM ((t.deleted_at + INTERVAL '30 days') - pg_catalog.now())) / 86400.0)::int)
    ) AS item
    FROM public.transactions t
    WHERE t.user_id = v_user_id AND t.deleted_at IS NOT NULL AND t.deleted_at >= v_cutoff

    UNION ALL

    SELECT f.deleted_at AS sort_at, pg_catalog.jsonb_build_object(
      'entity_type', 'fixed_item',
      'entity_id', f.id,
      'title', f.concept,
      'subtitle', f.category,
      'amount', f.amount,
      'deleted_at', f.deleted_at,
      'days_remaining', GREATEST(0, pg_catalog.ceil(EXTRACT(EPOCH FROM ((f.deleted_at + INTERVAL '30 days') - pg_catalog.now())) / 86400.0)::int)
    ) AS item
    FROM public.fixed_items f
    WHERE f.user_id = v_user_id AND f.deleted_at IS NOT NULL AND f.deleted_at >= v_cutoff

    UNION ALL

    SELECT g.deleted_at AS sort_at, pg_catalog.jsonb_build_object(
      'entity_type', 'goal',
      'entity_id', g.id,
      'title', g.name,
      'subtitle', 'Meta de ahorro',
      'amount', COALESCE(g.saved, 0),
      'deleted_at', g.deleted_at,
      'days_remaining', GREATEST(0, pg_catalog.ceil(EXTRACT(EPOCH FROM ((g.deleted_at + INTERVAL '30 days') - pg_catalog.now())) / 86400.0)::int)
    ) AS item
    FROM public.goals g
    WHERE g.user_id = v_user_id AND g.deleted_at IS NOT NULL AND g.deleted_at >= v_cutoff

    UNION ALL

    SELECT d.deleted_at AS sort_at, pg_catalog.jsonb_build_object(
      'entity_type', 'debt',
      'entity_id', d.id,
      'title', d.person || ' — ' || d.concept,
      'subtitle', CASE WHEN COALESCE(d.note, '') LIKE '%[yo_debo]%' THEN 'Deuda por pagar' ELSE 'Deuda por cobrar' END,
      'amount', d.amount,
      'deleted_at', d.deleted_at,
      'days_remaining', GREATEST(0, pg_catalog.ceil(EXTRACT(EPOCH FROM ((d.deleted_at + INTERVAL '30 days') - pg_catalog.now())) / 86400.0)::int)
    ) AS item
    FROM public.debts d
    WHERE d.user_id = v_user_id AND d.deleted_at IS NOT NULL AND d.deleted_at >= v_cutoff

    UNION ALL

    SELECT dp.deleted_at AS sort_at, pg_catalog.jsonb_build_object(
      'entity_type', 'debt_payment',
      'entity_id', dp.id,
      'title', 'Abono (' || COALESCE(d.person, 'Deuda') || ')',
      'subtitle', COALESCE(d.concept, 'Pago de deuda'),
      'amount', dp.amount,
      'deleted_at', dp.deleted_at,
      'days_remaining', GREATEST(0, pg_catalog.ceil(EXTRACT(EPOCH FROM ((dp.deleted_at + INTERVAL '30 days') - pg_catalog.now())) / 86400.0)::int)
    ) AS item
    FROM public.debt_payments dp
    LEFT JOIN public.debts d ON d.id = dp.debt_id AND d.user_id = v_user_id
    WHERE dp.user_id = v_user_id AND dp.deleted_at IS NOT NULL AND dp.deleted_at >= v_cutoff

    ORDER BY sort_at DESC
    LIMIT 100
  ) sub;

  RETURN v_items;
END;
$$;

REVOKE ALL ON FUNCTION public.list_soft_deleted_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_soft_deleted_items() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.restore_soft_deleted_item(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_affected INTEGER := 0;
  v_debt_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_mfa_compliant() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_entity_type = 'transaction' THEN
    UPDATE public.transactions
    SET deleted_at = NULL, updated_at = pg_catalog.now()
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF p_entity_type = 'fixed_item' THEN
    UPDATE public.fixed_items
    SET deleted_at = NULL, updated_at = pg_catalog.now()
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF p_entity_type = 'goal' THEN
    UPDATE public.goals
    SET deleted_at = NULL, updated_at = pg_catalog.now()
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF p_entity_type = 'debt' THEN
    UPDATE public.debts
    SET deleted_at = NULL, updated_at = pg_catalog.now()
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

    UPDATE public.debt_payments
    SET deleted_at = NULL
    WHERE debt_id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;

  ELSIF p_entity_type = 'debt_payment' THEN
    SELECT dp.debt_id INTO v_debt_id
    FROM public.debt_payments dp
    WHERE dp.id = p_entity_id AND dp.user_id = v_user_id AND dp.deleted_at IS NOT NULL;

    IF v_debt_id IS NOT NULL THEN
      -- Restore parent debt if also soft-deleted so the restored payment stays visible
      UPDATE public.debts
      SET deleted_at = NULL, updated_at = pg_catalog.now()
      WHERE id = v_debt_id AND user_id = v_user_id AND deleted_at IS NOT NULL;

      UPDATE public.debt_payments
      SET deleted_at = NULL
      WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS v_affected = ROW_COUNT;
    END IF;

  ELSE
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE';
  END IF;

  IF v_affected = 0 THEN
    RAISE EXCEPTION 'ENTITY_NOT_FOUND';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'restored', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_soft_deleted_item(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_soft_deleted_item(TEXT, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.purge_soft_deleted_item(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_affected INTEGER := 0;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_mfa_compliant() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_entity_type = 'transaction' THEN
    DELETE FROM public.transactions
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF p_entity_type = 'fixed_item' THEN
    DELETE FROM public.fixed_items
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF p_entity_type = 'goal' THEN
    DELETE FROM public.goals
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF p_entity_type = 'debt' THEN
    DELETE FROM public.debts
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSIF p_entity_type = 'debt_payment' THEN
    DELETE FROM public.debt_payments
    WHERE id = p_entity_id AND user_id = v_user_id AND deleted_at IS NOT NULL;
    GET DIAGNOSTICS v_affected = ROW_COUNT;

  ELSE
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE';
  END IF;

  IF v_affected = 0 THEN
    RAISE EXCEPTION 'ENTITY_NOT_FOUND';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'purged', true,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_soft_deleted_item(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_soft_deleted_item(TEXT, UUID) TO authenticated, service_role;
