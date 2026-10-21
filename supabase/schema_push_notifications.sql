-- ====================================================================
-- MIGRACIÓN PARA NOTIFICACIONES WEB PUSH Y EDGE FUNCTIONS
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase
-- ====================================================================

-- 1. Tabla para almacenar las suscripciones de los navegadores Web
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON public.push_subscriptions(endpoint);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS (idempotentes)
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
    ON public.push_subscriptions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- P0 NEW-04: a verified MFA factor requires an aal2 JWT.
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

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.is_mfa_compliant() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_mfa_compliant() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_mfa_compliant() TO authenticated, service_role;

DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.push_subscriptions;
CREATE POLICY "Require AAL2 when MFA enabled"
    ON public.push_subscriptions AS RESTRICTIVE FOR ALL TO authenticated
    USING (public.is_mfa_compliant())
    WITH CHECK (public.is_mfa_compliant());

-- 2. Columna para persistir las preferencias granulares de notificaciones por usuario
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT NULL;

-- ====================================================================
-- OPCIONAL: Cron Job para ejecutar la Edge Function automáticamente
-- Para que se ejecute todos los días a las 9:00 AM (Requiere extensiones pg_cron y pg_net)
-- ====================================================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- SELECT cron.schedule(
--   'send-daily-finance-reminders',
--   '0 15 * * *', -- 9:00 AM hora México (UTC-6 -> 15:00 UTC)
--   $$
--   SELECT net.http_post(
--     url := 'https://rjforcrdyfuodsqtopvp.supabase.co/functions/v1/send-reminders',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

