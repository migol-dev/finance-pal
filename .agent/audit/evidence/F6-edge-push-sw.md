# F6 — Edge Function, Web Push y Service Worker (`T17`–`T19`, `SEC-003`, `SEC-013`, `SEC-017`, `NEW-07`, `NEW-08`, `NEW-09`)

> **Fase:** `F6` — Prioridad `P1`
> **Fecha:** `2026-10-20` (pruebas N2: `2026-10-21 01:39 UTC`)
> **Niveles:** `N0` (código) + `N1` (metadatos y secretos de producción, redactados) + `N2` (2 peticiones no destructivas)
> **Alcance:** `supabase/functions/send-reminders/index.ts`, `supabase/config.toml`, función desplegada `send-reminders`, `public/sw.js`, `src/lib/web-push.ts`, `src/lib/notifications.ts`, `src/hooks/useNotificationScheduler.ts` y RLS de `push_subscriptions`.
> **Estado:** paridad **FALLA**; `SEC-003`/`SEC-017`/`SEC-013` confirmados con matices; `NEW-08` y `NEW-09` confirmados; se detectó que la función desplegada está **inoperante** (secreto vacío + `VAPID_PUBLIC_KEY` ausente).

---

## 0. Resumen

| Hallazgo | Severidad | Veredicto |
| :--- | :---: | :--- |
| `SEC-003` — Edge Function sin auth / comparación no constante | **Media** | ⚠️ **PARCIAL**: hay autenticación por `FUNCTION_SECRET` y `verify_jwt=true`; no se puede invocar sin credenciales. Pero la comparación es `!==` (no constante) y el secreto desplegado está **vacío**, por lo que la función falla cerrada (401) para todos. |
| `SEC-013` — Rate limit en memoria evadible | **Baja** | ❌ **CONFIRMADO (estático)**: `Map` por isolate, clave = cadena completa `x-forwarded-for`, sin poda, antes de autenticar. |
| `SEC-017` — CORS wildcard | **Baja** | ❌ **CONFIRMADO**: el bundle desplegado fija `Access-Control-Allow-Origin: *`; `ALLOWED_ORIGIN` no existe como secreto. |
| `NEW-07` — Supply chain `esm.sh` flotante | **Media** | ⚠️ **PARCIAL**: `@supabase/supabase-js@2` se resolvió a `2.117.2` al desplegar; el bundle incluye `sourcesContent` (código fuente completo). |
| `NEW-08` — Open redirect / `message` sin origen en el SW | **Media** | ❌ **CONFIRMADO**: PoC `OPEN_REDIRECT_CONFIRMED`; `notificationclick` abre `data.url` externo y `message` acepta payloads de cualquier origen. |
| `NEW-09` — Montos financieros en notificaciones | **Media/Baja** | ❌ **CONFIRMADO**: el cliente usa `hideAmountsInNotifications=false` por defecto y la versión desplegada **siempre** incluye montos, nombres y conceptos; no consulta preferencias. |
| `F6-A` (nuevo) — Función de recordatorios inoperante | **Alta (disponibilidad)** | ❌ `FUNCTION_SECRET` es cadena vacía y falta `VAPID_PUBLIC_KEY`; el código desplegado responde 401 siempre y, si se saltara ese guard, 500. No hay `pg_cron` ni scheduler en el repo. |
| `F6-B` (nuevo) — Deriva entre producción y repositorio | **Media** | ❌ Producción ejecuta la versión 4 (239 líneas, 2026-09-27); el repo tiene 548 líneas (2026-10-11). Lógica de recordatorios, CORS y auth diferentes. |
| `F6-C` (nuevo) — `push_subscriptions` UPDATE con `USING (true)` | **Baja** | ❌ Un usuario podría reasignar a su cuenta una suscripción ajena si conoce el `endpoint`; `WITH CHECK` impide asignarla a otro. |
| `F6-D` (nuevo) — `message` del SW sin validar `event.origin`/`event.source` | **Baja/Media** | ❌ Cualquier página del mismo origen (o XSS) puede mostrar notificaciones arbitrarias; el SW no comprueba el emisor. |

---

## 1. Metadatos de la función desplegada (`N1`)

Consulta: `GET /v1/projects/rjforcrdyfuodsqtopvp/functions` (token de Management API, nunca impreso).

