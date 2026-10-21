# 🛠️ Registro de Ejecución y Checkpoints: OpenCode CLI & Subagentes

> **Fase:** 2 — Ejecución de Auditoría, Recolección de Evidencias y Checkpoints (`F0`–`F11`)  
> **Agente Ejecutor:** OpenCode CLI (`DeepSeek 4.1 Flash`) + Apoyo de Subagentes `agy` (`Gemini 3.8 Flash / Argon 4`)  
> **Referencia de Entrada:** `.agent/workflow/01_ARCHITECT_PLAN.md` (y `.agent/task.md`)  
> **Espacio de Evidencia:** `.agent/audit/evidence/` y `.agent/audit/scratch/` (CERO cambios en `src/**`, `supabase/**`, `android/**`)  
> **Estado General:** 🟡 EN PROGRESO  

---

## 1. Panel de Control de Progreso (Progress Dashboard)

| Métrica | Valor |
| :--- | :--- |
| **Total de Fases de Auditoría** | `12` (`F0` a `F11`) |
| **Total de Tareas Planificadas** | `39` (`F0.1` a `F11.4`) |
| **Tareas Completadas (✅)** | `6` |
| **Tareas en Progreso (⏳)** | `0` |
| **Tareas Bloqueadas / Escaladas a `agy` (⚠️)** | `0` |
| **Tareas Pendientes (⚪)** | `33` |
| **Progreso Estimado** | `[███░░░░░░░░░░░░░░░░░] 15% (6/39)` |
| **Hallazgos Previos a Re-verificar (`SEC-*`)** | `2 / 21` verificados |
| **Hipótesis Nuevas a Confirmar (`NEW-*`)** | `1 / 12` evaluadas |
| **Matriz de Pruebas (`T01`–`T25`)** | `3 / 25` ejecutadas |
| **Último Checkpoint Git** | `CP-00 (769cf9e)` |
| **Fecha/Hora de Inicio** | `2026-10-20` |
| **Fecha/Hora de Última Actualización** | `2026-10-20` |

---

## 2. Lista Secuencial de Tareas por Fase (`F0`–`F11`)

> **Instrucciones de Marcado (compatibles con `handoff.sh status`):**
> - Usa **únicamente** en las 39 líneas de tarea de esta sección los marcadores:
>   - `Pendiente`: casilla vacía estándar
>   - `En progreso`: reemplaza el marcador de la tarea activa por el icono de reloj de arena entre corchetes (solo 1 a la vez)
>   - `Completada`: reemplaza el marcador por el icono de check verde entre corchetes tras guardar la evidencia
>   - `Bloqueada / Escalada a agy`: reemplaza el marcador por el icono de advertencia entre corchetes y documenta el bloqueo en la **Sección 3 (Escalation Log)**

### 🏁 Fase F0: Preparación, Estructura y Entorno (`CP-00`)
- [✅] **F0.1 [N0]:** Crear la estructura de directorios `.agent/audit/evidence/` y `.agent/audit/scratch/`.
  - **Evidencia:** Directorios verificados + `.agent/audit/evidence/F0-environment.md` (§F0.1).
- [✅] **F0.2 [N0]:** Verificar la disponibilidad de herramientas externas en el sistema (`gitleaks`, `trufflehog`, `semgrep`, `osv-scanner`, `npx supabase`, `docker`, `jq`, `curl`) sin modificar `package.json`.
  - **Evidencia:** Tabla de herramientas en `.agent/audit/README.md` (§3) y `.agent/audit/evidence/F0-environment.md` (§F0.2). Nota: `semgrep` con Python env roto → workaround Docker/fallback.
- [✅] **F0.3 [N0/N1]:** Redactar `.agent/audit/README.md` con el alcance de la auditoría v1.21.0, niveles `N0`–`N3`, disponibilidad del Laboratorio Local (Docker sí/no), estado del acceso CLI al proyecto `rjforcrdyfuodsqtopvp` (sin incluir tokens) e identificación del hosting (`netlify.toml` vs `vercel.json`).
  - **Evidencia esperada:** `.agent/audit/README.md` (`CP-00`: `docs(audit): F0 entorno, alcance y protocolo de producción`).

---

### 🔐 Fase F1: Secretos, Bundle y Cadena de Suministro (`CP-01` — `T01`, `T02`, `T03`)
- [✅] **F1.1 [N0 — T01]:** Ejecutar escaneo de secretos en el historial git (`gitleaks detect --source . --log-opts="--all" --redact -r .agent/audit/evidence/F1-gitleaks.json` y `trufflehog git file://. --only-verified --json > .agent/audit/evidence/F1-trufflehog.json`, o búsqueda redactada en historial git si un binario no está instalado). **Prohibido leer `.env*` directamente.**
  - **Evidencia esperada:** `.agent/audit/evidence/F1-gitleaks.json` y `.agent/audit/evidence/F1-trufflehog.json`.
- [✅] **F1.2 [N0 — T02]:** Ejecutar auditoría de vulnerabilidades en dependencias (`npm audit --json > .agent/audit/evidence/F1-npm-audit.json` y `osv-scanner --lockfile=package-lock.json > .agent/audit/evidence/F1-osv.txt` si está instalado).
  - **Evidencia esperada:** `.agent/audit/evidence/F1-npm-audit.json` y `.agent/audit/evidence/F1-osv.txt`.
