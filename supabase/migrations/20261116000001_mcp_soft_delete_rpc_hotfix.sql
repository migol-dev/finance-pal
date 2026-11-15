-- ============================================================================
-- Hotfix: ensure the 2-step soft-delete RPCs exist in databases where the
-- main MCP migration (20261116000000) was applied before these functions
-- were added. Idempotent: safe to run multiple times.
-- ============================================================================

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
