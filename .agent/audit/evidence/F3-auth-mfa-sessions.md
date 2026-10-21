# F3 — Autenticación, MFA y Sesiones (`T09`–`T12`)

> **Fase:** `F3` — Prioridad `P0`
> **Fecha de ejecución:** `2026-10-20`
> **Proyecto de producción:** `rjforcrdyfuodsqtopvp` (`financepal`, `us-east-1`, PostgreSQL `17.6.1`)
> **Niveles aplicados:** `N0` (revisión de código/config), `N1` (catálogo SQL y Management API), `N2` (prueba dinámica con cuentas de prueba)
> **Redacción:** no se imprimió ni almacenó ningún token, `service_role`, contraseña, `secret` de OAuth ni clave SMTP. La consulta a `/config/auth` se filtró con `jq` para eliminar todos los campos `*_secret`, `smtp_pass` y credenciales. Los identificadores de cliente OAuth se muestran como `***`.
> **Regla de alcance:** cero cambios en `src/**`, `supabase/**`, `android/**`, `public/**` o `package.json`. Este documento es el único artefacto de la fase, junto con la actualización del tracker.

---

## 0. Resumen ejecutivo

| ID | Hallazgo | Severidad | Veredicto |
| :--- | :--- | :---: | :--- |
| `NEW-04` | La exigencia de TOTP es **solo de interfaz**. Un JWT `aal1` conserva acceso completo a PostgREST/Storage porque ninguna política RLS ni función exige `aal2`. | **Crítica** | ⚠️ **CONFIRMADO** (estático + catálogo; `T09` dinámico escalado) |
| `SEC-008` | Política de contraseñas débil (mínimo 6, sin HIBP, sin CAPTCHA/lockout) y `rate-limiter.ts` **no está conectado al login**; solo actúa el límite de GoTrue por IP. | **Alta** | ❌ **CONFIRMADO (parcial)** |
| `SEC-012` | OAuth en flujo **implícito** (sin PKCE), tokens en el fragmento durante el callback y `isValidRedirectUri` permisivo con `localhost` y `*.financepal.com`. El SDK limpia el hash tras procesarlo y la allowlist del servidor mitiga el redirect arbitrario, pero no el resto. | **Media** | ⚠️ **CONFIRMADO (parcial)** — `T10` pasa por la allowlist de GoTrue |
| `SEC-010` | `requestTakeover` no exige reautenticación ni `aal2`; el canal Realtime es público y un `takeover_request` falsificado puede forzar el pause/auto-borrado de la sesión de otro dispositivo. RLS impide el borrado cross-tenant. | **Media** | ⚠️ **CONFIRMADO (diseño)** — `T12` dinámico escalado |
| `F3-A` (nuevo) | **No existe borrado de cuenta**: `resetAll` solo limpia Zustand/local y no borra filas en Supabase ni objetos en Storage. | **Media** (cumplimiento/GDPR) | ❌ **CONFIRMADO** |
| `F3-B` (nuevo) | Notificaciones de seguridad de Auth desactivadas (cambio de contraseña, email, alta/baja de MFA, vinculación de identidad). | **Media** | ❌ **CONFIRMADO** |
| `F3-C` (nuevo) | No existe flujo de recuperación de contraseña (`resetPasswordForEmail` ausente en todo `src/`). | **Baja/Media** (disponibilidad) | ❌ **CONFIRMADO** |
| `F3-D` (nuevo) | Los errores crudos de Supabase se muestran al usuario (`toast.error(error.message)`); riesgo CWE-209 si el backend devuelve mensajes internos. | **Baja** | ⚠️ **PARCIAL** |

**Conclusión de fase:** el control de MFA no protege los datos. Un atacante que obtenga la contraseña puede iniciar sesión (`aal1`), ignorar la pantalla TOTP y leer/escribir directamente en la API con el `access_token` de `aal1`. El MFA solo impide cambiar contraseña/email y desenrolar el factor (GoTrue sí exige `aal2` para esas operaciones), no el acceso a datos.

---

## 1. `F3.1` — Flujo MFA y prueba `T09` (`NEW-04`)

### 1.1 Flujo implementado en el cliente

| Archivo | Líneas | Comportamiento |
| :--- | :--- | :--- |
| `src/context/AuthContext.tsx` | `53-68` | `checkMfaStatus()` llama `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` y marca `mfaRequired = (currentLevel === 'aal1' && nextLevel === 'aal2')`. No bloquea la sesión ni revoca el token. |
| `src/context/AuthContext.tsx` | `168-209` | En `getSession()` y `onAuthStateChange('SIGNED_IN')` solo se actualiza el flag `mfaRequired`; la sesión `aal1` se guarda normalmente. |
| `src/App.tsx` | `235-240` | Si `!session \|\| mfaRequired` renderiza `<Login />` en lugar de `AppShell`. Es un **gate de renderizado**, no una autorización de API. |
| `src/pages/Login.tsx` | `309-345` | Pantalla de challenge TOTP: `mfa.challenge()` + `mfa.verify()`; al verificar, el SDK recibe un token `aal2`. |
| `src/pages/ajustes/secciones/PerfilSection.tsx` | `134-195` | Alta/baja de TOTP desde ajustes. La baja llama `mfa.unenroll()`; GoTrue exige `aal2` para desenrolar un factor verificado. |
| `src/pages/ajustes/secciones/SeguridadSection.tsx` | `96-111` | No contiene lógica MFA; su “zona de peligro” solo ejecuta `resetAll()` local. |