- [✅] **F1.3 [N0 — T03, SEC-006, SEC-021]:** Ejecutar `npm run build`, verificar que `dist/` no contenga secretos (`service_role`, `VAPID_PRIVATE`, `FUNCTION_SECRET`, `sk_live`, `BEGIN PRIVATE`), comprobar si se generan `dist/assets/*.map` o `dist/stats.html` (`SEC-021`), y decodificar el payload del JWT `anon` embebido en `dist/assets/*.js` para verificar `role=anon`, `iat` y `exp` (`SEC-006`).
  - **Evidencia esperada:** Sección de bundle y JWT `anon` en `.agent/audit/evidence/F1-supply-chain-and-bundle.md`.
- [✅] **F1.4 [N0 — NEW-07]:** Auditar los imports remotos sin fijar en `supabase/functions/send-reminders/index.ts` (`https://esm.sh/@supabase/supabase-js@2`), el uso de credenciales en `scripts/cleanup-receipts.cjs` y `scripts/cleanup-receipts.js`, y la configuración de plugins en `vite.config.ts` (`lovable-tagger`, `visualizer`, `build.sourcemap`).
  - **Evidencia esperada:** `.agent/audit/evidence/F1-supply-chain-and-bundle.md` (`CP-01`: `docs(audit): F1 secretos y dependencias`).

---

### 🗄️ Fase F2: Base de Datos, RLS, Vistas, RPC y Storage (`CP-02` — Prioridad `P0` — `T04`–`T08`)
- [ ] **F2.1 [N0/N1 — NEW-05]:** Extraer el esquema de producción (`npx supabase db dump --schema-only -f .agent/audit/evidence/F2-prod-schema.sql` o vía introspección SQL en Management API `/v1/projects/rjforcrdyfuodsqtopvp/database/query`, verificando ausencia de secretos) y documentar el diff exacto contra `supabase/schema.sql`, `supabase/schema_push_notifications.sql` y `supabase/migrations/` en `.agent/audit/evidence/F2-schema-drift.md`.
  - **Evidencia esperada:** `.agent/audit/evidence/F2-prod-schema.sql` y `.agent/audit/evidence/F2-schema-drift.md`. *(Si `opencode` no tiene acceso al token CLI, escalar a `agy` con ⚠️).*
- [ ] **F2.2 [N1 — T04, T05, NEW-02, SEC-014]:** Ejecutar consulta `SELECT` de catálogo sobre `pg_class` e `information_schema.views` / `role_table_grants` en producción para confirmar: (a) 0 tablas en `public` sin RLS (`T04`), y (b) si las vistas `accounts_safe`, `transactions_safe` y `debt_payments_safe` tienen `security_invoker=true` en `reloptions` o si se ejecutan como `postgres` saltándose el RLS (`NEW-02` / `SEC-014`).
  - **Evidencia esperada:** Resultados SQL en `.agent/audit/evidence/F2-catalog-and-rls.md`.
- [ ] **F2.3 [N1 — T07, NEW-03, SEC-004]:** Ejecutar consulta `SELECT` sobre `pg_proc` y `has_function_privilege('authenticated', 'public.cleanup_stale_sessions()', 'EXECUTE')` / `anon` en producción, e inspeccionar `prosrc` de `cleanup_stale_sessions()` para confirmar si cualquier usuario `authenticated` puede invocarla y borrar sesiones globalmente (`NEW-03` / `SEC-004`).
  - **Evidencia esperada:** Sección RPC y privilegios en `.agent/audit/evidence/F2-catalog-and-rls.md`.
- [ ] **F2.4 [N1 — SEC-011, SEC-016, NEW-04]:** Consultar `pg_policies` en los esquemas `public` y `storage` para verificar: (a) políticas activas de `user_sessions` y `user_settings` (`SEC-011`, `SEC-016`), (b) políticas de `push_subscriptions` y demás tablas, y (c) si alguna política RLS exige `auth.jwt()->>'aal' = 'aal2'` (`NEW-04`).
  - **Evidencia esperada:** Volcado completo de `pg_policies` en `.agent/audit/evidence/F2-catalog-and-rls.md`.
- [ ] **F2.5 [N1/N2 — T06, T08, SEC-007]:** Consultar `storage.buckets` (`receipts`: `public`, `file_size_limit`, `allowed_mime_types`) y `cron.job` (redactando secretos), probar acceso público no autenticado a `/storage/v1/object/public/receipts/...` (`T08`) y documentar la verificación cross-tenant (`T06`).
  - **Evidencia esperada:** Sección Storage y DAST en `.agent/audit/evidence/F2-catalog-and-rls.md`.
- [ ] **F2.6 [N1]:** Consultar los hallazgos del Supabase Security Advisor (`/v1/projects/rjforcrdyfuodsqtopvp/advisors/security` o diagnóstico equivalente) y documentarlos en `.agent/audit/evidence/F2-advisor.md`.
  - **Evidencia esperada:** `.agent/audit/evidence/F2-advisor.md` (`CP-02`: `docs(audit): F2 RLS, vistas, RPC y storage`).

---

