# 🗄️ Evidencia F2.2–F2.5 — Catálogo, RLS, Vistas, RPC y Storage (Producción)

> **Fases:** `F2.2`, `F2.3`, `F2.4`, `F2.5` · **Nivel:** `N1` (catálogo solo lectura) + `N2` (lecturas anónimas no destructivas)
> **Fecha:** 2026-10-20 · **Proyecto:** `rjforcrdyfuodsqtopvp` (`financepal`, PostgreSQL 17.6.1)
> **Método:** Management API `POST /v1/projects/rjforcrdyfuodsqtopvp/database/query` (token en `~/.supabase/access-token`, nunca impreso) + `npx supabase db dump`.
> **Higiene:** sin tokens, sin JWT, sin PII. Los `command` de `cron` se seleccionaron con redacción prevista (no aplica: `cron.job` no existe).

---

## 1. Tablas y RLS (`T04`)

```sql
select c.relname, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relkind='r' order by 1;
```

| Tabla | RLS | FORCE RLS | Owner |
| :--- | :---: | :---: | :--- |
| `accounts` | ✅ | ❌ | `postgres` |
| `debt_payments` | ✅ | ❌ | `postgres` |
| `debts` | ✅ | ❌ | `postgres` |
| `fixed_items` | ✅ | ❌ | `postgres` |
| `goal_folders` | ✅ | ❌ | `postgres` |
| `goals` | ✅ | ❌ | `postgres` |
| `push_subscriptions` | ✅ | ❌ | `postgres` |
| `transactions` | ✅ | ❌ | `postgres` |
| `user_sessions` | ✅ | ❌ | `postgres` |
| `user_settings` | ✅ | ❌ | `postgres` |

**Agregado:** `sin_rls = 0`, `force_rls = 0`, `total = 10`.

**Veredicto `T04`:** ✅ **PASA** — 0 tablas en `public` sin RLS.

> Nota de defensa en profundidad: `information_schema.role_table_grants` muestra `GRANT ALL` (incluye `TRUNCATE`, `TRIGGER`, `REFERENCES`) a `anon` y `authenticated` en **todas** las tablas y vistas. No es explotable vía PostgREST (no expone `TRUNCATE`), pero viola mínimo privilegio. Todos los `INSERT/UPDATE/DELETE` quedan sujetos a RLS.

---

## 2. Vistas `*_safe` (`T05`, `NEW-02`, `SEC-014`)

```sql
select c.relname, c.reloptions
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('v','m');
```

| Vista | `reloptions` | `security_invoker` |
| :--- | :--- | :---: |
| `accounts_safe` | `{security_invoker=true}` | ✅ `true` |
| `transactions_safe` | `{security_invoker=true}` | ✅ `true` |
| `debt_payments_safe` | `{security_invoker=true}` | ✅ `true` |

- Definiciones reales (`pg_get_viewdef`): las 3 vistas leen las tablas base; `debt_payments_safe` además hace `JOIN debts` y filtra `d.user_id = auth.uid()`.
- **`security_invoker=true`** hace que las vistas evalúen el RLS **como el usuario que consulta**, no como `postgres`.
- Prueba anónima `N2` (clave `anon` pública, tomada del bundle y nunca impresa):

| Petición | Resultado |
| :--- | :--- |
| `GET /rest/v1/accounts_safe?select=id,user_id&limit=1` | `HTTP 200` → `[]` |
| `GET /rest/v1/transactions_safe?select=id&limit=1` | `HTTP 200` → `[]` |
| `GET /rest/v1/accounts?select=id&limit=1` | `HTTP 200` → `[]` |

**Veredicto `T05`:** ✅ **PASA** en aislamiento (invoker + RLS + 0 filas para `anon`).
**`NEW-02`:** ✅ **DESCARTADO (SEGURO)** — la hipótesis “vistas sin `security_invoker`” **no se confirma** en producción.
**`SEC-014`:** ✅ **CERRADO**.

> ⚠️ Observación de diseño (no cross-tenant): `accounts_safe` **sí** expone `clabe`, `bank` y `holder_name`, y `transactions_safe`/`debt_payments_safe` exponen `external_payee`, pese a su nombre “safe”. Cada usuario sólo ve sus propias filas, pero el objetivo de ocultar columnas sensibles no se cumple. Se registra como desviación de diseño (`BAJO`).

---

## 3. Función `cleanup_stale_sessions()` (`T07`, `SEC-004`, `NEW-03`)