### 1.2 Evidencia de catálogo (producción)

Consultas ejecutadas vía Management API (`/database/query`) el `2026-10-20`:

```sql
-- 1) ¿Alguna política RLS exige aal2?
select count(*) as policies_total,
       count(*) filter (where qual like '%aal%' or with_check like '%aal%') as aal_policies
from pg_policies
where schemaname = 'public';
-- Resultado: {"policies_total":40,"aal_policies":0}

-- 2) ¿Alguna función (public/auth) referencia aal?
select count(*) as funcs_ref_aal
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','auth') and p.prosrc ilike '%aal%';
-- Resultado: {"funcs_ref_aal":0}

-- 3) Políticas de user_sessions
select policyname, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='user_sessions';
```

Resultado de `user_sessions` (4 políticas, todas por `auth.uid()`, ninguna por `aal`):

| Política | Comando | `USING` | `WITH CHECK` |
| :--- | :--- | :--- | :--- |
| `Users can view their own sessions` | `SELECT` | `(auth.uid() = user_id)` | — |
| `Users can insert their own sessions` | `INSERT` | — | `(auth.uid() = user_id)` |
| `Users can update their own sessions` | `UPDATE` | `(auth.uid() = user_id)` | — |
| `Users can delete their own sessions` | `DELETE` | `(auth.uid() = user_id)` | — |

La evidencia completa de las 40 políticas `public` está en `F2-catalog-and-rls.md` (§5, apéndice). Las 10 tablas de datos usan `auth.uid() = user_id`; `push_subscriptions` tiene 4 políticas equivalentes. **No hay ninguna referencia a `aal` en RLS ni en funciones.**

### 1.3 Prueba `T09` — token `aal1` con MFA activo

**Estado:** `⚠️ ESCALADA` — no se ejecutó la prueba dinámica porque esta sesión no dispone de una cuenta de prueba con TOTP verificado (`audit-a`/`audit-b` no existen). No se usaron cuentas reales ni se crearon usuarios en producción.

**Conclusión estática (autoritativa):** PostgREST autoriza cada petición con el JWT y aplica RLS. Las políticas solo comprueban `auth.uid() = user_id`; ninguna consulta `auth.jwt()->>'aal'`. Por tanto, un `access_token` emitido tras el login con contraseña (`aal1`) permite las mismas operaciones CRUD que un token `aal2` sobre las filas del propio usuario, incluyendo Storage si sus políticas también usan `auth.uid()` (ver `F2-catalog-and-rls.md` §4).

**Cadena de ataque reproducible:**

1. La víctima tiene TOTP verificado.
2. El atacante obtiene la contraseña (phishing, reutilización, credential stuffing) y llama directamente:
   ```http
   POST /auth/v1/token?grant_type=password
   Content-Type: application/json
   apikey: <anon-key>

   {"email":"victima@example.com","password":"<contraseña>"}
   ```
   GoTrue devuelve una sesión `aal1` (`access_token` con `"aal":"aal1"`); el challenge TOTP es un paso adicional del cliente, no un requisito del grant.
3. El atacante ignora la UI y usa el token contra PostgREST:
   ```http
   GET /rest/v1/transactions?select=*
   apikey: <anon-key>
   Authorization: Bearer <access_token-aal1>
   ```
   RLS devuelve las filas del usuario. Lo mismo aplica a `accounts`, `goals`, `debts`, `fixed_items`, `debt_payments`, `user_settings`, `user_sessions` y `push_subscriptions`.
4. GoTrue **sí** bloquea con `401 insufficient_aal` el cambio de email/contraseña y el `unenroll` de un factor verificado cuando el usuario tiene MFA y la sesión es `aal1` (código de `supabase/auth` `internal/api/user.go`: “AAL2 session is required to update email or password when MFA is enabled”). Es decir, el MFA evita la persistencia de la cuenta, pero **no la lectura/exfiltración ni la modificación de datos financieros**.

**Impacto:** bypass completo del segundo factor para el activo principal (datos financieros). La severidad se mantiene **Crítica** aunque el cambio de credenciales esté protegido.

**Reproducción para `agy` (cuando exista `audit-a`):**