| Campo | Valor |
| :--- | :--- |
| `slug` / `name` | `send-reminders` |
| `status` | `ACTIVE` |
| `version` | `4` |
| `created_at` | `2026-08-28 04:22:28 UTC` |
| `updated_at` | `2026-09-27 02:43:11 UTC` |
| `verify_jwt` | `true` |
| `import_map` | `false` |
| `entrypoint_path` | `/tmp/user_fn_…/source/supabase/functions/send-reminders/index.ts` |
| `ezbr_sha256` | `ab23b2c3…` (hash del bundle) |

`supabase/config.toml` **no** contiene un bloque `[functions.send-reminders]`; el valor efectivo en producción es `verify_jwt=true` (el valor por defecto del CLI también es `true`). **No hay configuración declarativa de la función en el repo.**

---

## 2. Paridad producción ↔ repositorio (`F6-B`)

Método (N1, sin ejecutar la función):

```bash
TOKEN=$(cat ~/.supabase/access-token)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/rjforcrdyfuodsqtopvp/functions/send-reminders/body" \
  -o /tmp/f6-fn-body.bin
# El body es un ESZIP2; el source map incluye sourcesContent.
# Se extrajo el fuente desplegado a /tmp/deployed-send-reminders.ts y se comparó con diff.
```

Resultado: **no hay paridad**.

| Aspecto | Repositorio (`supabase/functions/send-reminders/index.ts`) | Producción (versión 4) |
| :--- | :--- | :--- |
| Tamaño | 548 líneas | 239 líneas |
| CORS | `Deno.env.get("ALLOWED_ORIGIN") \|\| "*"` (L10-15) | `"Access-Control-Allow-Origin": "*"` fijo (L9-12) |
| Auth | `FUNCTION_SECRET` **o** `SUPABASE_SERVICE_ROLE_KEY` (L228-246) | Solo `FUNCTION_SECRET` (L42-50) |
| Comparación | `===` (L235, L238) | `!==` (L45) |
| Preferencias | `notification_prefs`, quiet hours, `hideAmountsInNotifications` (L22-62, L292-307) | **No existen**; no consulta `user_settings` |
| Metas | 7/3/1/0 días, vencidas, ritmo, repetición (L311-390) | Solo 7/3/1/0 y vencidas; sin dedupe (L108-135) |
| Fijos | 9 frecuencias, `start_date`/`end_date`, `skipIfAlreadyRecorded` (L392-489) | Solo `monthly` y `weekly`; sin dedupe (L137-181) |
| Push | `tag`, `silent`, `vibrate`, `hideAmounts` (L503-515) | Solo `title`, `body`, `icon`, `badge`, `url` (L195-204) |
| Source map | No aplica | `sourcesContent` con el fuente completo dentro del bundle |

**Consecuencia:** cualquier análisis del repo (incluido `F1`) describe una versión que **no** es la que corre en producción. La versión desplegada es anterior a la columna `user_settings.notification_prefs` (que además no existe en producción, `F2-schema-drift.md`), por lo que el modo “sin preferencias” es coherente con la deriva de esquema, pero confirma que el fix de `NEW-09` nunca se desplegó.

---

## 3. Inventario de secretos (`N1`, redactado)

`npx supabase secrets list --project-ref rjforcrdyfuodsqtopvp` devuelve solo nombres y un digest. Se verificó que el campo `value` es `SHA-256(valor)` comparando `SUPABASE_URL`:

```text
sha256("https://rjforcrdyfuodsqtopvp.supabase.co")
= e5186747b04bde71f7ae522ec5d260044d1c4290873241f1febff8d87767c763
```

El listado mostró `SUPABASE_URL = e5186747b04b…`, por lo que el digest es SHA-256 del valor real.

| Secreto | Presente | Actualizado | Observación |
| :--- | :---: | :--- | :--- |
| `FUNCTION_SECRET` | ✅ | `2026-09-27 02:42:56 UTC` | Digest `e3b0c44298fc…` = **SHA-256 de la cadena vacía**. El secreto está vacío. |
| `VAPID_PUBLIC_KEY` | ❌ | — | **No existe.** El código desplegado lo requiere (L54-57). |
| `VAPID_PRIVATE_KEY` | ✅ | `2026-08-28 04:22:19 UTC` | Presente. |
| `VAPID_SUBJECT` | ❌ | — | Usa el fallback `mailto:soporte@financepal.com`. |
| `ALLOWED_ORIGIN` | ❌ | — | El repo usaría `*`; producción lo fija en duro. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS` | ✅ | `2026-09-27 02:43:11 UTC` | Sin valores en esta evidencia. |

### 3.1 `F6-A` — La función no puede ejecutarse

En el código desplegado:

```ts
const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET"); // ""
const authHeader = req.headers.get("x-function-secret")
  || req.headers.get("authorization")?.replace("Bearer ", "");

