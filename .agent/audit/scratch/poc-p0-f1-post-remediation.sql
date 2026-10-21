-- =============================================================================
-- Suite de Verificación Dinámica Post-Remediación P0-F1 (T06, T09, T12, F2-A, SEC-004)
-- Aplicada sobre F2-prod-schema.sql + migración 20261020220000_p0_mfa_aal2_and_push_rls.sql
-- =============================================================================
\set ON_ERROR_STOP on
SET search_path = public, auth, storage, extensions;

-- 1. Semilla de usuarios sintéticos audit-a (con TOTP MFA verificado) y audit-b (sin MFA)
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-4111-8111-11111111111a', 'audit-a@financepal.local'),
  ('22222222-2222-4222-8222-22222222222b', 'audit-b@financepal.local');

INSERT INTO auth.mfa_factors (user_id, factor_type, status) VALUES
  ('11111111-1111-4111-8111-11111111111a', 'totp', 'verified');

INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- Semilla de 1 fila por entidad para audit-a y 1 fila por entidad para audit-b
INSERT INTO public.accounts (id, user_id, name, type, initial_balance, clabe, bank, holder_name) VALUES
  ('aaaaaaaa-0001-4000-8000-000000000001', '11111111-1111-4111-8111-11111111111a', 'Cuenta A', 'bank', 1000, '012180001111111111', 'BBVA', 'Audit A'),
  ('bbbbbbbb-0001-4000-8000-000000000001', '22222222-2222-4222-8222-22222222222b', 'Cuenta B', 'bank', 5000, '012180002222222222', 'Banorte', 'Audit B');

INSERT INTO public.debts (id, user_id, person, concept, amount, date, account_id) VALUES
  ('aaaaaaaa-0002-4000-8000-000000000002', '11111111-1111-4111-8111-11111111111a', 'Persona A', 'Préstamo A', 250, now(), 'aaaaaaaa-0001-4000-8000-000000000001'),
  ('bbbbbbbb-0002-4000-8000-000000000002', '22222222-2222-4222-8222-22222222222b', 'Persona B', 'Préstamo B', 900, now(), 'bbbbbbbb-0001-4000-8000-000000000001');

INSERT INTO public.debt_payments (id, user_id, debt_id, amount, date, account_id, receipt_url) VALUES
  ('aaaaaaaa-0003-4000-8000-000000000003', '11111111-1111-4111-8111-11111111111a', 'aaaaaaaa-0002-4000-8000-000000000002', 50, now(), 'aaaaaaaa-0001-4000-8000-000000000001', '11111111-1111-4111-8111-11111111111a/dp-a.jpg'),
  ('bbbbbbbb-0003-4000-8000-000000000003', '22222222-2222-4222-8222-22222222222b', 'bbbbbbbb-0002-4000-8000-000000000002', 100, now(), 'bbbbbbbb-0001-4000-8000-000000000001', '22222222-2222-4222-8222-22222222222b/dp-b.jpg');

INSERT INTO public.fixed_items (id, user_id, type, category, concept, amount, frequency, start_date, end_date, priority) VALUES
  ('aaaaaaaa-0004-4000-8000-000000000004', '11111111-1111-4111-8111-11111111111a', 'gasto', 'Hogar', 'Renta A', 400, 'mensual', now(), now() + interval '1 year', 'obligatorio'),
  ('bbbbbbbb-0004-4000-8000-000000000004', '22222222-2222-4222-8222-22222222222b', 'gasto', 'Hogar', 'Renta B', 800, 'mensual', now(), now() + interval '1 year', 'obligatorio');

INSERT INTO public.goal_folders (id, user_id, name, color) VALUES
  ('aaaaaaaa-0005-4000-8000-000000000005', '11111111-1111-4111-8111-11111111111a', 'Carpeta A', 'blue'),
  ('bbbbbbbb-0005-4000-8000-000000000005', '22222222-2222-4222-8222-22222222222b', 'Carpeta B', 'red');

INSERT INTO public.goals (id, user_id, name, target, saved, folder_id) VALUES
  ('aaaaaaaa-0006-4000-8000-000000000006', '11111111-1111-4111-8111-11111111111a', 'Meta A', 1000, 100, 'aaaaaaaa-0005-4000-8000-000000000005'),
  ('bbbbbbbb-0006-4000-8000-000000000006', '22222222-2222-4222-8222-22222222222b', 'Meta B', 2000, 200, 'bbbbbbbb-0005-4000-8000-000000000005');