```bash
# 1) Login solo con contraseña -> guardar access_token (aal1)
curl -s "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"audit-a@example.test","password":"<password>"}' \
  | jq -r '.access_token' > /tmp/aal1.jwt

# 2) Verificar el claim aal
python3 -c 'import base64,json,sys; p=sys.argv[1].split(".")[1]; print(json.loads(base64.urlsafe_b64decode(p+"="*(-len(p)%4)))["aal"])' "$(cat /tmp/aal1.jwt)"   # esperado: "aal1"

# 3) CRUD directo con aal1 (esperado vulnerable: 200/201)
curl -s -o /dev/null -w '%{http_code}\n' "$SUPABASE_URL/rest/v1/transactions?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $(cat /tmp/aal1.jwt)"
```

Criterio de aceptación: si el paso 3 devuelve `200` con filas, `T09` confirma el bypass. Si devuelve `401/403`, la política de producción cambió y debe reabrirse `NEW-04`.

---

## 2. `F3.2` — OAuth, PKCE, redirects y callback (`T10`, `SEC-012`)

### 2.1 Cliente Supabase sin PKCE

`src/lib/supabase.ts:33`:

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

No se pasa `auth: { flowType: 'pkce' }`. En `@supabase/supabase-js` v2 el flujo por defecto es **implícito** para navegador: el proveedor devuelve `access_token` y `refresh_token` en el fragmento (`#access_token=...`). PKCE es opt-in.

**Consecuencias:**

- Durante el callback, los tokens viajan en `window.location.hash`. `@supabase/supabase-js` los extrae y limpia el hash (`window.location.hash = ''` en `_getSessionFromURL`), por lo que la barra de direcciones no los conserva tras la inicialización. Aun así, el flujo implícito no usa `code_verifier`: si el fragmento se filtra **antes** de procesarse (extensión, XSS en el callback, app que registra el esquema), el token es directamente utilizable. La entrada de historial con el fragmento puede persistir según el navegador (no verificado).
- En Android, el redirect usa el esquema personalizado `app.financepal.com://auth/callback` (`android/app/src/main/AndroidManifest.xml:29` y `capacitor.config.ts` `appId`). Android no garantiza unicidad de esquemas: otra app puede registrar el mismo `intent-filter` y competir por el token. Con flujo implícito no hay `code_verifier`, así que la intercepción del token es suficiente.

### 2.2 `isValidRedirectUri` permisivo

`src/pages/Login.tsx:31-52`:

```ts
const OAUTH_REDIRECT_ALLOWLIST = [ ... ];
function isValidRedirectUri(uri: string): boolean {
  const parsed = new URL(uri);
  if (OAUTH_REDIRECT_ALLOWLIST.includes(uri)) return true;
  if (parsed.hostname.endsWith('.financepal.com') && parsed.pathname === '/auth/callback') return true;
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
  return false;
}
```

Defectos:

- `localhost`/`127.0.0.1` acepta **cualquier puerto y cualquier path**, no solo `:5173/auth/callback`.
- `*.financepal.com` acepta cualquier subdominio (incluido uno con *subdomain takeover* o un despliegue de terceros) y no valida el protocolo (`http` vs `https`).
- La lista del cliente incluye `:8080` y `:3000`, que no están en la allowlist de producción.

### 2.3 Allowlist real del servidor (mitigación de `T10`)

Producción (`/config/auth`, campo `uri_allow_list`):

```text
app.financepal.com://auth/callback
https://financepal-web.vercel.app/auth/callback
http://localhost:5173/auth/callback
https://statuesque-griffin-15f36c.netlify.app/auth/callback
```

GoTrue valida `redirect_to` contra esta lista **exacta**. Por eso un `http://localhost:9999/...` o un `https://evil.financepal.com/...` generado por el cliente es rechazado por el servidor. **`T10` (redirect OAuth arbitrario) → `✅ PASA`**, con la salvedad de que la defensa efectiva está en el servidor y el código cliente es demasiado permisivo (si mañana se amplía la allowlist, el fallo se materializa).

Riesgos residuales:

- `https://statuesque-griffin-15f36c.netlify.app/` está **vivo** (`HTTP 200`, build distinto al de Vercel: `index-hLe11yV8.js` vs `index-CVj-pKdJ.js`). Es un host de OAuth permitido que probablemente ejecuta una versión antigua. Debe retirarse de la allowlist y apagarse (ver `F9`/`NEW-12`).
- El esquema `app.financepal.com://` sigue siendo interceptable; migrar a Android App Links (`https://`) + PKCE.
- `http://localhost:5173` en producción permite que cualquier proceso local que escuche ese puerto reciba el callback durante desarrollo; no es explotable remotamente, pero no debería estar en la allowlist de producción.

### 2.4 `AuthCallback.tsx` no aporta limpieza ni manejo explícito de errores OAuth

`src/pages/AuthCallback.tsx:10-22`:

