-- =============================================================================
-- Suite de Pruebas Dinámicas T06, T09 y T12 sobre Esquema de Producción
-- =============================================================================
\set ON_ERROR_STOP on
SET search_path = public, auth, storage, extensions;

-- 1. Semilla de usuarios sintéticos audit-a (con TOTP MFA verificado) y audit-b
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

-- Tabla de resultados de auditoría (accesible para registrar evidencias)
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
-- PRUEBA T06 (F2.5): Aislamiento Cross-Tenant A -> B (10 tablas + 3 vistas + storage.objects)
-- =============================================================================
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-11111111111a","role":"authenticated","aal":"aal2"}', false);

DO $$
DECLARE
  v_own int;
  v_other int;
  v_upd int;
  v_del int;
  v_ins_blocked boolean;
  t text;
  tables text[] := ARRAY[
    'accounts','debts','debt_payments','fixed_items','goal_folders',
    'goals','push_subscriptions','transactions','user_sessions','user_settings'
  ];
  views text[] := ARRAY['accounts_safe','debt_payments_safe','transactions_safe'];
BEGIN
  -- 1. SELECT en las 10 tablas base
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = %L', t, '11111111-1111-4111-8111-11111111111a') INTO v_own;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = %L', t, '22222222-2222-4222-8222-22222222222b') INTO v_other;
    INSERT INTO public.audit_test_results VALUES (
      'T06', 'public.' || t, 'SELECT cross-tenant (A lee B)',
      'own>=1, other=0', format('own=%s, other=%s', v_own, v_other),
      CASE WHEN v_own >= 1 AND v_other = 0 THEN 'PASS (BLOCKED)' ELSE 'FAIL (LEAK)' END
    );
  END LOOP;

  -- 2. SELECT en las 3 vistas *_safe
  FOREACH t IN ARRAY views LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = %L', t, '11111111-1111-4111-8111-11111111111a') INTO v_own;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = %L', t, '22222222-2222-4222-8222-22222222222b') INTO v_other;
    INSERT INTO public.audit_test_results VALUES (
      'T06', 'public.' || t, 'SELECT view cross-tenant (A lee B)',
      'own=1, other=0', format('own=%s, other=%s', v_own, v_other),
      CASE WHEN v_own = 1 AND v_other = 0 THEN 'PASS (BLOCKED)' ELSE 'FAIL (LEAK)' END
    );
  END LOOP;

  -- 3. SELECT en storage.objects
  SELECT count(*) INTO v_own FROM storage.objects WHERE name LIKE '11111111-1111-4111-8111-11111111111a/%';
  SELECT count(*) INTO v_other FROM storage.objects WHERE name LIKE '22222222-2222-4222-8222-22222222222b/%';
  INSERT INTO public.audit_test_results VALUES (
    'T06', 'storage.objects', 'SELECT cross-tenant (A lee recibo de B)',
    'own=1, other=0', format('own=%s, other=%s', v_own, v_other),
    CASE WHEN v_own = 1 AND v_other = 0 THEN 'PASS (BLOCKED)' ELSE 'FAIL (LEAK)' END
  );
END
$$;

DO $$
DECLARE
  v_upd int;
  v_del int;
  v_blocked boolean;
