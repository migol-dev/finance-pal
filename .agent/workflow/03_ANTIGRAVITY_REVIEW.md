# Registro de Revisión, Escalaciones y Sign-Off — Antigravity (`03_ANTIGRAVITY_REVIEW.md`)

> **Fase:** 3 — Revisión Dinámica, Validación PostgreSQL 17 y Sign-Off (`R-P0-F0` a `R-P0-F5`)  
> **Revisor Principal:** Antigravity CLI (`Gemini 3.8 Flash` / `Argon 4`)  
> **Estado General:** 🟢 APROBADO PARA MERGE — SPRINT P0 CERTIFICADO

## Metadatos de Revisión

| Campo | Valor |
| :--- | :--- |
| **Revisor Principal (Fase 3)** | Antigravity (`agy` — Gemini 3.8 Flash / Argon 4) |
| **Constructor / Implementador (Fase 2)** | OpenCode CLI (`opencode` — DeepSeek 4.1 Flash) |
| **Sprint Activo** | `v1.21.1-p0-remediation` (Remediación de los 6 Bloqueantes P0) |
| **Sprint Previo Archivado** | `v1.21.0-security-audit` (Certificado en commit `3a0da24`) |
| **Estado de Revisión** | 🟢 **FASE 3 COMPLETADA Y CERTIFICADA (`1f2eac2`)** |

---

## 1. Resumen de Entrega de OpenCode CLI (Fase 2: `CP-P0-00` a `CP-P0-05`)

### 1.1 Checkpoints Completados

| Checkpoint | Fase | Commit Hash | Estado | Resumen de Cambios |
| :--- | :--- | :--- | :--- | :--- |
| `CP-P0-00` | P0-F0: Fix `F5-B` (`TS2554`) + Polyfill IndexedDB Vitest | `1cda516` | `[✅]` | `useReceiptMutations` pasa `userId`; polyfill IndexedDB + fallback Storage en Vitest (9/9 tests). |
| `CP-P0-01` | P0-F1: Migración SQL `NEW-04` (`aal2`), `F2-A` y `SEC-004` | `43c735f` | `[✅]` | `is_mfa_compliant()` + 10 políticas restrictivas + storage; push UPDATE tenant-scoped; `cleanup_stale_sessions()` service_role. Validado en PG17 efímero. |
| `CP-P0-02` | P0-F2: OAuth PKCE, remoción de `setSession` y `AndroidManifest.xml` (`F8-A`, `SEC-012`) | `b54e4a2` + `1f2eac2` | `[✅]` | `flowType:'pkce'`; deep link solo canjea `code` (con normalización `url.split(/[?#]/)[0]`); redirect allowlist estricta; `allowBackup=false` + reglas XML; permisos de almacenamiento eliminados. |
| `CP-P0-03` | P0-F3: Pepper en IndexedDB (`SEC-002`) y migración PBKDF2 (`F4-F`) | `3e0b1fc` | `[✅]` | Pepper 256-bit en `finance-pal-keystore`; salt per-user; fallback legacy sin sobrescribir salt; 9/9 tests. |
| `CP-P0-04` | P0-F4: Purga total en Logout (`SEC-015`, `F4-D`) y máscara PII (`F10-B`) | `acf7d29` | `[✅]` | Purga de blobs/recibos/salts/peppers en `signOut`; `clearAuditLogs`; emails enmascarados y tokens redactados; 18/18 tests. |
| `CP-P0-05` | P0-F5: Contraseñas 12+ chars y `rateLimiter` (`SEC-008`) + `graphify update .` | `4db5131` | `[✅]` | Validador 12+ y rate limit `auth` 5/60s en Login/Perfil; `supabase/config.toml` endurecido; 9 tests nuevos; 27/27 suites; 0 leaks; grafo actualizado. |

### 1.2 Resultados de Verificación de OpenCode CLI y Antigravity

- **`npx tsc --noEmit`**: ✅ `0 errores`.
- **`npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts src/test/security.test.ts`**: ✅ `27/27` tests (`PASS`).
- **`npm run build`**: ✅ compilación de producción limpia.
- **Docker PostgreSQL 17 (`.agent/audit/scratch/poc-p0-f1-post-remediation.sql`)**: ✅ `17/17` pruebas dinámicas `PASS` (verificando `NEW-04`, `F2-A`, `SEC-004`, `T12` y no-regresión en usuarios sin MFA).
- **`gitleaks dir .agent src supabase android --redact`**: ✅ `0 leaks`.
- **`graphify update .`**: ✅ `2325 nodes, 5948 edges, 166 communities`.