```ts
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) { setError(error.message); return; }
    if (session) navigate('/', { replace: true });
    else setError('No se pudo establecer la sesión');
  });
}, [navigate]);
```

- No lee explícitamente `error`, `error_code` ni `error_description` de query/hash; solo muestra `error.message` si `getSession()` falla. Un fallo OAuth se reduce a “No se pudo establecer la sesión” o al mensaje genérico del SDK, sin código ni logging.
- No ejecuta `history.replaceState()` ni valida el `state`. El SDK limpia el hash al procesar el flujo implícito (`window.location.hash = ''`), pero `AuthCallback` no añade ninguna defensa propia; la URL con fragmento puede quedar en el historial según el navegador (no verificado).
- En flujo implícito el `state` no protege la confidencialidad del token; solo ayuda contra CSRF de login.

**Recomendación:** `flowType: 'pkce'`, `detectSessionInUrl: true`, `redirectTo` calculado en servidor o validado con `pathname === '/auth/callback'` y protocolo `https`, limpieza inmediata de URL, manejo de `error_description`, y allowlist de servidor como única fuente de verdad.

---

## 3. `F3.3` — Configuración de Auth y comparativa ASVS V2 (`T11`, `SEC-008`)

### 3.1 Configuración efectiva de producción (redactada)

Consulta: `GET https://api.supabase.com/v1/projects/rjforcrdyfuodsqtopvp/config/auth` con el token de `~/.supabase/access-token`. Salida filtrada con `jq` para eliminar `*_secret`, `smtp_pass` y credenciales. Los `client_id` se muestran como `***`.

| Parámetro | Valor en producción | Evaluación |
| :--- | :--- | :--- |
| `password_min_length` | `6` | ❌ Muy por debajo de ASVS L2 (12) |
| `password_required_characters` | `null` | ⚪ Sin reglas de composición (no es un fallo por sí solo) |
| `password_hibp_enabled` | `false` | ❌ Sin comprobación de contraseñas filtradas |
| `mailer_autoconfirm` | `false` | ✅ Confirmación de email obligatoria |
| `mailer_allow_unverified_email_sign_ins` | `false` | ✅ No permite login sin verificar |
| `disable_signup` | `false` | ⚠️ Registro abierto |
| `security_captcha_enabled` | `false` | ❌ Sin CAPTCHA |
| `rate_limit_email_sent` | `2`/hora | ✅ Conservador |
| `rate_limit_token_refresh` | `150`/5 min/IP | ✅ |
| `rate_limit_verify` | `30`/5 min/IP | ✅ |
| `rate_limit_otp` | `30`/5 min/IP | ✅ |
| `rate_limit_anonymous_users` | `30`/hora/IP | ⚪ Irrelevante: anónimos deshabilitados |
| `rate_limit_sign_in_sign_ups` | No expuesto por la API | ⚠️ `config.toml` local fija `30`/5 min/IP; se asume el valor por defecto de GoTrue |
| `jwt_exp` | `3600` (1 h) | ✅ |
| `refresh_token_rotation_enabled` | `true` | ✅ |
| `security_refresh_token_reuse_interval` | `10` s | ✅ |
| `sessions_timebox` | `0` | ❌ Sin caducidad absoluta de sesión |
| `sessions_inactivity_timeout` | `0` | ❌ Sin caducidad por inactividad en servidor |
| `sessions_single_per_user` | `false` | ⚪ Multisesión permitida |
| `security_update_password_require_current_password` | `false` | ❌ Cambio de contraseña sin contraseña actual |
| `security_update_password_require_reauthentication` | `false` | ❌ Sin reautenticación reciente |
| `mfa_totp_enroll_enabled` / `mfa_totp_verify_enabled` | `true` / `true` | ✅ TOTP disponible |
| `mfa_max_enrolled_factors` | `10` | ✅ |
| `mailer_secure_email_change_enabled` | `true` | ✅ Cambio de email con doble confirmación |
| `mailer_notifications_password_changed_enabled` | `false` | ❌ Sin aviso al usuario |
| `mailer_notifications_email_changed_enabled` | `false` | ❌ |
| `mailer_notifications_mfa_factor_enrolled_enabled` | `false` | ❌ |
| `mailer_notifications_mfa_factor_unenrolled_enabled` | `false` | ❌ |
| `mailer_notifications_identity_linked_enabled` / `unlinked` | `false` / `false` | ❌ |
| `mailer_otp_length` / `mailer_otp_exp` | `8` / `3600` s | ✅ |
| `audit_log_disable_postgres` | `true` | ⚠️ Los eventos de Auth no se guardan en Postgres; dependen de logs externos |
| `security_sb_forwarded_for_enabled` | `false` | ⚠️ El rate limit por IP depende del proxy de Supabase |
| `external_google_enabled` / `external_github_enabled` | `true` / `true` | ⚠️ Superficie OAuth adicional |
| `external_*_client_id` | `***` | Redactado |
| `site_url` | `https://financepal-web.vercel.app/` | ✅ |
| `uri_allow_list` | 4 entradas (ver §2.3) | ⚠️ Incluye Netlify antiguo y esquema custom |

