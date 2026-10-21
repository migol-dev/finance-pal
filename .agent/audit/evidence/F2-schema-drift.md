# 🗄️ Evidencia F2.1 — Desfase de Esquema Producción ↔ Repositorio (`NEW-05`)

> **Fase:** `F2.1` · **Nivel:** `N1` (dump real de producción) · **Fecha:** 2026-10-20
> **Proyecto:** `rjforcrdyfuodsqtopvp` (`financepal`, PostgreSQL 17.6.1)
> **Evidencia cruda:** `.agent/audit/evidence/F2-prod-schema.sql` (24 445 bytes)
> **Higiene:** el dump se verificó con `grep -iE "password|secret|sbp_|eyJ|api_key|token"` → **0 coincidencias**.

---

## 1. Método

```bash
# CLI 2.121.0: la bandera --schema-only ya no existe; el dump es schema-only por defecto
npx supabase db dump -f .agent/audit/evidence/F2-prod-schema.sql --linked
# → "Dumped schema to ..." (contenedor postgres 17.6.1.166)
```

Inventario de producción: **10 tablas**, **3 vistas**, **1 función**, **40 políticas RLS en `public`**, **0 triggers de usuario**, **9 políticas en `storage.objects`**.

---

## 2. Tabla de desfase (repo → producción)

| # | Objeto | Repositorio (`schema.sql` / `schema_push_notifications.sql` / `migrations/`) | Producción (dump 2026-10-20) | Impacto |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `user_settings.notification_prefs` | Definida en `schema_push_notifications.sql` L48-49 (`jsonb`) | ❌ **NO EXISTE** | **Crítico funcional/privacidad:** `settings.service.ts` cae a `BASE_SETTINGS_COLS` (L83-91, L118-124) y **nunca guarda prefs en la nube**; `send-reminders` consulta la columna inexistente y usa `DEFAULT_PREFS` (L292-298) → ignora `enabled`, `quietHours`, `hideAmountsInNotifications`, etc. |
| 2 | `deleted_at` (7 tablas) | `ALTER TABLE … ADD COLUMN deleted_at` L319-325 y políticas con `deleted_at IS NULL` | ❌ **NO EXISTE** en tablas `public` | Las políticas de producción ya no lo referencian (migración `20260929215000`) → sin impacto actual; el repo queda desactualizado y roto si se aplicara tal cual. |
| 3 | `goal_folders` RLS | ❌ No hay `ENABLE ROW LEVEL SECURITY` para `goal_folders` (sólo políticas) | ✅ RLS activo + 4 políticas | El repo no reproduce el estado seguro de producción. |
| 4 | Triggers de validación | `trg_validate_transactions`, `trg_validate_fixed_items` + funciones `validate_*_amount()` (L337-367) | ❌ **0 triggers de usuario** y funciones ausentes | Sin validación `amount > 0` a nivel BD; la integridad depende sólo del cliente. |
| 5 | `user_sessions` unicidad | `UNIQUE (user_id, device_id)` (L150-157) | ❌ **No existe** (sólo PK y FK) | Sesiones duplicadas por dispositivo; rompe la lógica anti-conflicto multi-dispositivo. |
| 6 | Vistas `*_safe` | `WITH SECURITY BARRIER` + `GRANT SELECT`; **sin** `security_invoker`; definen columnas “seguras” y crean políticas sobre vistas (inválido en PostgreSQL) | ✅ `security_invoker='true'` en las 3 vistas; definiciones distintas | Repo no aplicable tal cual. Producción es segura frente a cross-tenant, pero `accounts_safe` **expone `clabe`, `bank`, `holder_name`** y `transactions_safe`/`debt_payments_safe` exponen `external_payee` (no cumplen el propósito “safe”). |
| 7 | `push_subscriptions` política UPDATE | `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` (`schema_push_notifications.sql` L36-40) | ⚠️ `USING (true) WITH CHECK (auth.uid() = user_id)` | `WITH CHECK` evita escribir filas ajenas, pero el `USING(true)` permite evaluar/actualizar filas de otros (defensa en profundidad deficiente). |
| 8 | `cleanup_stale_sessions()` | Cuerpo sin guard (schema.sql L300-315); migración `20260926203200` añade guard `current_user NOT IN ('service_role','authenticated')` | `SECURITY DEFINER`, `search_path=''`, guard presente, `GRANT EXECUTE` a `authenticated` | El guard es **incorrecto** (ver `F2-catalog-and-rls.md` §4): `current_user` dentro de `SECURITY DEFINER` es el owner (`postgres`), por lo que **siempre lanza `Access denied`**. |
| 9 | `goal_folders` columnas | `color text` (nullable), `updated_at` | `color text NOT NULL DEFAULT 'gradient-primary'`, **sin `updated_at`** | Posible fallo de `UPDATE` si el cliente envía `updated_at`; divergencia de defaults. |
| 10 | `user_settings` columnas | `theme`, `profile`, `updated_at`, `notification_prefs` | `accent_color`, `compact_mode`, `glass_effect` (coinciden con `BASE_SETTINGS_COLS`), **sin `notification_prefs`** | El código contempla `accent_color`/`compact_mode`/`glass_effect`; el repo no los declara. |
| 11 | `debt_payments.receipt` | No declarada | ✅ Existe (`text`) además de `receipt_url` | El repo no refleja el esquema real. |
| 12 | `push_subscriptions` en repo | Archivo separado `schema_push_notifications.sql` | ✅ Tabla presente en producción | Sin drift estructural, sólo la política del punto 7. |

---

## 3. Conclusión `NEW-05`

**Estado:** ❌ **CONFIRMADO** — el esquema del repositorio **no reproduce producción**:

1. Hay **12 diferencias** verificables, incluida una **columna faltante que degrada la privacidad de las notificaciones** (`notification_prefs`).
2. El repo contiene DDL que **fallaría** al aplicarse (políticas sobre vistas, políticas con `deleted_at` antes de crear la columna, RLS no habilitado en `goal_folders`).
3. Producción tiene objetos (columnas `accent_color`/`compact_mode`/`glass_effect`, `debt_payments.receipt`) que **sólo existen en la base real**.

**Recomendación:** sustituir `schema.sql` por un dump versionado generado con `supabase db dump`, añadir una migración idempotente para `notification_prefs`, restaurar triggers de validación y la restricción única de `user_sessions`, y alinear las vistas con su propósito “safe”. **Esfuerzo:** `M`.

| Campo | Valor |
| :--- | :--- |
| ID | `NEW-05` |
| Severidad | 🟠 **MEDIA** (con impacto ALTO derivado en `NEW-09`) |
| CVSS v3.1 | `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N` → **5.4** |
| OWASP | A05:2021 Security Misconfiguration / ASVS V1.14 (Build & Deploy) |
| Nivel | `N1` |
| Esfuerzo | `M` |