---

## 2. Escalaciones y Ajustes de Fase 3 (`agy`)

- **`ADJ-P0-01` (`src/App.tsx:367`, commit `1f2eac2`)**: Durante la revisión de Fase 3 (`R-P0-F2`), Antigravity detectó que `isAllowedAuthCallbackUrl(url)` comparaba la URL completa con `NATIVE_AUTH_CALLBACK_URLS.has(url)`, lo cual rechazaría callbacks nativos con query string (`app.financepal.com://auth/callback?code=...`). Se corrigió extrayendo `const baseUrl = url.split(/[?#]/)[0]` antes de consultar `NATIVE_AUTH_CALLBACK_URLS`.

---

## 3. Revisión y Verificación Dinámica de Fase 3 (`agy` — Completada)

- [x] **R-P0-F0 (`F5-B` y Harness Vitest)** — `🟢 APROBADO`:
  - `src/hooks/mutations/useReceiptMutations.ts` pasa `userId` como primer argumento a `updateTransaction(userId, input.transactionId, ...)`.
  - `src/test/indexeddb-polyfill.ts` y `src/test/setup.ts` proveen `indexedDB`, `localStorage` y `sessionStorage` en memoria para Node 26 + Vitest sin modificar `package.json`.
- [x] **R-P0-F1 (`NEW-04`, `F2-A`, `SEC-004` en Docker PostgreSQL 17)** — `🟢 APROBADO`:
  - Se aplicó `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql` sobre el volcado de producción `.agent/audit/evidence/F2-prod-schema.sql` en contenedor efímero `postgres:17-alpine` y se ejecutó `.agent/audit/scratch/poc-p0-f1-post-remediation.sql` (salida en `.agent/audit/scratch/poc-p0-f1-output.txt`):
    - **`F2-A`**: `UPDATE public.push_subscriptions SET user_id = auth.uid()` sin `WHERE` -> `rows=1` (solo la fila propia; hijacking cross-tenant erradicado).
    - **`NEW-04` (`T09`)**: Usuario con factor MFA `verified` y JWT `aal1` -> `rows=0` en `SELECT` sobre las 10 tablas de `public` y `storage.objects`, `RLS 42501` en `INSERT`, `rows=0` en `UPDATE`.
    - **`T12`**: `DELETE FROM public.user_sessions WHERE device_id = 'device-a-other'` con JWT `aal1` -> `rows=0` (takeover sin segundo factor bloqueado).
    - **`NEW-04-NOREG`**: Usuario sin MFA (`audit-b`) con JWT `aal1` -> `rows=1` (sin regresión para usuarios sin 2FA).
    - **`SEC-004`**: `SELECT public.cleanup_stale_sessions()` como `authenticated` -> `42501 permission denied`.
- [x] **R-P0-F2 (`F8-A`, `SEC-012`, `NEW-06`)** — `🟢 APROBADO`:
  - `src/lib/supabase.ts` activa `flowType: 'pkce'`.
  - `src/App.tsx` rechaza cualquier URL con `access_token`/`refresh_token`, valida la allowlist (`url.split(/[?#]/)[0]`) y solo ejecuta `exchangeCodeForSession(code)`.
  - `src/pages/Login.tsx` restringe `isValidRedirectUri` a orígenes exactos y `src/pages/AuthCallback.tsx` limpia inmediatamente la URL con `window.history.replaceState`.
  - `android/app/src/main/AndroidManifest.xml` define `android:allowBackup="false"`, `backup_rules.xml`, `data_extraction_rules.xml` y elimina `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE`/`READ_MEDIA_IMAGES`.
- [x] **R-P0-F3 (`SEC-002` / `NEW-01` y `F4-F`)** — `🟢 APROBADO`:
  - `src/lib/encrypted-storage.ts` almacena un pepper CSPRNG de 256 bits por usuario en `IndexedDB` (`finance-pal-keystore`), usa salts por usuario (`finance-pal-encrypted-v1-salt:<userId>`) con `600,000` iteraciones PBKDF2-SHA256 y conserva el fallback de lectura legacy (`100,000` iteraciones) sin sobrescribir el salt antiguo antes de descifrar.