### 3.2 Configuración local (`supabase/config.toml`)

| Parámetro | `config.toml` | Producción | Comentario |
| :--- | :--- | :--- | :--- |
| `minimum_password_length` | `6` | `6` | Mismo defecto |
| `password_requirements` | `""` | `null` | Sin composición |
| `enable_confirmations` (email) | `false` | `true` (autoconfirm false) | El local permite login sin confirmar; producción no |
| `enable_signup` | `true` | `true` (`disable_signup=false`) | Registro abierto |
| `jwt_expiry` | `3600` | `3600` | Correcto |
| `enable_refresh_token_rotation` | `true` | `true` | Correcto |
| `refresh_token_reuse_interval` | `10` | `10` | Correcto |
| `rate_limit.email_sent` | `2` | `2` | Correcto |
| `rate_limit.token_refresh` | `150` | `150` | Correcto |
| `rate_limit.sign_in_sign_ups` | `30` | No expuesto | Se asume |
| `rate_limit.token_verifications` | `30` | `rate_limit_verify=30` | Correcto |
| `[auth.captcha]` | Comentado | `security_captcha_enabled=false` | Sin CAPTCHA |
| `secure_password_change` | `false` | `...require_reauthentication=false` | Sin reautenticación |
| `double_confirm_changes` | `true` | `mailer_secure_email_change_enabled=true` | Correcto |
| `[auth.email.smtp]` | Comentado | SMTP gestionado por Supabase | ⚪ No verificable |

### 3.3 `rate-limiter.ts`: configurado pero no conectado al login

`src/lib/rate-limiter.ts:112` define:

```ts
rateLimiter.configure('auth', { maxRequests: 10, windowMs: 60000, keyPrefix: 'auth' });
```

Sin embargo, la única importación/uso en `src/` es `src/lib/sync-engine.ts:81` (`rateLimiter.checkLimit(clientId, 'sync')`). `Login.tsx`, `AuthContext.tsx` y `PerfilSection.tsx` **no** llaman a `withRateLimit`, `consume` ni `checkLimit`. Además, el store es un `Map` en memoria del cliente, trivialmente evitable recargando la página o usando otro navegador.

**Protección real:** solo el rate limit de GoTrue por IP (30 intentos de sign-in/sign-up por 5 min en `config.toml`; no expuesto en la API de producción) y `rate_limit_email_sent=2/h`. Sin CAPTCHA, sin bloqueo de cuenta y sin límite por identidad (email). Un atacante distribuido puede hacer credential stuffing a ~8.640 intentos/día/IP.

### 3.4 Tabla comparativa ASVS 4.0.3 — Sección V2

| ASVS | Requisito (resumen) | Resultado | Evidencia |
| :--- | :--- | :---: | :--- |
| `V2.1.1` | Contraseñas de al menos 12 caracteres (L2) | ❌ **FALLA** | `password_min_length=6` / `minimum_password_length=6` |
| `V2.1.5` | El usuario puede cambiar su contraseña | ✅ **PASA** (con salvedad) | `PerfilSection.tsx:120-132` (`updateUser`) |
| `V2.1.6` | El cambio de contraseña exige la contraseña actual | ❌ **FALLA** | No se solicita; `require_current_password=false` |
| `V2.1.7` | Comprobación contra contraseñas filtradas | ❌ **FALLA** | `password_hibp_enabled=false` |
| `V2.1.8` | Medidor de fortaleza de contraseña | ⚠️ **PARCIAL** | `Login.tsx:82-110` calcula score, pero el servidor acepta 6 caracteres y el registro solo exige score ≥3 en cliente (evitable) |
| `V2.1.9` | Sin reglas de composición que reduzcan el espacio de contraseñas | ✅ **PASA** | `password_required_characters=null` |
| `V2.2.1` | Controles anti-automatización eficaces (breached credentials, fuerza bruta, lockout) | ❌ **FALLA (parcial)** | GoTrue 30/5 min/IP; sin CAPTCHA/lockout; `rate-limiter` de login no conectado |
| `V2.2.3` | Notificación segura tras cambios de autenticación | ❌ **FALLA** | 6 notificaciones de Auth en `false` |
| `V2.3.1` | Terminación de sesión y cierre global | ⚠️ **PARCIAL** | `signOut()` global por defecto (auth-js), pero `sessions_timebox=0`/`inactivity=0`; el JWT de acceso sigue válido hasta 1 h |
| `V2.4.1` | Almacenamiento de contraseñas resistente a ataques offline | ✅ **PASA** (gestionado) | GoTrue/Supabase usa bcrypt; no verificable desde el cliente |
| `V2.5.5` | Recuperación de contraseña segura | ❌ **FALLA** | No existe `resetPasswordForEmail` ni UI de recuperación |
| `V2.5.6` | La recuperación no revela si la cuenta existe | ⚪ **N/A** | No hay flujo de recuperación |
| `V2.6.1`–`V2.6.3` | Look-up secrets | ⚪ **N/A** | No se usan |
| `V2.7.1`–`V2.7.4` | Verificadores fuera de banda (SMS/email OTP) | ⚪ **N/A** | SMS deshabilitado; email OTP solo para confirmación, no login |
| `V2.8.1` | TOTP con vida útil definida | ✅ **PASA** | TOTP estándar 30 s; GoTrue |
| `V2.8.2` | Clave simétrica TOTP protegida | ⚪ **No verificable** | Gestionado por Supabase |
| `V2.8.3` | TOTP no es el único factor | ✅ **PASA** | TOTP es segundo factor tras contraseña/OAuth |
| `V2.9.1`–`V2.9.3` | Verificadores criptográficos | ⚪ **N/A** | No hay hardware tokens |
| `V2.10.1`–`V2.10.4` | Autenticación de servicios | ⚪ **N/A** | No aplica a este cliente |