```sql
select p.proname, p.prosecdef, p.proconfig, pg_get_userbyid(p.proowner), p.proacl,
       has_function_privilege('authenticated','public.cleanup_stale_sessions()','EXECUTE') as auth_exec,
       has_function_privilege('anon','public.cleanup_stale_sessions()','EXECUTE') as anon_exec,
       has_function_privilege('service_role','public.cleanup_stale_sessions()','EXECUTE') as svc_exec
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public';
```

| Campo | Resultado |
| :--- | :--- |
| `prosecdef` | ✅ `true` (`SECURITY DEFINER`) |
| `proconfig` | ✅ `{search_path=""}` |
| Owner | `postgres` |
| `proacl` | `{postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}` → `PUBLIC` revocado |
| `authenticated` EXECUTE | ❌ **`true`** (privilegio concedido) |
| `anon` EXECUTE | ✅ `false` |
| `service_role` EXECUTE | ✅ `true` |

Cuerpo real (`prosrc`, dump L48-65):

```sql
IF current_user NOT IN ('service_role', 'authenticated') THEN
  RAISE EXCEPTION 'Access denied';
END IF;
DELETE FROM user_sessions
WHERE last_seen_at < NOW() - INTERVAL '2 minutes'
  AND created_at < NOW() - INTERVAL '2 minutes';
```

**Análisis clave:** dentro de una función `SECURITY DEFINER`, `current_user` es el **owner** (`postgres`), no el rol llamante (`session_user`). Por tanto la condición `'postgres' NOT IN ('service_role','authenticated')` es **siempre verdadera** y la función **siempre lanza `Access denied`**. Esto la neutraliza accidentalmente como vector de DoS global, pero:
1. El privilegio `EXECUTE` a `authenticated` sigue concedido (`T07` falla en mínimo privilegio).
2. La limpieza de sesiones **nunca funciona** (defecto funcional).
3. Si alguien “corrige” el guard usando `current_user`/elimina el bloque, el DoS global queda activo de inmediato.

**Veredicto `T07`:** ❌ **FALLA (privilegio)** — `authenticated` puede invocar la RPC; explotación global **no confirmada** por el guard defectuoso. **`NEW-03`:** ⚠️ **CONFIRMADO (privilegio), mitigado accidentalmente**. **`SEC-004`:** ⚠️ **PARCIAL**.

---

## 4. Políticas RLS (`F2.4`, `SEC-011`, `SEC-016`, `NEW-04`)

- Total: **49** (`40` en `public`, `9` en `storage.objects`).
- **0** políticas exigen `aal2` (búsqueda `qual/with_check ~ 'aal'` → 0) → `NEW-04` **confirmado** (el MFA no se exige en RLS; se prueba en `F3`).
- `user_sessions`: 4 políticas correctas (`auth.uid() = user_id`, sin `deleted_at`) → **`SEC-011` CERRADO**.
- `user_settings`: 4 políticas correctas → **`SEC-016` CERRADO**.
- `push_subscriptions`: `SELECT/INSERT/DELETE` correctas; **`UPDATE USING (true) WITH CHECK (auth.uid() = user_id)`** → el `WITH CHECK` impide mover filas a otro usuario, pero `USING(true)` permite evaluar filas ajenas. **Hallazgo BAJO** (`SEC-005` relacionado, se cierra en `F5`).
- `goal_folders`: 4 políticas correctas (RLS activo en producción).
- **No hay políticas para `anon`** en ninguna tabla → todas las lecturas anónimas devuelven `[]` (verificado).

> El volcado completo de `pg_policies` está en el **Anexo A**.

---

## 5. Storage y Cron (`T08`, `SEC-007`, `F2.5`)

### Bucket `receipts`

```sql
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets;
```

| Bucket | `public` | `file_size_limit` | `allowed_mime_types` |
| :--- | :---: | :---: | :--- |
| `receipts` | ✅ **`false` (privado)** | ❌ `null` (sin límite) | ❌ `null` (cualquier MIME) |

### Políticas de `storage.objects` (9)