if (!FUNCTION_SECRET || authHeader !== FUNCTION_SECRET) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, ... });
}
```

Con `FUNCTION_SECRET = ""`, `!FUNCTION_SECRET` es `true` y **toda** petición recibe `401`, incluso la del scheduler legítimo. Si ese guard se eliminara, un `x-function-secret: ""` coincidiría con el secreto vacío. Además, aun superando el guard, `VAPID_PUBLIC_KEY` no existe y el código lanza `VAPID_PUBLIC_KEY is not set in environment secrets.` → `500`.

No se encontró scheduler:

- `pg_extension` no incluye `pg_cron` (solo `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`).
- `cron.job` no existe.
- `vault.decrypted_secrets` está vacío.
- `grep -rn "send-reminders"` no encuentra workflows, scripts ni llamadas de scheduler en el repo.

**Impacto:** los recordatorios push no se generan. Es un fallo de **disponibilidad/funcionalidad**, no de confidencialidad. Severidad Alta para la función, Baja para el sistema global.

---

## 4. Autenticación y `SEC-003`

### 4.1 Código

Desplegado (L42-50): comparación `authHeader !== FUNCTION_SECRET`, acepta `x-function-secret` o `Authorization: Bearer …`; no usa comparación en tiempo constante; no acepta el service role (a diferencia del repo). `// @ts-nocheck` en L2.

Repo (L228-246): acepta `FUNCTION_SECRET` o `SUPABASE_SERVICE_ROLE_KEY`; también con `===`. El comentario “usado por pg_cron” no se sostiene: `pg_cron` no está instalado.

### 4.2 Pruebas N2 (solo 2 peticiones permitidas + 1 comprobación con JWT público)

| Petición | Resultado | Interpretación |
| :--- | :--- | :--- |
| `POST /functions/v1/send-reminders` sin cabeceras | `401` + `sb-error-code: UNAUTHORIZED_NO_AUTH_HEADER` | El gateway rechaza antes de ejecutar la función (`verify_jwt=true`). |
| `OPTIONS` con `Origin: https://evil.tld` | `200` + `access-control-allow-origin: *` | CORS wildcard (`SEC-017`). |
| `POST` con JWT `anon` público (extraído de `dist/`, sin imprimirlo) | `401` + `{"error":"Unauthorized"}` | El gateway acepta el JWT `anon`; la función ejecuta su propio guard y rechaza. |
| `POST` solo con `apikey` publishable (sin `Authorization`) | `401` + `UNAUTHORIZED_NO_AUTH_HEADER` | El gateway exige `Authorization`; la publishable key sola no basta. |

**Veredicto `SEC-003`: ⚠️ PARCIAL.** La hipótesis original (“cualquier llamante puede dispararla”) **no se confirma**: hay dos capas (`verify_jwt` + secreto). Persisten: comparación no constante, secreto vacío (falla cerrada) y deriva de código. El riesgo real es de disponibilidad (`F6-A`), no de invocación arbitraria.

---

## 5. CORS y `SEC-017`

Respuesta real al preflight:

```http
HTTP/2 200
access-control-allow-origin: *
access-control-allow-headers: authorization, x-client-info, apikey, content-type
vary: Accept-Encoding
```

- `Access-Control-Allow-Origin: *` es fijo en el bundle desplegado (L10).
- No hay `Access-Control-Allow-Credentials`, por lo que no se expone una sesión por cookies; el riesgo es que cualquier origen pueda llamar si posee un bearer token.
- El gateway responde el preflight y **no** incluye `x-function-secret` en `Access-Control-Allow-Headers`; un navegador de otro origen no podría enviar ese header personalizado, pero sí `Authorization`.
- No se envía `Vary: Origin` (rompe cachés si en el futuro se restringe el origen).

**Veredicto `SEC-017`: ❌ CONFIRMADO (Baja).** Recomendación: allowlist exacta, `Vary: Origin` y no confiar en el gateway para CORS.

---

## 6. Rate limit y `SEC-013`

Código desplegado (L14-38) y del repo (L17-25, L211-225):

```ts
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
```

- La clave es la **cadena completa** de `x-forwarded-for`; si el cliente puede enviar o anteponer valores, rota la clave.
- El `Map` vive en la memoria de **cada isolate**; no se comparte entre regiones/instancias ni sobrevive a reinicios.
- Se aplica **antes** de autenticar: un usuario autenticado (o cualquiera que pase `verify_jwt`) puede consumir su propio bucket; no se midió el impacto real para no ejecutar ráfagas (prohibido por el alcance).
- No hay poda de entradas antiguas → crecimiento de memoria no acotado.