### 🔑 Fase F3: Autenticación, MFA y Sesiones (`CP-03` — Prioridad `P0` — `T09`–`T12`)
- [ ] **F3.1 [N0/N1/N2 — T09, NEW-04]:** Auditar el flujo MFA en `src/context/AuthContext.tsx`, `src/pages/Login.tsx` y `src/pages/ajustes/secciones/SeguridadSection.tsx` junto con la evidencia de `pg_policies` (`F2.4`) para demostrar si la exigencia de TOTP (`aal2`) es puramente de interfaz (UI-only) y un JWT `aal1` permite leer/escribir directamente en PostgREST.
  - **Evidencia esperada:** Análisis y prueba `T09` en `.agent/audit/evidence/F3-auth-mfa-sessions.md`.
- [ ] **F3.2 [N0/N1 — T10, SEC-012]:** Auditar `src/lib/supabase.ts` (`flowType` implícito vs PKCE), `isValidRedirectUri` en `src/pages/Login.tsx` L41-54 (`parsed.hostname === 'localhost'` sin validar puerto ni `pathname === '/auth/callback'`), y `src/pages/AuthCallback.tsx` (manejo de `error_description` y limpieza de URL).
  - **Evidencia esperada:** Sección OAuth/PKCE en `.agent/audit/evidence/F3-auth-mfa-sessions.md`.
- [ ] **F3.3 [N1 — T11, SEC-008]:** Auditar `supabase/config.toml` y la configuración real de Auth en producción (`/v1/projects/rjforcrdyfuodsqtopvp/config/auth`, redactando cualquier `secret` o API key): longitud mínima de contraseña, protección contra contraseñas filtradas (`HIBP`), confirmación de email, `rate_limit_*`, `jwt_exp` y rotación de refresh tokens; contrastar con `src/lib/rate-limiter.ts` (`SEC-008`).
  - **Evidencia esperada:** Tabla comparativa ASVS V2 en `.agent/audit/evidence/F3-auth-mfa-sessions.md`.
- [ ] **F3.4 [N0/N2 — T12, SEC-010]:** Auditar mensajes de error de login/registro/recuperación en `Login.tsx` (enumeración de cuentas), el flujo `requestTakeover` en `src/hooks/useSessionManager.ts` (`SEC-010`), la baja de MFA en `SeguridadSection.tsx`, el alcance de `signOut` y la existencia/ausencia de borrado total de cuenta en servidor y Storage.
  - **Evidencia esperada:** `.agent/audit/evidence/F3-auth-mfa-sessions.md` (`CP-03`: `docs(audit): F3 auth, MFA y sesiones`).

---

### 💾 Fase F4: Datos en Reposo del Cliente y Criptografía (`CP-04` — Prioridad `P0` — `T13`, `T14`)
- [ ] **F4.1 [N0/N2 — T13, SEC-001, SEC-015, SEC-018]:** Auditar `src/store/finance-store.ts` (L290-360), `src/store/slices/settings-slice.ts` y `src/store/sync-store.ts` para verificar si `setItem` ya eliminó la escritura en texto plano (`SEC-001`), si `profile.email` se persiste (`SEC-018`), qué almacenes se limpian en `signOut` (`SEC-015`: `localStorage`, `sessionStorage`, `IndexedDB` `finance-pal-receipts` y `finance-pal-audit`, `Cache Storage`) y si quedan residuos al cambiar de cuenta A→B.
  - **Evidencia esperada:** `.agent/audit/evidence/F4-storage-inventory.md`.
- [ ] **F4.2 [N0/N2 — T14, SEC-002, NEW-01]:** Auditar `src/lib/encrypted-storage.ts` (L43-125): analizar `getEncryptionSecret()` (que usa `session.user.id` o `localStorage.getItem('finance-pal-device-secret')`) y `getSalt()` (`localStorage.getItem('finance-pal-encrypted-v1-salt')`). Escribir y ejecutar en Node WebCrypto el script PoC aislado `.agent/audit/scratch/poc-new01-pbkdf2.mjs` que demuestre que con `user.id` (presente en el JWT de `localStorage`) + el salt público en `localStorage` se deriva la clave AES-GCM y se descifra el estado sin ningún secreto externo.
  - **Evidencia esperada:** `.agent/audit/scratch/poc-new01-pbkdf2.mjs` y resultado de ejecución en `.agent/audit/evidence/F4-crypto-and-auditlog.md`.
- [ ] **F4.3 [N0 — SEC-009]:** Auditar `src/lib/audit-logger.ts` (migración de `djb2` a `SHA-256`, ausencia de clave HMAC frente a manipulación local en IndexedDB) y revisar la cobertura de pruebas negativas en `src/test/encrypted-storage.test.ts` y `src/test/audit-logger.test.ts`.
  - **Evidencia esperada:** `.agent/audit/evidence/F4-crypto-and-auditlog.md` (`CP-04`: `docs(audit): F4 almacenamiento cliente y cifrado`).

---

### 🔄 Fase F5: Servicios, IDOR, Validación y Sincronización (`CP-05` — Prioridad `P1` — `T15`, `T16`)
- [ ] **F5.1 [N0 — T15, SEC-005]:** Ejecutar primero `graphify query "supabase update delete upsert calls in services"` y luego auditar los 9 archivos en `src/services/*.service.ts`, `src/lib/supabase-storage.ts`, `src/lib/web-push.ts` y `src/lib/sync-engine.ts`. Construir la matriz completa de llamadas `.select()`, `.insert()`, `.update()`, `.delete()`, `.upsert()` indicando archivo#línea, si incluye `.eq('user_id', ...)` y el origen del `userId`.
  - **Evidencia esperada:** Matriz IDOR completa en `.agent/audit/evidence/F5-services-idor-validation.md`.
