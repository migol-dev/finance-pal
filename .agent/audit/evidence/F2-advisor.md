# 🩺 Evidencia F2.6 — Supabase Security Advisor

> **Fase:** `F2.6` · **Nivel:** `N1` · **Fecha:** 2026-10-20
> **Endpoint:** `GET https://api.supabase.com/v1/projects/rjforcrdyfuodsqtopvp/advisors/security`
> **Autenticación:** Personal Access Token de `~/.supabase/access-token` (valor `***`, nunca impreso).
> **Respuesta:** `HTTP 200` · **2 lints** (ambos `WARN`, sin `ERROR`).

---

## 1. Resultado

| # | Lint | Nivel | Categoría | Objeto afectado |
| :-: | :--- | :---: | :--- | :--- |
| 1 | `authenticated_security_definer_function_executable` | `WARN` | SECURITY | `public.cleanup_stale_sessions()` |
| 2 | `auth_leaked_password_protection` | `WARN` | SECURITY | Configuración global de Supabase Auth |

### 1.1 `authenticated_security_definer_function_executable`

> “Function `public.cleanup_stale_sessions()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/cleanup_stale_sessions`.”

- **Confirmación independiente** de `NEW-03` / `SEC-004` (ver `F2-catalog-and-rls.md` §3).
- El Advisor detecta el privilegio; **no** detecta que el guard interno (`current_user`) está roto y hace que la función siempre lance `Access denied`.
- **Remediación recomendada:** `REVOKE EXECUTE … FROM authenticated` (dejar sólo `service_role`) o convertirla a `SECURITY INVOKER` con política adecuada; corregir el guard usando `session_user`/`auth.role()` si se pretende exponer.

### 1.2 `auth_leaked_password_protection`

> “Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.”

- Insumo directo para `SEC-008` (`F3.3`): **protección HIBP deshabilitada** en producción.
- **Remediación:** activar *Leaked Password Protection* en Auth → Passwords (Dashboard) o vía Management API.

---

## 2. Conclusión

- El Advisor **no reporta** tablas sin RLS, vistas sin `security_invoker` ni políticas `aal2` ausentes (este último no es un lint nativo).
- Los **2 únicos warnings** coinciden con hallazgos ya identificados: `NEW-03`/`SEC-004` (F2) y `SEC-008` (F3).
- No se encontraron avisos de tipo `ERROR`.

| Campo | Valor |
| :--- | :--- |
| Evidencia | Este archivo + `F2-catalog-and-rls.md` |
| Nivel | `N1` |
| Reproducible | Sí (mismo endpoint con token válido) |
