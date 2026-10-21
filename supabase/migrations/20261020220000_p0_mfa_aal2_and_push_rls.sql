-- ====================================================================
-- P0 Remediation — MFA aal2 enforcement, push_subscriptions hijack fix
-- and SECURITY DEFINER RPC hardening.
--
-- Findings: NEW-04, F2-A, SEC-004
-- Target: PostgreSQL 17 (Supabase)
--
-- NOTE: This migration is intentionally idempotent. It must be validated
-- by Antigravity in an ephemeral PostgreSQL 17 container before any
-- remote application. DO NOT run `supabase db push` against production.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. NEW-04 — Require aal2 when the user has a verified MFA factor
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_mfa_compliant()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  has_verified_factor boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM auth.mfa_factors mf
    WHERE mf.user_id = auth.uid()
      AND mf.status = 'verified'
  ) INTO has_verified_factor;

  IF has_verified_factor THEN
    RETURN COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
  END IF;

  -- Users without MFA keep their current aal1 access (no regression).
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.is_mfa_compliant() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_mfa_compliant() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_mfa_compliant() TO authenticated, service_role;

-- --------------------------------------------------------------------
-- 2. NEW-04 — Restrictive aal2 policies on the 10 application tables
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.accounts;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.accounts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.fixed_items;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.fixed_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.transactions;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.transactions AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.goals;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.goals AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.goal_folders;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.goal_folders AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.debts;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.debts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.debt_payments;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.debt_payments AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.user_sessions;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.user_sessions AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.user_settings;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.user_settings AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.push_subscriptions;
CREATE POLICY "Require AAL2 when MFA enabled"
  ON public.push_subscriptions AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_mfa_compliant())
  WITH CHECK (public.is_mfa_compliant());

-- Storage: receipts bucket is the only bucket used by Finance Pal.
DO $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN insufficient_privilege THEN
  -- In Supabase Cloud, storage.objects is owned by supabase_storage_admin and already has RLS enabled.
  NULL;
END;
$$;

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled on storage" ON storage.objects;
CREATE POLICY "Require AAL2 when MFA enabled on storage"
  ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id = 'receipts' AND public.is_mfa_compliant())
  WITH CHECK (bucket_id = 'receipts' AND public.is_mfa_compliant());

-- --------------------------------------------------------------------
-- 3. F2-A — Stop cross-tenant hijacking of push_subscriptions
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- 4. SEC-004 — cleanup_stale_sessions() is service_role only
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', session_user) <> 'service_role'
     AND session_user <> 'postgres' THEN
    RAISE EXCEPTION 'Access denied: service_role required';
  END IF;

  DELETE FROM public.user_sessions
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes'
    AND created_at < NOW() - INTERVAL '2 minutes';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_stale_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_stale_sessions() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_stale_sessions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions() TO service_role;

-- --------------------------------------------------------------------
-- 5. F2-C — Remove excessive table privileges from API roles
-- --------------------------------------------------------------------
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
