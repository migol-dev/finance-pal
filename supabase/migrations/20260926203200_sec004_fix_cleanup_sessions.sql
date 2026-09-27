-- Revocar acceso público y otorgar solo al rol autenticado
REVOKE EXECUTE ON FUNCTION cleanup_stale_sessions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cleanup_stale_sessions() FROM anon;

-- Solo permitir desde el backend (service_role) o anon autenticado con verificación interna
ALTER FUNCTION cleanup_stale_sessions()
  SECURITY DEFINER
  SET search_path = '';

-- Añadir verificación interna de que el llamante es autenticado
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Solo permite llamadas desde service_role o usuarios autenticados
  IF current_user NOT IN ('service_role', 'authenticated') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  DELETE FROM user_sessions
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes'
    AND created_at < NOW() - INTERVAL '2 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