BEGIN
  -- UPDATE cross-tenant en las 9 tablas con USING (auth.uid() = user_id)
  UPDATE public.accounts SET name = 'Pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.accounts', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  UPDATE public.debts SET concept = 'Pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.debts', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  UPDATE public.debt_payments SET note = 'Pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.debt_payments', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  UPDATE public.fixed_items SET concept = 'Pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.fixed_items', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  UPDATE public.goal_folders SET name = 'Pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.goal_folders', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  UPDATE public.goals SET name = 'Pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.goals', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  UPDATE public.transactions SET concept = 'Pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.transactions', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  UPDATE public.user_sessions SET device_name = 'Pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.user_sessions', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  UPDATE public.user_settings SET theme = 'pwn' WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.user_settings', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  -- Caso especial push_subscriptions (USING (true) WITH CHECK (auth.uid() = user_id))
  -- 1) Con WHERE user_id = B: PostgreSQL aplica la política SELECT (auth.uid() = user_id) al leer columnas en WHERE -> 0 filas afectadas
  UPDATE public.push_subscriptions SET p256dh = 'pwned' WHERE user_id = '22222222-2222-4222-8222-22222222222b';
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'T06', 'public.push_subscriptions', 'UPDATE cross-tenant con WHERE (mitigado por SELECT policy)',
    'rows=0', 'rows='||v_upd,
    CASE WHEN v_upd = 0 THEN 'PASS (BLOCKED BY SELECT POLICY)' ELSE 'FAIL' END
  );

  -- 2) Sin cláusula WHERE (UPDATE ciego): como no lee columnas, PostgreSQL sólo evalúa UPDATE USING (true) y WITH CHECK (auth.uid() = user_id)
  v_upd := 0;
  UPDATE public.push_subscriptions SET user_id = '11111111-1111-4111-8111-11111111111a';
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  -- Había 1 fila propia de A y 1 fila de B; si v_upd = 2, ¡A secuestró la fila de B!
  INSERT INTO public.audit_test_results VALUES (
    'T06', 'public.push_subscriptions', 'UPDATE sin WHERE (hijack global via USING(true) + SET user_id=A)',
    'rows=1 (sólo propia)', 'rows='||v_upd||' (incluye fila de B si =2)',
    CASE WHEN v_upd <= 1 THEN 'PASS' ELSE 'FAIL (CROSS-TENANT HIJACK VIA USING(true) SIN WHERE!)' END
  );
  IF v_upd > 1 THEN
    DELETE FROM public.push_subscriptions WHERE id = 'bbbbbbbb-0007-4000-8000-000000000007';
    PERFORM set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-22222222222b","role":"authenticated","aal":"aal2"}', false);
    INSERT INTO public.push_subscriptions (id, user_id, endpoint, p256dh, auth)
    VALUES ('bbbbbbbb-0007-4000-8000-000000000007', '22222222-2222-4222-8222-22222222222b', 'https://push.example/b', 'key-b', 'auth-b');
    PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-11111111111a","role":"authenticated","aal":"aal2"}', false);
  END IF;

  -- UPDATE cross-tenant en storage.objects
  UPDATE storage.objects SET name = '11111111-1111-4111-8111-11111111111a/stolen.jpg' WHERE id = 'bbbbbbbb-0010-4000-8000-000000000010';
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'storage.objects', 'UPDATE cross-tenant', 'rows=0', 'rows='||v_upd, CASE WHEN v_upd=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  -- DELETE cross-tenant en las 10 tablas + storage.objects
  DELETE FROM public.debt_payments WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.debt_payments', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.debts WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.debts', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.transactions WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.transactions', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.fixed_items WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.fixed_items', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.goals WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.goals', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.goal_folders WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.goal_folders', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.push_subscriptions WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.push_subscriptions', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.user_sessions WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.user_sessions', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.user_settings WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.user_settings', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM public.accounts WHERE user_id = '22222222-2222-4222-8222-22222222222b'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.accounts', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  DELETE FROM storage.objects WHERE id = 'bbbbbbbb-0010-4000-8000-000000000010'; GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES ('T06', 'storage.objects', 'DELETE cross-tenant', 'rows=0', 'rows='||v_del, CASE WHEN v_del=0 THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  -- INSERT cross-tenant (A intenta insertar con user_id = B)
  v_blocked := false; BEGIN INSERT INTO public.accounts (user_id, name, type) VALUES ('22222222-2222-4222-8222-22222222222b', 'Fake', 'cash'); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.accounts', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.debts (user_id, person, concept, amount, date) VALUES ('22222222-2222-4222-8222-22222222222b', 'X', 'Y', 1, now()); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.debts', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.debt_payments (user_id, debt_id, amount, date) VALUES ('22222222-2222-4222-8222-22222222222b', 'bbbbbbbb-0002-4000-8000-000000000002', 1, now()); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.debt_payments', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.fixed_items (user_id, type, category, concept, amount, frequency, start_date, end_date, priority) VALUES ('22222222-2222-4222-8222-22222222222b', 'gasto', 'X', 'Y', 1, 'mensual', now(), now(), 'opcional'); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.fixed_items', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.goal_folders (user_id, name) VALUES ('22222222-2222-4222-8222-22222222222b', 'Fake'); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.goal_folders', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.goals (user_id, name, target) VALUES ('22222222-2222-4222-8222-22222222222b', 'Fake', 10); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.goals', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ('22222222-2222-4222-8222-22222222222b', 'https://push.example/fake', 'k', 'a'); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.push_subscriptions', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.transactions (user_id, type, category, concept, amount, date) VALUES ('22222222-2222-4222-8222-22222222222b', 'gasto', 'X', 'Y', 1, now()); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.transactions', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.user_sessions (user_id, device_id) VALUES ('22222222-2222-4222-8222-22222222222b', 'fake-dev'); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.user_sessions', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO public.user_settings (user_id, theme) VALUES ('22222222-2222-4222-8222-22222222222b', 'dark'); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'public.user_settings', 'INSERT cross-tenant (user_id=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);

  v_blocked := false; BEGIN INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('receipts', '22222222-2222-4222-8222-22222222222b/fake.jpg', '22222222-2222-4222-8222-22222222222b'); EXCEPTION WHEN insufficient_privilege THEN v_blocked := true; END;
  INSERT INTO public.audit_test_results VALUES ('T06', 'storage.objects', 'INSERT cross-tenant (folder=B)', 'RLS 42501', CASE WHEN v_blocked THEN 'RLS 42501' ELSE 'ALLOWED' END, CASE WHEN v_blocked THEN 'PASS (BLOCKED)' ELSE 'FAIL' END);
END
$$;

-- =============================================================================
-- PRUEBA T09 (F3.1 / NEW-04): CRUD con JWT aal1 en usuario con MFA TOTP verificado
-- =============================================================================
-- Simulamos el JWT emitido tras signInWithPassword() ANTES de completar mfa.challengeAndVerify():
-- claim "aal": "aal1", mientras el usuario tiene un factor TOTP 'verified' en auth.mfa_factors.
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-11111111111a","role":"authenticated","aal":"aal1"}', false);

DO $$
DECLARE
  v_mfa_verified int;
  v_sel int;
  v_ins int;
  v_upd int;
  v_del int;
BEGIN
  SELECT count(*) INTO v_mfa_verified FROM auth.mfa_factors
   WHERE user_id = '11111111-1111-4111-8111-11111111111a' AND status = 'verified';

  -- SELECT con aal1
  SELECT count(*) INTO v_sel FROM public.transactions WHERE user_id = '11111111-1111-4111-8111-11111111111a';
  INSERT INTO public.audit_test_results VALUES (
    'T09', 'public.transactions', 'SELECT con JWT aal1 (usuario con MFA verified='||v_mfa_verified||')',
    'BLOCKED (0 rows)', 'rows='||v_sel||' (aal='||(auth.jwt()->>'aal')||')',
    CASE WHEN v_sel = 0 THEN 'PASS' ELSE 'FAIL (NEW-04 CONFIRMED: aal1 lee datos sin MFA)' END
  );

  -- INSERT con aal1
  INSERT INTO public.transactions (id, user_id, type, category, concept, amount, date)
  VALUES ('aaaaaaaa-0099-4000-8000-000000000099', '11111111-1111-4111-8111-11111111111a', 'gasto', 'Fraude', 'Tx con aal1 sin TOTP', 9999, now());
  GET DIAGNOSTICS v_ins = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'T09', 'public.transactions', 'INSERT con JWT aal1 sin segundo factor',
    'RLS 42501', 'rows_inserted='||v_ins,
    CASE WHEN v_ins = 0 THEN 'PASS' ELSE 'FAIL (NEW-04 CONFIRMED: aal1 inserta datos sin MFA)' END
  );

  -- UPDATE con aal1
  UPDATE public.accounts SET initial_balance = 999999 WHERE id = 'aaaaaaaa-0001-4000-8000-000000000001';
  GET DIAGNOSTICS v_upd = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'T09', 'public.accounts', 'UPDATE con JWT aal1 sin segundo factor',
    'rows=0', 'rows_updated='||v_upd,
    CASE WHEN v_upd = 0 THEN 'PASS' ELSE 'FAIL (NEW-04 CONFIRMED: aal1 modifica saldos sin MFA)' END
  );

  -- DELETE con aal1
  DELETE FROM public.transactions WHERE id = 'aaaaaaaa-0099-4000-8000-000000000099';
  GET DIAGNOSTICS v_del = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'T09', 'public.transactions', 'DELETE con JWT aal1 sin segundo factor',
    'rows=0', 'rows_deleted='||v_del,
    CASE WHEN v_del = 0 THEN 'PASS' ELSE 'FAIL (NEW-04 CONFIRMED: aal1 borra movimientos sin MFA)' END
  );

  -- STORAGE SELECT/INSERT con aal1
  SELECT count(*) INTO v_sel FROM storage.objects WHERE name LIKE '11111111-1111-4111-8111-11111111111a/%';
  INSERT INTO public.audit_test_results VALUES (
    'T09', 'storage.objects', 'SELECT recibos con JWT aal1 sin segundo factor',
    'rows=0', 'rows='||v_sel,
    CASE WHEN v_sel = 0 THEN 'PASS' ELSE 'FAIL (NEW-04 CONFIRMED: aal1 lee recibos sin MFA)' END
  );