**Veredicto `SEC-013`: ❌ CONFIRMADO (estático, Baja).** `T18` no se ejecutó con ráfaga; se evalúa por código.

---

## 7. Privacidad de las notificaciones y `NEW-09`

- Cliente: `DEFAULT_NOTIFICATION_PREFS.hideAmountsInNotifications = false` (`src/lib/finance.ts:674`); `computeGoalNotifications` y `computeFixedItemNotifications` usan `formatCurrency` salvo que el usuario active el toggle (`notifications.ts:632,774`).
- UI: el toggle existe en `NotificacionesSection.tsx:358-359`, pero está **desactivado por defecto**.
- Producción: la versión desplegada **no lee preferencias**. Siempre construye cuerpos como:
  - `Te faltan $${remaining.toLocaleString("es-MX")}.`
  - `${typeLabel} fijo de ${amountStr} programado para hoy.`
- No hay `tag` en el payload desplegado → las notificaciones no se agrupan y pueden acumularse.
- Los montos, nombres de metas/conceptos y fechas quedan visibles en la pantalla de bloqueo, centro de notificaciones y relojes inteligentes.

**Veredicto `NEW-09`: ❌ CONFIRMADO (Media/Baja).** No hay fuga cross-tenant; el riesgo es exposición en el dispositivo y por defecto. Recomendación: `hideAmountsInNotifications=true` por defecto y texto genérico (“Tienes un recordatorio”) salvo opt-in.

---

## 8. Service Worker y `NEW-08`

### 8.1 Código relevante

`public/sw.js`:

- L82-102 `notificationclick`: `const urlToOpen = event.notification.data?.url || "/";` y luego `client.navigate(urlToOpen)` o `clients.openWindow(urlToOpen)`. **No valida mismo origen.**
- L71-80 `message`: acepta `SHOW_LOCAL_NOTIFICATION` y llama `showNotification` **sin** comprobar `event.origin` ni `event.source`.
- L48-69 `push`: el payload lo controla el emisor del push (servidor); el SW confía en `data.title`, `data.body`, `data.url`.
- No hay handler `fetch`: el SW **no cachea** `/rest/v1` ni `/auth/v1` (correcto).
- No hay `pushsubscriptionchange`: si el navegador rota la suscripción, se pierde el push (disponibilidad).

### 8.2 PoC aislado

`.agent/audit/scratch/poc-new08-sw-redirect.mjs` carga el `public/sw.js` real en `node:vm` con APIs simuladas y dispara ambos eventos:

```text
$ node .agent/audit/scratch/poc-new08-sw-redirect.mjs
OPEN_WINDOW_URL=https://evil.tld/phish
CROSS_ORIGIN_MESSAGE_ACCEPTED=true
SHOWN_URL=https://evil.tld/phish
RESULT=OPEN_REDIRECT_CONFIRMED
```

**Veredicto `NEW-08`: ❌ CONFIRMADO (Media).** La explotación requiere controlar el payload de un push (secreto VAPID/servidor) o ejecutar script en el mismo origen; no es un open redirect accesible directamente desde la web. Impacto: phishing/redirección a un dominio externo desde una notificación de confianza y notificaciones falsas vía `postMessage`.

---

## 9. `push_subscriptions` — RLS y `F6-C`

```sql
-- pg_policies (producción)
SELECT  auth.uid() = user_id           -- SELECT
INSERT  WITH CHECK (auth.uid() = user_id)
UPDATE  USING (true) WITH CHECK (auth.uid() = user_id)
DELETE  USING (auth.uid() = user_id)
```

`endpoint` tiene `UNIQUE (endpoint)`; `web-push.ts:51-61` hace `upsert(..., { onConflict: "endpoint" })` con `user_id = session.user.id`.

Si un atacante conoce el `endpoint` de otro usuario (URL capability; no enumerable por la política SELECT), puede hacer `upsert` y la política UPDATE `USING (true)` le permite reasignar la fila a su `user_id`; el `WITH CHECK` impide dejarla a nombre de la víctima, pero la suscripción queda secuestrada (la víctima deja de recibir sus recordatorios y recibe los del atacante). **Severidad Baja**, requiere el endpoint.

**Recomendación:** `UPDATE USING (auth.uid() = user_id)`.

---

## 10. Matriz `T17`–`T19`

