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

-- Políticas de seguridad RLS
CREATE POLICY "Users can view own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions"
    ON public.push_subscriptions FOR UPDATE
    USING (true)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

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