INSERT INTO public.push_subscriptions (id, user_id, endpoint, p256dh, auth) VALUES
  ('aaaaaaaa-0007-4000-8000-000000000007', '11111111-1111-4111-8111-11111111111a', 'https://push.example/a', 'key-a', 'auth-a'),
  ('bbbbbbbb-0007-4000-8000-000000000007', '22222222-2222-4222-8222-22222222222b', 'https://push.example/b', 'key-b', 'auth-b');

INSERT INTO public.transactions (id, user_id, type, category, concept, amount, date, account_id, receipt) VALUES
  ('aaaaaaaa-0008-4000-8000-000000000008', '11111111-1111-4111-8111-11111111111a', 'gasto', 'Comida', 'Tacos A', 120, now(), 'aaaaaaaa-0001-4000-8000-000000000001', '11111111-1111-4111-8111-11111111111a/tx-a.jpg'),
  ('bbbbbbbb-0008-4000-8000-000000000008', '22222222-2222-4222-8222-22222222222b', 'gasto', 'Comida', 'Cena B', 450, now(), 'bbbbbbbb-0001-4000-8000-000000000001', '22222222-2222-4222-8222-22222222222b/tx-b.jpg');

INSERT INTO public.user_sessions (id, user_id, device_id, device_name) VALUES
  ('aaaaaaaa-0009-4000-8000-000000000009', '11111111-1111-4111-8111-11111111111a', 'device-a-primary', 'Chrome Linux A1'),
  ('aaaaaaaa-0009-4000-8000-000000000099', '11111111-1111-4111-8111-11111111111a', 'device-a-other', 'Pixel 8 A2'),
  ('bbbbbbbb-0009-4000-8000-000000000009', '22222222-2222-4222-8222-22222222222b', 'device-b-primary', 'Safari macOS B1');

INSERT INTO public.user_settings (user_id, theme, profile) VALUES
  ('11111111-1111-4111-8111-11111111111a', 'dark', '{"name":"Audit A","email":"audit-a@financepal.local"}'::jsonb),
  ('22222222-2222-4222-8222-22222222222b', 'light', '{"name":"Audit B","email":"audit-b@financepal.local"}'::jsonb);

INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES
  ('aaaaaaaa-0010-4000-8000-000000000010', 'receipts', '11111111-1111-4111-8111-11111111111a/recibo-a.jpg', '11111111-1111-4111-8111-11111111111a'),
  ('bbbbbbbb-0010-4000-8000-000000000010', 'receipts', '22222222-2222-4222-8222-22222222222b/recibo-b.jpg', '22222222-2222-4222-8222-22222222222b');

CREATE TABLE public.audit_test_results (
  test_id text NOT NULL,
  target text NOT NULL,
  operation text NOT NULL,
  expected text NOT NULL,
  actual text NOT NULL,
  verdict text NOT NULL
);
GRANT ALL ON TABLE public.audit_test_results TO authenticated, anon, service_role;

-- =============================================================================
-- PRUEBA 1 (F2-A): Verificar que UPDATE ciego sin WHERE en push_subscriptions NO afecta a B
-- =============================================================================
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-11111111111a","role":"authenticated","aal":"aal2"}', false);

DO $$
DECLARE
  v_upd int;
  v_b_owner uuid;
BEGIN
  UPDATE public.push_subscriptions SET user_id = '11111111-1111-4111-8111-11111111111a';
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'F2-A', 'public.push_subscriptions', 'UPDATE sin WHERE (intento de hijack cross-tenant)',
    'rows=1 (sólo propia)', 'rows='||v_upd,
    CASE WHEN v_upd = 1 THEN 'PASS (F2-A REMEDIATED)' ELSE 'FAIL' END
  );
END
$$;

-- =============================================================================
-- PRUEBA 2 (NEW-04 / T09): Usuario con MFA verified + JWT aal1 -> Bloqueado en las 10 tablas + storage
-- =============================================================================
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-11111111111a","role":"authenticated","aal":"aal1"}', false);