| Política | CMD | USING | WITH CHECK |
| :--- | :---: | :--- | :--- |
| `Users can view own receipts` | SELECT | `bucket_id='receipts' AND auth.uid() = foldername(name)[1]::uuid` | — |
| `Users can view their own receipts` | SELECT | `bucket_id='receipts' AND auth.uid()::text = foldername(name)[1]` | — |
| `Users can insert their own receipts` | INSERT | — | `bucket_id='receipts' AND auth.uid()::text = foldername(name)[1]` |
| `Users can upload own receipts` | INSERT | — | `bucket_id='receipts' AND auth.uid() = foldername(name)[1]::uuid` |
| `Users can update their own receipts` | UPDATE | `bucket_id='receipts' AND auth.uid()::text = foldername(name)[1]` | — |
| `Users can delete own receipts` | DELETE | `bucket_id='receipts' AND auth.uid() = foldername(name)[1]::uuid` | — |
| `Users can delete their own receipts` | DELETE | `bucket_id='receipts' AND auth.uid()::text = foldername(name)[1]` | — |
| `Usuarios pueden subir sus comprobantes` | INSERT | — | `bucket_id='receipts' AND auth.uid() = owner` |
| `Usuarios pueden ver sus comprobantes` | SELECT | `bucket_id='receipts' AND auth.uid() = owner` | — |

> Hay **políticas duplicadas** (3 generaciones distintas) que complican la auditoría y el mantenimiento; el efecto neto es restrictivo por carpeta `{user_id}/…`.

### Pruebas anónimas `N2` (no destructivas)

| Petición | Resultado |
| :--- | :--- |
| `GET /storage/v1/object/public/receipts/audit-nonexistent/probe.txt` | `HTTP 400` → `{"statusCode":"404","error":"Bucket not found",...}` |
| `GET /storage/v1/object/receipts/audit-nonexistent/probe.txt` (sin token) | `HTTP 400` → `{"statusCode":"404","error":"Bucket not found",...}` |

**Veredicto `T08`:** ✅ **PASA** en acceso (bucket privado; sin URL firmada no hay lectura). ⚠️ **Parcial en hardening**: sin `file_size_limit` ni `allowed_mime_types` (riesgo de abuso de almacenamiento y de contenido activo servido vía signed URL). **`SEC-007`:** ⚠️ **PARCIAL** (privacidad OK; faltan cuotas/MIME).

### `cron.job`

```sql
select ... from cron.job;
-- ERROR: 42P01: relation "cron.job" does not exist
```

`pg_cron` **no está instalado** → no hay jobs programados; la Edge Function debe invocarse externamente (consistente con `schema_push_notifications.sql`, donde el `cron.schedule` está comentado). Sin secretos que redactar.

---

## 6. Matriz de pruebas F2

| Prueba | Nivel | Resultado | Estado |
| :--- | :---: | :--- | :---: |
| `T04` Tablas sin RLS | `N1` | 0 / 10 sin RLS | ✅ PASA |
| `T05` Vistas sin `security_invoker` | `N1`+`N2` | 3 / 3 con `security_invoker=true`; anon → `[]` | ✅ PASA |
| `T06` CRUD cross-tenant A→B | `N1`+`N2` | No ejecutada: **sin cuentas `audit-a`/`audit-b`**; catálogo muestra aislamiento por `auth.uid()` | ⚠️ ESCALADA |
| `T07` `EXECUTE` de RPC `SECURITY DEFINER` | `N1` | `authenticated=true`; guard siempre lanza (bug) | ❌ FALLA (privilegio) |
| `T08` Storage cross-user / público | `N1`+`N2` | Bucket privado; anon → 400; sin cuota/MIME | ✅ PASA (parcial) |

---

## Anexo A — Volcado completo de `pg_policies` (public + storage)