- [ ] **F5.2 [N0 — T16, SEC-020]:** Auditar `importData` en `src/store/finance-store.ts`, `src/lib/migration.ts`, `src/lib/schema-migrations.ts`, `src/lib/validators.ts` y `src/lib/sanitizers.ts`: verificar límite de tamaño antes de `JSON.parse` (`SEC-020`), validación con esquemas Zod por entidad, riesgo de *prototype pollution* en `merge` de Zustand persist y `sanitizeMigratedData`, y opciones `excludePII` en exportación.
  - **Evidencia esperada:** Sección de importación/validación en `.agent/audit/evidence/F5-services-idor-validation.md`.
- [ ] **F5.3 [N0]:** Auditar la sincronización y resolución de conflictos (`src/lib/sync-engine.ts`, `src/services/cloudSync.service.ts`, `src/components/app/DataConflictDialog.tsx`, `src/pages/MigracionNube.tsx`) y verificar con `grep -rln "@/lib/supabase" src/pages src/components` qué vistas o componentes invocan a Supabase directamente sin pasar por la fachada `useFinanceData`.
  - **Evidencia esperada:** `.agent/audit/evidence/F5-services-idor-validation.md` (`CP-05`: `docs(audit): F5 servicios, IDOR y validación`).

---

### ⚡ Fase F6: Edge Function, Web Push y Service Worker (`CP-06` — Prioridad `P1` — `T17`–`T19`)
- [ ] **F6.1 [N0/N1 — T17, SEC-003, SEC-013, SEC-017, NEW-07, NEW-09]:** Auditar `supabase/functions/send-reminders/index.ts`, `supabase/config.toml` y los metadatos de la función en producción (`/v1/projects/rjforcrdyfuodsqtopvp/functions`): revisar `verify_jwt`, validación de `FUNCTION_SECRET`/`SUPABASE_SERVICE_ROLE_KEY`, comparación `===` no constante en tiempo (`SEC-003`), CORS `ALLOWED_ORIGIN || "*"` (`SEC-017`), rate limit en `Map` de memoria evadible vía `x-forwarded-for` (`SEC-013`/`T18`), `@ts-nocheck`, y exposición de montos en notificaciones (`NEW-09`).
  - **Evidencia esperada:** Análisis estático y de configuración en `.agent/audit/evidence/F6-edge-push-sw.md`.
- [ ] **F6.2 [N2 — T17]:** Ejecutar las 2 pruebas no destructivas contra el endpoint de la Edge Function en producción:
  - `curl -sI -X OPTIONS "https://rjforcrdyfuodsqtopvp.supabase.co/functions/v1/send-reminders" -H "Origin: https://evil.tld"`
  - `curl -sI -X POST "https://rjforcrdyfuodsqtopvp.supabase.co/functions/v1/send-reminders"` (sin credenciales → debe responder `401`).
  - **Evidencia esperada:** Respuestas HTTP en `.agent/audit/evidence/F6-edge-push-sw.md`.
- [ ] **F6.3 [N0 — T19, NEW-08]:** Auditar `public/sw.js` (L1-110), `src/lib/web-push.ts`, `src/lib/notifications.ts` y `src/hooks/useNotificationScheduler.ts`: verificar si `notificationclick` abre `event.notification.data.url` sin validar mismo origen (`NEW-08`), si el listener `message` valida `event.origin`/`event.source`, cómo gestiona `push_subscriptions` el `user_id` y si el Service Worker cachea rutas de `/rest/v1` o `/auth/v1`.
  - **Evidencia esperada:** `.agent/audit/evidence/F6-edge-push-sw.md` (`CP-06`: `docs(audit): F6 edge function, push y SW`).

---