**Veredicto `T11`:** ❌ **FALLA**. Los controles positivos (confirmación de email, JWT de 1 h, rotación de refresh, TOTP disponible) no compensan la longitud mínima de 6, la ausencia de HIBP/CAPTCHA y la falta de notificaciones de seguridad.

---

## 4. `F3.4` — Enumeración, takeover, `signOut` y borrado de cuenta (`T12`, `SEC-010`)

### 4.1 Mensajes de error y enumeración de cuentas

`src/pages/Login.tsx`:

- `270`: `toast.error(error.message || \`Error al iniciar sesión con ${provider}\`)` (OAuth).
- `303`: `toast.error(error.message || 'Error de autenticación')` (login/registro).
- `340`: `toast.error(error.message || 'Código 2FA incorrecto o expirado')` (TOTP).

No hay flujo de “olvidé mi contraseña” (`grep -rn "resetPasswordForEmail" src/` → 0 resultados), por lo que la enumeración por recuperación no existe.

**Evaluación:**

- Login con contraseña incorrecta: GoTrue devuelve `Invalid login credentials` tanto si el email existe como si no → **no enumera**.
- Registro con email existente: con `mailer_autoconfirm=false`, GoTrue devuelve un usuario ofuscado (identidades vacías) para no revelar existencia; la UI muestra siempre “Cuenta creada. Revisa tu correo” (`Login.tsx:300`). **No se pudo verificar dinámicamente**, pero el comportamiento por defecto de GoTrue mitiga la enumeración.
- El uso de `error.message` crudo es **CWE-209** (exposición de información interna) y depende del backend. Si se cambia GoTrue o se añade un proxy con mensajes detallados, podría filtrar detalles. Severidad baja.
- No hay rate limit específico por email; un atacante puede probar contraseñas contra muchas cuentas distribuyendo IPs (ver `SEC-008`).

### 4.2 `requestTakeover`: diseño y superficie Realtime

`src/hooks/useSessionManager.ts`:

| Línea | Comportamiento |
| :--- | :--- |
| `90` | `supabase.channel(\`user_sessions:${userId}\`)` — canal **público** (sin `{ config: { private: true } }`). Cualquier cliente con la `anon` key puede suscribirse si conoce el `userId`. |
| `93-116` | Al recibir `takeover_request` cuyo `targetDeviceId` coincide con el dispositivo local, ejecuta `processSyncQueue()`, envía `takeover_ready` y **borra su propia fila** de `user_sessions` (`:111`). |
| `57-79` | `requestTakeover()` envía el broadcast y, a los **15 s**, fuerza `delete().eq('device_id', otherDevice.id)` (`:72`) sin `.eq('user_id', userId)` (RLS lo limita al usuario autenticado, pero falta defensa en profundidad). |
| `125-153` | `new_login` difunde `{ sourceDeviceId, deviceName }` a todos los suscriptores del canal. |

**Escenario de abuso (DoS):**

1. Un atacante con la `anon` key (pública, embebida en el bundle) conoce el `userId` de la víctima (UUID que puede filtrarse en soporte, logs o enlaces) y se suscribe a `user_sessions:<userId>`.
2. Espera un evento `new_login` para obtener un `deviceId`, o lo consigue por otro canal.
3. Envía un broadcast `takeover_request` con `targetDeviceId` = dispositivo de la víctima.
4. El cliente de la víctima ejecuta el sync, borra su fila de sesión y pasa a `paused`. La víctima pierde la sesión de UI hasta recargar; no hay robo de datos ni borrado cross-tenant porque RLS exige `auth.uid() = user_id`.