| Prueba | Nivel | Estado | Resultado |
| :--- | :--- | :--- | :--- |
| `T17` Edge Function: paridad, 401, CORS | `N1`+`N2` | `❌ FALLA` | Paridad **no** (239 vs 548 líneas; lógica y CORS distintos). `401` sin credenciales ✅ (gateway). CORS `*` ❌. |
| `T18` Rate limit de Edge Function | `N0`+`N3` | `❌ FALLA (estático)` | `Map` por isolate, clave `x-forwarded-for` completa, sin poda, antes de auth; no se ejecutó ráfaga. |
| `T19` Open redirect del Service Worker | `N0` | `❌ FALLA` | PoC `OPEN_REDIRECT_CONFIRMED`; `message` sin `origin`/`source`. |

---

## 11. Veredictos `SEC-*` / `NEW-*`

| ID | Veredicto | Evidencia |
| :--- | :--- | :--- |
| `SEC-003` | ⚠️ **PARCIAL** — auth de dos capas; comparación no constante; secreto vacío (falla cerrada); deriva de código | §3-4 |
| `SEC-013` | ❌ **CONFIRMADO (Bajo)** — rate limit en memoria, por isolate y spoofable | §6 |
| `SEC-017` | ❌ **CONFIRMADO (Bajo)** — `ACAO: *` fijo en producción | §5 |
| `NEW-07` | ⚠️ **PARCIAL** — `esm.sh/@2` resuelto a `2.117.2`; `sourcesContent` embebido | §2 |
| `NEW-08` | ❌ **CONFIRMADO (Media)** — open redirect en `notificationclick`; `message` sin origen | §8 |
| `NEW-09` | ❌ **CONFIRMADO (Media/Baja)** — montos por defecto; producción ignora preferencias | §7 |

---

## 12. Recomendaciones

1. **Rotar `FUNCTION_SECRET`** a un valor aleatorio de ≥32 bytes y compararlo en tiempo constante (p. ej. `crypto.subtle.digest` + comparación XOR, o `timingSafeEqual`). Un secreto vacío es una bomba de tiempo: hoy falla cerrado, pero cualquier refactor que elimine `!FUNCTION_SECRET` lo convierte en bypass.
2. **Configurar `VAPID_PUBLIC_KEY`** (la clave pública está en `src/lib/web-push.ts:4`) o leerla de una constante; validar una invocación autorizada en staging antes de desplegar.
3. **Redesplegar la versión del repo** y añadir `[functions.send-reminders] verify_jwt = true` a `supabase/config.toml`; fijar `esm.sh/@supabase/supabase-js@2.117.2` (o `npm:`) y eliminar `@ts-nocheck`.
4. **CORS:** allowlist exacta del dominio de la app, `Vary: Origin`, y no confiar en el preflight del gateway.
5. **Rate limit:** usar un almacén compartido (Redis/Upstash) o el rate limit del gateway, con clave por usuario autenticado y poda; no usar `x-forwarded-for` crudo.
6. **Privacidad push:** `hideAmountsInNotifications=true` por defecto; cuerpo genérico; respetar `notification_prefs` en el servidor; añadir `tag` para agrupar.
7. **Service Worker:** validar `new URL(urlToOpen, self.location.origin).origin === self.location.origin` antes de navegar/abrir; comprobar `event.origin === self.location.origin` y `event.source` en `message`; añadir `pushsubscriptionchange`.
8. **RLS:** `UPDATE USING (auth.uid() = user_id)` en `push_subscriptions`.
9. **Operación:** documentar el scheduler real (no hay `pg_cron`), monitorizar 401/500 y ausencia de invocaciones; alertar si `sent=0` durante 24 h.
10. **Higiene:** no publicar `sourcesContent` en el bundle desplegado si no es necesario.

---

## 13. Referencias

- `supabase/functions/send-reminders/index.ts:1-548`; bundle desplegado v4 (`/tmp/deployed-send-reminders.ts`, 239 líneas, extraído del source map).
- `public/sw.js:1-103`; `src/lib/web-push.ts:1-124`; `src/lib/notifications.ts:632,774,844-936`; `src/hooks/useNotificationScheduler.ts:1-189`.
- `src/lib/finance.ts:648,674`; `src/pages/ajustes/secciones/NotificacionesSection.tsx:358-359`.
- `F2-catalog-and-rls.md` §5-7 (`push_subscriptions`, Storage); `F2-schema-drift.md` (`notification_prefs` ausente); `F1-supply-chain-and-bundle.md` §NEW-07.
- PoC: `.agent/audit/scratch/poc-new08-sw-redirect.mjs`.