| Esquema | Tabla | Política | CMD | Roles | USING | WITH CHECK |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| `public` | `accounts` | Users can delete their own accounts | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `accounts` | Users can insert their own accounts | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `accounts` | Users can update their own accounts | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `accounts` | Users can view their own accounts | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `debt_payments` | Users can delete their own debt payments | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `debt_payments` | Users can insert their own debt payments | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `debt_payments` | Users can update their own debt payments | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `debt_payments` | Users can view their own debt payments | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `debts` | Users can delete their own debts | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `debts` | Users can insert their own debts | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `debts` | Users can update their own debts | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `debts` | Users can view their own debts | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `fixed_items` | Users can delete their own fixed items | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `fixed_items` | Users can insert their own fixed items | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `fixed_items` | Users can update their own fixed items | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `fixed_items` | Users can view their own fixed items | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `goal_folders` | Users can delete own goal_folders | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `goal_folders` | Users can insert own goal_folders | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `goal_folders` | Users can update own goal_folders | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `goal_folders` | Users can view own goal_folders | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `goals` | Users can delete their own goals | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `goals` | Users can insert their own goals | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `goals` | Users can update their own goals | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `goals` | Users can view their own goals | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `push_subscriptions` | Users can delete own push subscriptions | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `push_subscriptions` | Users can insert own push subscriptions | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `push_subscriptions` | Users can update own push subscriptions | UPDATE | `{public}` | `true` | `(auth.uid() = user_id)` |
| `public` | `push_subscriptions` | Users can view own push subscriptions | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `transactions` | Users can delete their own transactions | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `transactions` | Users can insert their own transactions | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `transactions` | Users can update their own transactions | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `transactions` | Users can view their own transactions | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `user_sessions` | Users can delete their own sessions | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `user_sessions` | Users can insert their own sessions | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `user_sessions` | Users can update their own sessions | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `user_sessions` | Users can view their own sessions | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `user_settings` | Users can delete their own settings | DELETE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `user_settings` | Users can insert their own settings | INSERT | `{public}` | `—` | `(auth.uid() = user_id)` |
| `public` | `user_settings` | Users can update their own settings | UPDATE | `{public}` | `(auth.uid() = user_id)` | `—` |
| `public` | `user_settings` | Users can view their own settings | SELECT | `{public}` | `(auth.uid() = user_id)` | `—` |
| `storage` | `objects` | Users can delete own receipts | DELETE | `{public}` | `((bucket_id = 'receipts'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid))` | `—` |
| `storage` | `objects` | Users can delete their own receipts | DELETE | `{public}` | `((bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `—` |
| `storage` | `objects` | Users can insert their own receipts | INSERT | `{public}` | `—` | `((bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` |
| `storage` | `objects` | Users can update their own receipts | UPDATE | `{public}` | `((bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `—` |
| `storage` | `objects` | Users can upload own receipts | INSERT | `{public}` | `—` | `((bucket_id = 'receipts'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid))` |
| `storage` | `objects` | Users can view own receipts | SELECT | `{public}` | `((bucket_id = 'receipts'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid))` | `—` |
| `storage` | `objects` | Users can view their own receipts | SELECT | `{public}` | `((bucket_id = 'receipts'::text) AND ((auth.uid())::text = (storage.foldername(name))[1]))` | `—` |
| `storage` | `objects` | Usuarios pueden subir sus comprobantes | INSERT | `{authenticated}` | `—` | `((bucket_id = 'receipts'::text) AND (auth.uid() = owner))` |
| `storage` | `objects` | Usuarios pueden ver sus comprobantes | SELECT | `{authenticated}` | `((bucket_id = 'receipts'::text) AND (auth.uid() = owner))` | `—` |

---

## Hallazgos F2

| ID | Título | Estado | Severidad | CVSS v3.1 | Ubicación |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `NEW-02` / `SEC-014` | Vistas `*_safe` sin `security_invoker` | ✅ **DESCARTADO** | — | — | `pg_class.reloptions` |
| `NEW-03` / `SEC-004` | `cleanup_stale_sessions()` ejecutable por `authenticated` (guard roto) | ⚠️ **CONFIRMADO (privilegio)** | 🟠 MEDIA | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` → **4.3** | `pg_proc.proacl` (dump L890-892) |
| `SEC-011` | RLS `user_sessions` con `deleted_at` inexistente | ✅ **CERRADO** | — | — | `pg_policies` |
| `SEC-016` | RLS `user_settings` con prefijo inválido | ✅ **CERRADO** | — | — | `pg_policies` |
| `SEC-007` | Bucket `receipts`: privado pero sin límites | ⚠️ **PARCIAL** | 🟡 BAJA | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` → **4.3** | `storage.buckets` |
| `NEW-04` | RLS no exige `aal2` | ⚠️ **CONFIRMADO (catálogo)** | 🟠 ALTA (se evalúa en F3) | — | `pg_policies` (0 con `aal`) |
| — | `push_subscriptions` UPDATE con `USING(true)` | ⚠️ **ABIERTO (bajo)** | 🟡 BAJA | `CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:L/A:N` → **4.2** | `pg_policies` |
| — | Vistas “safe” exponen columnas sensibles (`clabe`, `bank`, `holder_name`, `external_payee`) | ⚠️ **DRIFT** | 🟡 BAJA | — | `pg_get_viewdef` / dump L94-167, 275-293 |
| — | `GRANT ALL` a `anon`/`authenticated` (incluye `TRUNCATE`, `TRIGGER`, `REFERENCES`) | ⚠️ **ABIERTO (bajo)** | 🟡 BAJA | — | `information_schema.role_table_grants` |

> `T06` queda **escalada a `agy`** por ausencia de cuentas `audit-a`/`audit-b` (ver Escalation Log). La evidencia `N1` (RLS + vistas invoker + 0 políticas anon) es consistente con aislamiento correcto, pero no sustituye la prueba dinámica A→B.