**Lo que `SEC-010` realmente demuestra:** el takeover **no exige reautenticación ni MFA** y confía en un broadcast no autenticado. No es un bypass de autenticación (el atacante no obtiene la sesión de la víctima), pero sí un **DoS dirigido** y una debilidad de diseño. La mitigación correcta es:

- Canales **privados** con Realtime Authorization (RLS sobre `realtime.messages`) o un canal por dispositivo autenticado.
- Validar el emisor en el servidor (Edge Function) y exigir `aal2`/reautenticación para un takeover.
- Incluir siempre `.eq('user_id', userId)` en el borrado.
- No difundir `deviceId`/`deviceName` a todos los suscriptores.

**T12 — estado:** `⚠️ ESCALADA`. No se ejecutó la prueba dinámica de dos dispositivos por falta de cuentas. Reproducción para `agy`: crear `audit-a`, abrir dos sesiones (dispositivo A y B), suscribir un tercer cliente con la `anon` key a `user_sessions:<uuid-A>`, capturar el `deviceId` de A en `new_login` y enviar `takeover_request`; verificar que A pasa a `paused` y borra su fila. Comprobar también que un JWT de `audit-b` **no** puede borrar filas de `audit-a` (RLS).

### 4.3 Baja de MFA

`PerfilSection.tsx:183-195` llama `supabase.auth.mfa.unenroll({ factorId })`. GoTrue exige `aal2` para desenrolar un factor verificado (documentación de `mfa.unenroll`: “A user has to have an aal2 authenticator level in order to unenroll a verified factor”). Por tanto, **la baja de MFA no es un bypass** desde una sesión `aal1`. No obstante:

- No se solicita contraseña ni reautenticación adicional; un `aal2` robado (o una sesión abierta) puede desactivar MFA sin fricción.
- No se envía notificación al usuario (`mailer_notifications_mfa_factor_unenrolled_enabled=false`).
- El botón está en `PerfilSection`, no en `SeguridadSection` (la tarea original lo ubicaba allí; `SeguridadSection` solo tiene el reset local).

### 4.4 Alcance de `signOut`

`AuthContext.tsx:77` llama `supabase.auth.signOut()` sin opciones. En `@supabase/supabase-js` v2 el `scope` por defecto es `'global'` (confirmado en `node_modules/@supabase/auth-js/dist/module/GoTrueClient.d.ts:2000`: “the default `scope` is `'global'`”). Esto revoca todos los refresh tokens del usuario, lo cual es correcto.

Limitaciones:

- Los **access tokens** ya emitidos siguen siendo válidos hasta `exp` (1 h); no hay revocación inmediata de JWT.
- `sessions_timebox=0` y `sessions_inactivity_timeout=0`: el timeout de 30 min de `AuthContext.tsx:32-33` es solo cliente; un refresh token robado no caduca por inactividad en el servidor.
- `signOut` limpia Zustand, la cola de sync, `clearEncryptedState()` y React Query, pero **no** borra:
  - la fila de `user_sessions` del dispositivo (queda stale hasta 90 s),
  - las IndexedDB `finance-pal-receipts` y `finance-pal-audit`,
  - Cache Storage.
  Esto se profundiza en `F4` (`SEC-015`).

### 4.5 Borrado de cuenta (ausente)

Búsqueda en `src/` y `supabase/`:

- `deleteUser` → 0 resultados.
- `resetAll` (`src/store/finance-store.ts:279-290`) solo hace `set({...})` local y registra `audit.dataDeleted`; no llama a Supabase ni a Storage.
- `SeguridadSection.tsx:96-111` describe “Restablecer todos los datos locales” y ejecuta `resetAll()`.
- No hay Edge Function de borrado ni llamada a `storage.from('receipts').remove(...)`.

**Impacto:** un usuario no puede ejercer el derecho de supresión; las filas de `accounts`, `transactions`, `goals`, `debts`, `fixed_items`, `debt_payments`, `user_settings`, `user_sessions`, `push_subscriptions` y los objetos de `receipts` permanecen indefinidamente. Es un hallazgo de cumplimiento (GDPR/CCPA) que debe consolidarse en `F10`/`F11`.

---

## 5. Hallazgos y actualización de checklists

### 5.1 `SEC-*`

| ID | Estado verificado F3 | Evidencia |
| :--- | :--- | :--- |
| `SEC-008` | ❌ **CONFIRMADO (parcial)** — `rate-limiter.ts` no se usa en login; solo GoTrue 30/5 min/IP; mínimo 6; HIBP off; sin CAPTCHA/lockout | §3.3, §3.4 |
| `SEC-010` | ⚠️ **CONFIRMADO (diseño)** — takeover sin reautenticación/MFA; canal público; DoS dirigido; RLS impide cross-tenant | §4.2 |
| `SEC-012` | ⚠️ **CONFIRMADO (parcial)** — flujo implícito, allowlist cliente laxa; allowlist GoTrue mitiga redirect arbitrario (`T10` pasa) | §2 |