- [x] **R-P0-F4 (`SEC-015`, `F4-D`, `F10-B`)** — `🟢 APROBADO`:
  - `AuthContext.signOut()` registra `audit.logout` y acto seguido ejecuta `purgeAllEncryptedStorage(userId)` + `clearAuditLogs()`, eliminando los 3 blobs cifrados, sus `-meta`, recibos en IndexedDB, peppers en `finance-pal-keystore`, salts, `finance-pal-client-id`, `finance-pal-device-id`, claves `sb-*` y `sessionStorage`.
  - `src/lib/audit-logger.ts` enmascara emails (`u***@domain.com`) y redacta tokens/secretos antes de hashear y persistir.
- [x] **R-P0-F5 (`SEC-008` / `T11`)** — `🟢 APROBADO`:
  - `src/lib/rate-limiter.ts` configura `auth` en `5 req / 60s` y exporta `validatePasswordStrength` (`>= 12` chars + minúscula + mayúscula + dígito).
  - Cableado en `src/pages/Login.tsx`, `src/pages/ajustes/secciones/PerfilSection.tsx` y `supabase/config.toml`.

---

## 4. Criterios de Aceptación del Sprint P0 (`CA-P0-01` a `CA-P0-08`)

- [x] **CA-P0-01 (`F5-B` & Tests)**: `npx tsc --noEmit` devuelve `0 errores` y `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts src/test/security.test.ts` pasa al 100% (`27/27`).
- [x] **CA-P0-02 (`NEW-04` & `F2-A` & `SEC-004`)**: La migración `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql` bloquea cualquier acceso `aal1` cuando el usuario tiene MFA `verified`, impide el hijacking cross-tenant en `push_subscriptions` y revoca `cleanup_stale_sessions()` de `authenticated`/`anon` (`17/17 PASS` en PG17).
- [x] **CA-P0-03 (`F8-A` & `SEC-012`)**: `supabase.ts` usa `flowType: 'pkce'`, `App.tsx` no acepta `access_token`/`refresh_token` implícitos por deep link, `Login.tsx` restringe `isValidRedirectUri` y `AndroidManifest.xml` define `android:allowBackup="false"`.
- [x] **CA-P0-04 (`SEC-002` & `F4-F`)**: `encrypted-storage.ts` combina un pepper aleatorio de 256 bits en `IndexedDB` (`finance-pal-keystore`) con `user.id`, e incluye migración de lectura sin pérdida para ciphertexts previos.
- [x] **CA-P0-05 (`SEC-015`, `F4-D`, `F10-B`)**: `AuthContext.signOut()` purga todo `localStorage` e `IndexedDB` (`receipts`, `audit`, `keystore`), y `audit-logger.ts` enmascara emails.
- [x] **CA-P0-06 (`SEC-008` / `T11`)**: `Login.tsx` y `PerfilSection.tsx` aplican `rateLimiter.checkLimit(..., 'auth')` y exigen contraseñas de `>= 12` caracteres con complejidad.
- [x] **CA-P0-07 (Higiene & Secretos)**: `gitleaks dir .agent src supabase android --redact` reporta `0 leaks` y `package.json` no fue modificado.
- [x] **CA-P0-08 (Graphify)**: `graphify update .` ejecutado al finalizar los cambios de código.

---

## 5. Dictamen Final de Antigravity (Fase 3)

- **Veredicto del Sprint P0 (`v1.21.1-p0-remediation`)**: 🟢 **APROBADO Y MERGEADO A `main`**
- **Postura de Seguridad tras Sprint P0**: Los **6 bloqueantes P0** (`NEW-04`, `F2-A`, `F8-A`/`SEC-012`, `SEC-002`/`F4-F`, `SEC-015`/`F4-D`/`F10-B`, `SEC-008`/`T11` + `SEC-004` y `F5-B`) han quedado remediados en código y verificados dinámicamente.
- **Acción de Despliegue Requerida para Producción (`rjforcrdyfuodsqtopvp`)**:
  - Aplicar la migración validada `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql` en el proyecto Supabase remoto (`npx supabase db push` o SQL Editor de Supabase Dashboard) y activar en el panel de Auth de Supabase la longitud mínima de 12 caracteres y protección HIBP (`Leaked Password Protection`).