END
$$;

-- =============================================================================
-- PRUEBA T12 (F3.4): Takeover de user_sessions por device_id (propio con aal1 vs cross-tenant A->B)
-- =============================================================================
DO $$
DECLARE
  v_del_cross int;
  v_del_own_aal1 int;
BEGIN
  -- 1. Cross-tenant: audit-a ejecuta requestTakeover contra device_id de audit-b sin filtro .eq('user_id', ...)
  DELETE FROM public.user_sessions WHERE device_id = 'device-b-primary';
  GET DIAGNOSTICS v_del_cross = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'T12', 'public.user_sessions', 'DELETE cross-tenant por device_id sin .eq(user_id) (A -> B)',
    'rows=0 (RLS auth.uid()=user_id)', 'rows_deleted='||v_del_cross,
    CASE WHEN v_del_cross = 0 THEN 'PASS (RLS bloquea takeover cross-tenant)' ELSE 'FAIL (Cross-tenant takeover!)' END
  );

  -- 2. Mismo usuario con JWT aal1 (sin MFA): audit-a ejecuta requestTakeover expulsando su otro dispositivo 'device-a-other'
  DELETE FROM public.user_sessions WHERE device_id = 'device-a-other';
  GET DIAGNOSTICS v_del_own_aal1 = ROW_COUNT;
  INSERT INTO public.audit_test_results VALUES (
    'T12', 'public.user_sessions', 'DELETE takeover de sesión propia con JWT aal1 (sin verificar TOTP)',
    'rows=0 (requerir aal2)', 'rows_deleted='||v_del_own_aal1,
    CASE WHEN v_del_own_aal1 = 0 THEN 'PASS' ELSE 'FAIL (Takeover permitido en aal1 + sólo borra fila en tabla, no revoca JWT en GoTrue)' END
  );
END
$$;

RESET ROLE;
SELECT test_id, target, operation, expected, actual, verdict FROM public.audit_test_results ORDER BY test_id, target, operation;