### 5.2 `NEW-*`

| ID | Veredicto F3 | Evidencia |
| :--- | :--- | :--- |
| `NEW-04` | ⚠️ **CONFIRMADO** — 0 políticas/funciones con `aal`; `aal1` conserva CRUD sobre datos; MFA solo bloquea cambio de credenciales y unenroll | §1.2, §1.3 |

### 5.3 Matriz `T*`

| Prueba | Estado | Resultado |
| :--- | :--- | :--- |
| `T09` REST con token `aal1` en cuenta con MFA | ⚠️ **ESCALADA** (estático concluyente) | 0 políticas `aal`; `aal1` accede a PostgREST; falta prueba dinámica con `audit-a` |
| `T10` Redirect OAuth arbitrario | ✅ **PASA** (con salvedad) | GoTrue rechaza redirects fuera de `uri_allow_list`; cliente laxo y Netlify antiguo como riesgo residual |
| `T11` Configuración de Auth | ❌ **FALLA** | Mínimo 6, HIBP off, sin CAPTCHA, sin notificaciones, sin recuperación, sin timeout servidor |
| `T12` Takeover sin re-autenticación | ⚠️ **ESCALADA** (estático concluyente) | `requestTakeover` sin reauth; canal público; falta prueba de dos dispositivos |

### 5.4 Trazabilidad de comandos

```bash
# Config de Auth (redactada, sin secretos)
TOKEN=$(cat ~/.supabase/access-token)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/rjforcrdyfuodsqtopvp/config/auth" \
  | jq 'with_entries(select(.key | test("secret|smtp_pass"; "i") | not))'

# Catálogo RLS / funciones
/tmp/pgq.sh "select count(*) ..., count(*) filter (where qual like '%aal%' ...) from pg_policies where schemaname='public';"
/tmp/pgq.sh "select count(*) from pg_proc ... where prosrc ilike '%aal%';"
/tmp/pgq.sh "select policyname, cmd, qual, with_check from pg_policies where tablename='user_sessions';"

# Código
rg -n "flowType|createClient" src/lib/supabase.ts
rg -n "resetPasswordForEmail|deleteUser|mfa.unenroll|signOut\(" src/
rg -n "supabase.channel|takeover_request|from\('user_sessions'\).delete" src/hooks/useSessionManager.ts
```

---

## 6. Escalamientos abiertos para `agy`

| Tarea | Prueba | Motivo | Acción solicitada |
| :--- | :--- | :--- | :--- |
| `F3.1` | `T09` | No hay cuenta con TOTP verificado; no se deben usar cuentas reales | Provisionar `audit-a` con TOTP, ejecutar §1.3 y confirmar `200` con `aal1`; comparar con `aal2`; borrar la cuenta al cierre |
| `F3.4` | `T12` | No hay dos dispositivos/cuentas para el takeover | Provisionar `audit-a`/`audit-b`, ejecutar §4.2; verificar DoS y denegación cross-tenant; borrar cuentas al cierre |

> Ambos escalamientos son **solo de prueba dinámica**: la conclusión estática ya está sustentada por el catálogo (`0` políticas `aal`) y por el código de GoTrue. No bloquean la remediación de `NEW-04`.

---

## 7. Referencias

- `src/context/AuthContext.tsx` — `checkMfaStatus`, `signOut`, listeners de sesión.
- `src/App.tsx:235-240` — gate de renderizado `mfaRequired`.
- `src/pages/Login.tsx:31-52`, `:270`, `:275-345` — allowlist, errores y challenge TOTP.
- `src/pages/AuthCallback.tsx:10-22` — callback OAuth sin manejo explícito de `error_description`.
- `src/pages/ajustes/secciones/PerfilSection.tsx:108-195` — cambio de email/contraseña y MFA.
- `src/pages/ajustes/secciones/SeguridadSection.tsx:96-111` — reset local.
- `src/hooks/useSessionManager.ts:57-153` — takeover y canal Realtime.
- `src/lib/supabase.ts:33` — `createClient` sin PKCE.
- `src/lib/rate-limiter.ts:112` — configuración `auth` no utilizada.
- `src/store/finance-store.ts:279-290` — `resetAll` local.
- `supabase/config.toml` — `[auth]`, `[auth.rate_limit]`, `[auth.email]`.
- `F2-catalog-and-rls.md` — 40 políticas `public`, 0 `aal`, Storage y vistas.
- `F2-schema-drift.md` — diferencias de esquema que también afectan Auth/sesiones.
- GoTrue `internal/api/user.go` — `AAL2 session is required to update email or password when MFA is enabled`.
- Supabase Docs — `mfa.unenroll` requiere `aal2` para factores verificados; `signOut` por defecto `scope: 'global'`.
