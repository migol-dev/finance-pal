-- =============================================================================
-- PoC Dinámico N3 (Laboratorio Local con Esquema de Producción F2-prod-schema.sql)
-- Pruebas resueltas por Antigravity (agy) en Fase 3:
--   * T06 (F2.5): CRUD cross-tenant A -> B en las 10 tablas public, 3 vistas *_safe y storage.objects
--   * T09 (F3.1): CRUD con JWT aal1 en usuario con factor TOTP MFA verificado (NEW-04)
--   * T12 (F3.4): Session takeover (DELETE en user_sessions por device_id sin filtro user_id, propio vs ajeno)
-- =============================================================================

\set ON_ERROR_STOP on
SET client_min_messages = warning;

-- 1. Roles y esquemas base de Supabase (PostgREST + GoTrue + Storage)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.mfa_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_type text NOT NULL,
  status text NOT NULL
);

GRANT SELECT ON TABLE auth.users, auth.mfa_factors TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt()->>'sub', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(auth.jwt()->>'role', ''), current_user);
$$;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(name, '/');
$$;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated, service_role;
GRANT ALL ON TABLE storage.objects TO anon, authenticated, service_role;

-- Políticas exactas de storage.objects extraídas de producción (F2-catalog-and-rls.md §5 / Anexo A)
CREATE POLICY "Users can delete own receipts" ON storage.objects FOR DELETE TO public
  USING ((bucket_id = 'receipts'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Users can delete their own receipts" ON storage.objects FOR DELETE TO public
  USING ((bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));
CREATE POLICY "Users can insert their own receipts" ON storage.objects FOR INSERT TO public
  WITH CHECK ((bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));
CREATE POLICY "Users can update their own receipts" ON storage.objects FOR UPDATE TO public
  USING ((bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));
CREATE POLICY "Users can upload own receipts" ON storage.objects FOR INSERT TO public
  WITH CHECK ((bucket_id = 'receipts'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Users can view own receipts" ON storage.objects FOR SELECT TO public
  USING ((bucket_id = 'receipts'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Users can view their own receipts" ON storage.objects FOR SELECT TO public
  USING ((bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]));
CREATE POLICY "Usuarios pueden subir sus comprobantes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'receipts'::text) AND (auth.uid() = owner));
CREATE POLICY "Usuarios pueden ver sus comprobantes" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'receipts'::text) AND (auth.uid() = owner));

CREATE PUBLICATION supabase_realtime;