### 🌐 Fase F7: Plataforma Web, XSS y Headers HTTP (`CP-07` — Prioridad `P2` — `T20`–`T22`)
- [ ] **F7.1 [N0 — T20]:** Ejecutar escaneo SAST sobre `src/`, `public/` y `supabase/functions/` (`semgrep` si está disponible y/o auditoría exhaustiva de patrones DOM peligrosos: `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `eval(`, `new Function(`, `document.write`, `window.open(`, `target="_blank"`).
  - **Evidencia esperada:** `.agent/audit/evidence/F7-semgrep.json` y listado analizado en `.agent/audit/evidence/F7-web-xss-csp.md`.
- [ ] **F7.2 [N0 — NEW-10]:** Consultar el grafo (`graphify path "ChartStyle" "useFinanceData"` / llamadas a `ChartContainer`) y auditar `src/components/ui/chart.tsx` L70 (`dangerouslySetInnerHTML`) para determinar si las claves/colores de `config` son estáticos o pueden ser controlados por datos del usuario.
  - **Evidencia esperada:** Trazado de flujo de datos de `chart.tsx` en `.agent/audit/evidence/F7-web-xss-csp.md`.
- [ ] **F7.3 [N0 + Pasivo — T21, T22, NEW-11]:** Comparar los headers de seguridad y directivas CSP en `netlify.toml`, `vercel.json` e `index.html` (`img-src https:`, `style-src 'unsafe-inline'`, `connect-src https://api.github.com` en `src/lib/version-check.ts`, ausencia de `upgrade-insecure-requests`, `object-src 'none'`, `COOP`, `CORP`), y capturar 1 petición `HEAD` pasiva si el dominio público está activo en `.agent/audit/evidence/F7-headers-prod.txt`.
  - **Evidencia esperada:** `.agent/audit/evidence/F7-headers-prod.txt` y `.agent/audit/evidence/F7-web-xss-csp.md` (`CP-07`: `docs(audit): F7 web, XSS y headers`).

---

### 🤖 Fase F8: Android / Capacitor — Nivel Código Fuente (`CP-08` — Prioridad `P1` — `T23`)
- [ ] **F8.1 [N0 — T23, NEW-06]:** Auditar `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/xml/config.xml` y `android/app/src/main/res/xml/file_paths.xml`: evaluar `android:allowBackup="true"` sin `dataExtractionRules`/`fullBackupContent` (`NEW-06`), actividades/receivers con `android:exported="true"` e `intent-filter`, alcance de directorios expuestos en `FileProvider` y permisos (`READ/WRITE_EXTERNAL_STORAGE`, `SCHEDULE_EXACT_ALARM`, etc.).
  - **Evidencia esperada:** Sección Manifest y FileProvider en `.agent/audit/evidence/F8-android-masvs.md`.
- [ ] **F8.2 [N0 — T23]:** Auditar `android/app/build.gradle`, `android/app/proguard-rules.pro`, `android/variables.gradle`, `capacitor.config.ts` y `android/app/src/main/java/**`: evaluar `minSdkVersion`/`targetSdkVersion`, `server.cleartext`, `minifyEnabled`, `shrinkResources`, ausencia de keystores en git (`git ls-files | grep -Ei "jks|keystore"`), `webContentsDebuggingEnabled` y completar la matriz **OWASP MASVS v2** (`STORAGE`, `CRYPTO`, `AUTH`, `NETWORK`, `PLATFORM`, `CODE`).
  - **Evidencia esperada:** `.agent/audit/evidence/F8-android-masvs.md` (`CP-08`: `docs(audit): F8 android y capacitor`).

---

### ⚙️ Fase F9: CI/CD e Higiene del Repositorio (`CP-09` — Prioridad `P2` — `T24`)
- [ ] **F9.1 [N0 — T24, NEW-07]:** Auditar `.github/workflows/ci.yml`, `.github/workflows/dependabot-auto-merge.yml`, `.github/workflows/bundle-analysis.yml` y `.github/dependabot.yml`: evaluar `npm audit --audit-level=high || true` (no bloqueante), ausencia de bloque `permissions:` de mínimo privilegio, acciones fijadas por tag mutable vs SHA, alcance del auto-merge de Dependabot y exposición de artefactos en `bundle-analysis.yml`.
  - **Evidencia esperada:** Análisis de workflows en `.agent/audit/evidence/F9-cicd-and-repo-hygiene.md`.
- [ ] **F9.2 [N0 — NEW-12]:** Auditar los archivos versionados en el índice git (`git ls-files | grep -Ei "\.netlify|\.vercel|graphify-out|\.env"`) para evaluar la exposición de `.netlify/state.json` y `graphify-out/` (`NEW-12`), y revisar las reglas de `.gitignore` y `.agentignore` (sin leer archivos `.env*`).
  - **Evidencia esperada:** `.agent/audit/evidence/F9-cicd-and-repo-hygiene.md` (`CP-09`: `docs(audit): F9 ci/cd y repositorio`).

---

### 🕵️ Fase F10: Privacidad, Logging y Manejo de Errores (`CP-10` — Prioridad `P2` — `T25`)
- [ ] **F10.1 [N0 — T25, SEC-019]:** Inventariar todas las sentencias `console.log`, `console.error`, `console.warn`, `console.debug` y `logger.*` en `src/` (excluyendo tests), clasificando las que registran `userId`, `clientId`, `email`, montos financieros o objetos `error` crudos de Supabase/PostgREST, y verificar si `vite.config.ts` elimina `console.*` en el build de producción.
  - **Evidencia esperada:** Tabla de logs y exposición de PII en `.agent/audit/evidence/F10-privacy-logging-gdpr.md`.
- [ ] **F10.2 [N0]:** Auditar `src/lib/app-error.ts`, `src/components/ErrorBoundary.tsx` y `src/lib/web-vitals.ts` (confirmando si envía métricas a terceros) y construir la matriz de privacidad LFPDPPP/GDPR (categorías de datos personales tratados, retención local/nube, portabilidad JSON con `excludePII` y brechas en derecho de supresión/borrado de cuenta).
  - **Evidencia esperada:** `.agent/audit/evidence/F10-privacy-logging-gdpr.md` (`CP-10`: `docs(audit): F10 privacidad y logging`).

---

### 📊 Fase F11: Consolidación CVSS v3.1, `.agent/security_audit.md` v2 y Cierre (`CP-11`)
- [ ] **F11.1 [N0]:** Redactar en `.agent/security_audit.md` la sección **v2 "Re-auditoría Integral 2026-10 — Finance Pal v1.21.0"** (conservando íntegra la auditoría v1 del 2026-09-23 como historial), con el dictamen final, vector **CVSS v3.1**, archivo#línea, nivel (`N0`–`N3`), evidencia enlazada, impacto, recomendación, esfuerzo (`S`/`M`/`L`) y referencia ASVS/MASVS para los **21 hallazgos (`SEC-001`…`SEC-021`)** y las **12 hipótesis (`NEW-01`…`NEW-12`)**.
  - **Evidencia esperada:** Sección v2 de hallazgos en `.agent/security_audit.md`.
- [ ] **F11.2 [N0]:** Incluir en `.agent/security_audit.md` v2 la tabla de ejecución completa de la matriz `T01`–`T25`, la matriz de riesgo residual y el **Backlog de Remediación Priorizado (P0 → P1 → P2 → P3)** listo para el siguiente ciclo de construcción.
  - **Evidencia esperada:** Matriz `T01`–`T25` y Backlog en `.agent/security_audit.md`.
- [ ] **F11.3 [N0]:** Verificar que ningún archivo bajo `.agent/` contenga secretos, JWT o PII (`gitleaks detect --source .agent --redact` y búsqueda de patrones `sbp_`, `eyJ`), y comprobar que ningún archivo de código fuente (`src/**`, `supabase/**`, `android/**`, `public/**`) fue modificado por la auditoría.
  - **Evidencia esperada:** Salida limpia de verificación de secretos y `git diff --stat .agent/`.
- [ ] **F11.4 [N0]:** Ejecutar `graphify update .` para actualizar el grafo de conocimiento y registrar el cierre en `.agent/workflow/02_OPENCODE_TASKS.md` y `.agent/workflow/03_ANTIGRAVITY_REVIEW.md`.
  - **Evidencia esperada:** Grafo actualizado (`CP-11`: `docs(audit): F11 informe consolidado v2`).

---

## 3. ⚠️ Registro de Bloqueos, Fallos y Dificultades (Escalation Log hacia `agy`)

> **Protocolo Mandatorio:** Si OpenCode CLI encuentra una tarea que requiere acceso `N1`/`N2` a producción que no esté disponible en su sesión, o un análisis multicapa complejo, debe marcar la tarea correspondiente en la Sección 2 con el icono de advertencia entre corchetes y registrarla en esta tabla para que **Antigravity (`agy` — Gemini 3.8 Flash / Argon 4)** la resuelva en Fase 3.

| ID Tarea | Archivo / Endpoint | Problema / Bloqueo Detectado | Causa de la Dificultad | Qué debe ejecutar / resolver Antigravity (`agy`) |
| :--- | :--- | :--- | :--- | :--- |
| - | - | *Sin bloqueos reportados aún* | - | - |

---

## 4. Registro Histórico de Checkpoints (`CP-00` a `CP-11`)

| # Checkpoint | Fase | Tareas Cubiertas | Mensaje de Commit Esperado | Hash Commit | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CP-00` | `F0` | `F0.1` – `F0.3` | `docs(audit): F0 entorno, alcance y protocolo de producción` | `769cf9e` | `✅ COMPLETADO` |
| `CP-01` | `F1` | `F1.1` – `F1.4` | `docs(audit): F1 secretos y dependencias` | `pendiente` | `⚪ PENDIENTE` |
| `CP-02` | `F2` | `F2.1` – `F2.6` | `docs(audit): F2 RLS, vistas, RPC y storage` | `pendiente` | `⚪ PENDIENTE` |
| `CP-03` | `F3` | `F3.1` – `F3.4` | `docs(audit): F3 auth, MFA y sesiones` | `pendiente` | `⚪ PENDIENTE` |
| `CP-04` | `F4` | `F4.1` – `F4.3` | `docs(audit): F4 almacenamiento cliente y cifrado` | `pendiente` | `⚪ PENDIENTE` |
| `CP-05` | `F5` | `F5.1` – `F5.3` | `docs(audit): F5 servicios, IDOR y validación` | `pendiente` | `⚪ PENDIENTE` |
| `CP-06` | `F6` | `F6.1` – `F6.3` | `docs(audit): F6 edge function, push y SW` | `pendiente` | `⚪ PENDIENTE` |
| `CP-07` | `F7` | `F7.1` – `F7.3` | `docs(audit): F7 web, XSS y headers` | `pendiente` | `⚪ PENDIENTE` |
| `CP-08` | `F8` | `F8.1` – `F8.2` | `docs(audit): F8 android y capacitor` | `pendiente` | `⚪ PENDIENTE` |
| `CP-09` | `F9` | `F9.1` – `F9.2` | `docs(audit): F9 ci/cd y repositorio` | `pendiente` | `⚪ PENDIENTE` |
| `CP-10` | `F10` | `F10.1` – `F10.2` | `docs(audit): F10 privacidad y logging` | `pendiente` | `⚪ PENDIENTE` |
| `CP-11` | `F11` | `F11.1` – `F11.4` | `docs(audit): F11 informe consolidado v2` | `pendiente` | `⚪ PENDIENTE` |

---

## 5. Checklists Maestras de Seguimiento (`SEC-*`, `NEW-*`, `T01`–`T25`)

### 5.1 Checklist de Hallazgos Previos (`SEC-001`…`SEC-021`)

| ID | Título Corto | Fase | Estado Preliminar | Estado Verificado Final | Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SEC-001` | Zustand en texto plano en `localStorage` | `F4` | ⚠️ Parcial | `⬜ PENDIENTE` | `F4-storage-inventory.md` |
| `SEC-002` | Clave AES-GCM derivada de secreto en `localStorage` | `F4` | 🔁 Regresión probable | `⬜ PENDIENTE` | `F4-crypto-and-auditlog.md` |
| `SEC-003` | Edge Function `send-reminders` sin auth / comparación no constante | `F6` | ⚠️ Parcial | `⬜ PENDIENTE` | `F6-edge-push-sw.md` |
| `SEC-004` | `cleanup_stale_sessions()` `SECURITY DEFINER` | `F2` | ⚠️ / 🔁 | `⬜ PENDIENTE` | `F2-catalog-and-rls.md` |
| `SEC-005` | IDOR en servicios (`.eq('user_id', ...)`) | `F5` | ✅ por verificar | `⬜ PENDIENTE` | `F5-services-idor-validation.md` |
| `SEC-006` | Clave `anon` con expiración año 2100 | `F1` | ❓ por verificar | `⚠️ PARCIAL — role=anon, exp 2036 (10 años)`, no 2100 | `F1-supply-chain-and-bundle.md` |
| `SEC-007` | Recibos en Storage con URL pública vs firmada | `F2` | ✅ por verificar | `⬜ PENDIENTE` | `F2-catalog-and-rls.md` |
| `SEC-008` | Rate limiting de login sólo en cliente | `F3` | ❌ Abierto | `⬜ PENDIENTE` | `F3-auth-mfa-sessions.md` |
| `SEC-009` | Hash-chaining del audit log (`djb2` → `SHA-256` sin HMAC) | `F4` | ✅ por verificar | `⬜ PENDIENTE` | `F4-crypto-and-auditlog.md` |
| `SEC-010` | Takeover de sesión multi-dispositivo sin MFA | `F3` | ❓ por verificar | `⬜ PENDIENTE` | `F3-auth-mfa-sessions.md` |
| `SEC-011` | Columna `deleted_at` inexistente en RLS de `user_sessions` | `F2` | ✅ por verificar | `⬜ PENDIENTE` | `F2-catalog-and-rls.md` |
| `SEC-012` | `isValidRedirectUri` permite cualquier `localhost` | `F3` | ❌ Abierto | `⬜ PENDIENTE` | `F3-auth-mfa-sessions.md` |
| `SEC-013` | Rate limit de Edge Function en memoria de Deno | `F6` | ❌ Abierto | `⬜ PENDIENTE` | `F6-edge-push-sw.md` |
| `SEC-014` | Políticas RLS sobre vistas SQL (`*_safe`) | `F2` | ❌ Escalado (`NEW-02`) | `⬜ PENDIENTE` | `F2-catalog-and-rls.md` |
| `SEC-015` | Datos no borrados de storage al cerrar sesión | `F4` | ✅ por verificar | `⬜ PENDIENTE` | `F4-storage-inventory.md` |
| `SEC-016` | RLS de `user_settings` con `policyprefix` inválido | `F2` | ✅ por verificar | `⬜ PENDIENTE` | `F2-catalog-and-rls.md` |
| `SEC-017` | CORS wildcard `*` en Edge Function | `F6` | ⚠️ Parcial | `⬜ PENDIENTE` | `F6-edge-push-sw.md` |
| `SEC-018` | `profile.email` persistido en estado de Zustand | `F4` | ❓ por verificar | `⬜ PENDIENTE` | `F4-storage-inventory.md` |
| `SEC-019` | `userId` / `clientId` en logs de consola | `F10` | ❓ por verificar | `⬜ PENDIENTE` | `F10-privacy-logging-gdpr.md` |
| `SEC-020` | Importación JSON sin límite de tamaño previo al parseo | `F5` | ❓ por verificar | `⬜ PENDIENTE` | `F5-services-idor-validation.md` |
| `SEC-021` | `dist/stats.html` del bundle analyzer accesible | `F1`/`F9` | ❓ por verificar | `❌ CONFIRMADO (build)` — stats.html 1.26 MB en `dist/` | `F1-supply-chain-and-bundle.md` |

### 5.2 Checklist de Nuevas Hipótesis de Riesgo (`NEW-01`…`NEW-12`)

| ID | Hipótesis | Fase | Nivel | Veredicto Final | Evidencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NEW-01` | Clave AES-GCM derivada de `user.id` (UUID público en JWT) + salt en `localStorage` | `F4` | `N0`/`N2` | `⬜ PENDIENTE` | `F4-crypto-and-auditlog.md` |
| `NEW-02` | Vistas `accounts_safe`, `transactions_safe`, `debt_payments_safe` sin `security_invoker=true` | `F2` | `N1`/`N2` | `⬜ PENDIENTE` | `F2-catalog-and-rls.md` |
| `NEW-03` | `cleanup_stale_sessions()` ejecutable por cualquier rol `authenticated` | `F2` | `N1` | `⬜ PENDIENTE` | `F2-catalog-and-rls.md` |
| `NEW-04` | MFA aplicado sólo en UI; políticas RLS no exigen `aal2` | `F2`/`F3` | `N1`/`N2` | `⬜ PENDIENTE` | `F3-auth-mfa-sessions.md` |
| `NEW-05` | Desfase entre `supabase/schema.sql` + `migrations/` y el esquema real en producción | `F2` | `N1` | `⬜ PENDIENTE` | `F2-schema-drift.md` |
| `NEW-06` | Android `android:allowBackup="true"` sin `dataExtractionRules` | `F8` | `N0` | `⬜ PENDIENTE` | `F8-android-masvs.md` |
| `NEW-07` | Supply chain: `esm.sh` flotante en Deno, `npm audit \|\| true` en CI y auto-merge | `F1`/`F9` | `N0` | `⚠️ CONFIRMADO PARCIAL (F1)` — esm.sh `@2` flotante; CI pendiente F9 | `F1` y `F9` |
| `NEW-08` | Service Worker `public/sw.js`: open redirect en `notificationclick` y `message` sin validar origen | `F6` | `N0` | `⬜ PENDIENTE` | `F6-edge-push-sw.md` |
| `NEW-09` | Notificaciones muestran montos financieros por defecto (`hideAmountsInNotifications=false`) | `F6` | `N0` | `⬜ PENDIENTE` | `F6-edge-push-sw.md` |
| `NEW-10` | `dangerouslySetInnerHTML` en `src/components/ui/chart.tsx` L70 | `F7` | `N0` | `⬜ PENDIENTE` | `F7-web-xss-csp.md` |
| `NEW-11` | Debilidades en CSP y desalineación de headers entre `netlify.toml`, `vercel.json` e `index.html` | `F7` | `N0`/Pasivo | `⬜ PENDIENTE` | `F7-web-xss-csp.md` |
| `NEW-12` | Metadatos versionados en git (`.netlify/state.json`, `graphify-out/`) | `F9` | `N0` | `⬜ PENDIENTE` | `F9-cicd-and-repo-hygiene.md` |

### 5.3 Checklist de Matriz de Pruebas (`T01`–`T25`)

| Prueba | Fase | Nivel | Estado | Resultado Resumido |
| :--- | :--- | :--- | :--- | :--- |
| `T01` Secretos en historial git | `F1` | `N0` | `❌ ABIERTO` | 3 hallazgos gitleaks (1 JWT redactado en `.env` histórico); 0 verificados trufflehog |
| `T02` CVE en dependencias | `F1` | `N0` | `❌ ABIERTO` | 52 npm (3C/31H); 10 runtime (7H); 81 OSV (3C/30H) |
| `T03` Secretos / source maps en `dist/` | `F1` | `N0` | `❌ ABIERTO` | Sin secretos ni `.map`; `stats.html` presente en build |
| `T04` Tablas sin RLS | `F2` | `N1` | `⬜ PENDIENTE` | - |
| `T05` Vistas sin `security_invoker` | `F2` | `N1`+`N2` | `⬜ PENDIENTE` | - |
| `T06` CRUD cross-tenant A→B | `F2` | `N1`+`N2` | `⬜ PENDIENTE` | - |
| `T07` `EXECUTE` de RPC `SECURITY DEFINER` | `F2` | `N1` | `⬜ PENDIENTE` | - |
| `T08` Storage cross-user / público | `F2` | `N1`+`N2` | `⬜ PENDIENTE` | - |
| `T09` REST con token `aal1` en cuenta con MFA | `F3` | `N1`+`N2` | `⬜ PENDIENTE` | - |
| `T10` Redirect OAuth arbitrario | `F3` | `N0`+`N1` | `⬜ PENDIENTE` | - |
| `T11` Configuración de Auth | `F3` | `N1` | `⬜ PENDIENTE` | - |
| `T12` Takeover sin re-autenticación | `F3` | `N0`+`N2` | `⬜ PENDIENTE` | - |
| `T13` Inventario de storage pre/post logout | `F4` | `N0`+`N2` | `⬜ PENDIENTE` | - |
| `T14` PoC de descifrado `NEW-01` | `F4` | `N0`+`N2` | `⬜ PENDIENTE` | - |
| `T15` Update/delete sin `user_id` | `F5` | `N0` | `⬜ PENDIENTE` | - |
| `T16` Import JSON malicioso | `F5` | `N0` | `⬜ PENDIENTE` | - |
| `T17` Edge Function: paridad, 401, CORS | `F6` | `N1`+`N2` | `⬜ PENDIENTE` | - |
| `T18` Rate limit de Edge Function | `F6` | `N0`+`N3` | `⬜ PENDIENTE` | - |
| `T19` Open redirect del Service Worker | `F6` | `N0` | `⬜ PENDIENTE` | - |
| `T20` SAST React/TS | `F7` | `N0` | `⬜ PENDIENTE` | - |
| `T21` Headers de producción y CSP | `F7` | `N0`+Pasivo | `⬜ PENDIENTE` | - |
| `T22` ZAP baseline local | `F7` | Local | `⬜ PENDIENTE` | - |
| `T23` Android Manifest/backup/exported/FileProvider | `F8` | `N0` | `⬜ PENDIENTE` | - |
| `T24` Endurecimiento de CI/CD | `F9` | `N0` | `⬜ PENDIENTE` | - |
| `T25` PII en logs de consola | `F10` | `N0` | `⬜ PENDIENTE` | - |

---

## 6. Resumen de Entrega para Antigravity Reviewer (`03_ANTIGRAVITY_REVIEW.md`)

- **Estado de Ejecución de Fases (`F0`–`F11`):** `[PENDIENTE]`
- **Archivos de Evidencia Generados en `.agent/audit/evidence/`:** `[PENDIENTE]`
- **Verificación de CERO Cambios en Código Fuente (`src/**`, `supabase/**`, `android/**`):** `[PENDIENTE]`
- **Mensaje de Traspaso a Antigravity (`agy`):** Plan listo y tareas pre-cargadas para iniciar ejecución de Fase 2.