DO $$
DECLARE
  t text;
  v_sel int;
  v_upd int;
  v_del int;
  v_ins_blocked boolean;
  tables text[] := ARRAY[
    'accounts','debts','debt_payments','fixed_items','goal_folders',
    'goals','push_subscriptions','transactions','user_sessions','user_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = %L', t, '11111111-1111-4111-8111-11111111111a') INTO v_sel;
    INSERT INTO public.audit_test_results VALUES (
      'NEW-04', 'public.' || t, 'SELECT con JWT aal1 (MFA verified)',
      'rows=0', 'rows='||v_sel,
      CASE WHEN v_sel = 0 THEN 'PASS (BLOCKED BY RESTRICTIVE AAL2)' ELSE 'FAIL' END
    );
  END LOOP;

  -- INSERT con aal1
  v_ins_blocked := false;
  BEGIN
    INSERT INTO public.transactions (id, user_id, type, category, concept, amount, date)
    VALUES ('aaaaaaaa-0099-4000-8000-000000000099', '11111111-1111-4111-8111-11111111111a', 'gasto', 'Fraude', 'Tx con aal1 sin TOTP', 9999, now());
  EXCEPTION WHEN insufficient_privilege THEN
    v_ins_blocked := true;
  END;
  INSERT INTO public.audit_test_results VALUES (
    'NEW-04', 'public.transactions', 'INSERT con JWT aal1 (MFA verified)',
    'RLS 42501', CASE WHEN v_ins_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END,
    CASE WHEN v_ins_blocked THEN 'PASS (BLOCKED BY RESTRICTIVE AAL2)' ELSE 'FAIL' END
  );

  -- UPDATE con aal1
  UPDATE public.accounts SET initial_balance = 999999 WHERE id = 'aaaaaaaa-0001-4000-8000-000000000001';
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'NEW-04', 'public.accounts', 'UPDATE con JWT aal1 (MFA verified)',
    'rows=0', 'rows='||v_upd,
    CASE WHEN v_upd = 0 THEN 'PASS (BLOCKED BY RESTRICTIVE AAL2)' ELSE 'FAIL' END
  );

  -- DELETE takeover con aal1 (T12)
  DELETE FROM public.user_sessions WHERE device_id = 'device-a-other';
  GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'T12', 'public.user_sessions', 'DELETE takeover de sesión propia con JWT aal1',
    'rows=0', 'rows='||v_del,
    CASE WHEN v_del = 0 THEN 'PASS (BLOCKED BY RESTRICTIVE AAL2)' ELSE 'FAIL' END
  );

  -- STORAGE SELECT con aal1
  SELECT count(*) INTO v_sel FROM storage.objects WHERE name LIKE '11111111-1111-4111-8111-11111111111a/%';
  INSERT INTO public.audit_test_results VALUES (
    'NEW-04', 'storage.objects', 'SELECT recibos con JWT aal1 (MFA verified)',
    'rows=0', 'rows='||v_sel,
    CASE WHEN v_sel = 0 THEN 'PASS (BLOCKED BY RESTRICTIVE AAL2)' ELSE 'FAIL' END
  );
END
$$;

-- =============================================================================
-- PRUEBA 3 (No Regresión): Usuario SIN MFA (audit-b) opera normalmente con JWT aal1
-- =============================================================================
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-22222222222b","role":"authenticated","aal":"aal1"}', false);

DO $$
DECLARE
  v_sel int;
BEGIN
  SELECT count(*) INTO v_sel FROM public.transactions WHERE user_id = '22222222-2222-4222-8222-22222222222b';
  INSERT INTO public.audit_test_results VALUES (
    'NEW-04-NOREG', 'public.transactions', 'SELECT con JWT aal1 en usuario SIN MFA (audit-b)',
    'rows=1', 'rows='||v_sel,
    CASE WHEN v_sel = 1 THEN 'PASS (NO REGRESSION)' ELSE 'FAIL' END
  );
END
$$;

-- =============================================================================
-- PRUEBA 4 (SEC-004): cleanup_stale_sessions() revocado de authenticated y anon
-- =============================================================================
DO $$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    PERFORM public.cleanup_stale_sessions();
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  INSERT INTO public.audit_test_results VALUES (
    'SEC-004', 'public.cleanup_stale_sessions()', 'EXECUTE como rol authenticated',
    '42501 permission denied', CASE WHEN v_denied THEN '42501 permission denied' ELSE 'ALLOWED' END,
    CASE WHEN v_denied THEN 'PASS (SEC-004 REMEDIATED)' ELSE 'FAIL' END
  );
END
$$;

RESET ROLE;
SELECT test_id, target, operation, expected, actual, verdict FROM public.audit_test_results ORDER BY test_id, target;
