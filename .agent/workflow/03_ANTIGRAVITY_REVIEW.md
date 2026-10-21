# Registro de Revisión, Escalaciones y Sign-Off — Antigravity (`03_ANTIGRAVITY_REVIEW.md`)

> **Fase:** 3 — Revisión Dinámica, Validación PostgreSQL 17 y Sign-Off (`R-P0-F0` a `R-P0-F5`)  
> **Revisor Principal:** Antigravity CLI (`Gemini 3.8 Flash` / `Argon 4`)  
> **Estado General:** ⚪ EN ESPERA

## Metadatos de Revisión

| Campo | Valor |
| :--- | :--- |
| **Revisor Principal (Fase 3)** | Antigravity (`agy` — Gemini 3.8 Flash / Argon 4) |
| **Constructor / Implementador (Fase 2)** | OpenCode CLI (`opencode` — DeepSeek 4.1 Flash) |
| **Sprint Activo** | `v1.21.1-p0-remediation` (Remediación de los 6 Bloqueantes P0) |
| **Sprint Previo Archivado** | `v1.21.0-security-audit` (Certificado en commit `3a0da24`) |
| **Estado de Revisión** | 🟡 **PENDIENTE DE EJECUCIÓN FASE 2 (OPENCODE CLI)** |

---

## 1. Resumen de Entrega de OpenCode CLI (A completar por `opencode` al cerrar `CP-P0-05`)

> **Instrucción para OpenCode CLI**: Al finalizar la Fase `P0-F5` (`CP-P0-05`), completa esta tabla con los hashes de cada checkpoint y el resumen de resultados.

### 1.1 Checkpoints Completados

| Checkpoint | Fase | Commit Hash | Estado | Resumen de Cambios |
| :--- | :--- | :--- | :--- | :--- |
| `CP-P0-00` | P0-F0: Fix `F5-B` (`TS2554`) + Polyfill IndexedDB Vitest | `1cda516` | `[✅]` | `useReceiptMutations` pasa `userId`; polyfill IndexedDB + fallback Storage en Vitest (9/9 tests). |
| `CP-P0-01` | P0-F1: Migración SQL `NEW-04` (`aal2`), `F2-A` y `SEC-004` | `43c735f` | `[✅]` | `is_mfa_compliant()` + 10 políticas restrictivas + storage; push UPDATE tenant-scoped; `cleanup_stale_sessions()` service_role. Validado en PG17 efímero. |
| `CP-P0-02` | P0-F2: OAuth PKCE, remoción de `setSession` y `AndroidManifest.xml` (`F8-A`, `SEC-012`) | `b54e4a2` | `[✅]` | `flowType:'pkce'`; deep link solo canjea `code`; redirect allowlist estricta; `allowBackup=false` + reglas XML; permisos de almacenamiento eliminados. |
| `CP-P0-03` | P0-F3: Pepper en IndexedDB (`SEC-002`) y migración PBKDF2 (`F4-F`) | `[PENDIENTE]` | `[ ]` | `[PENDIENTE]` |
| `CP-P0-04` | P0-F4: Purga total en Logout (`SEC-015`, `F4-D`) y máscara PII (`F10-B`) | `[PENDIENTE]` | `[ ]` | `[PENDIENTE]` |
| `CP-P0-05` | P0-F5: Contraseñas 12+ chars y `rateLimiter` (`SEC-008`) + `graphify update .` | `[PENDIENTE]` | `[ ]` | `[PENDIENTE]` |

### 1.2 Resultados de Verificación de OpenCode CLI

- **`npx tsc --noEmit`**: `[PENDIENTE]`
- **`npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts src/test/security.test.ts`**: `[PENDIENTE]`
- **`gitleaks dir .agent src supabase android --redact`**: `[PENDIENTE]`
- **`graphify update .`**: `[PENDIENTE]`

---

## 2. Escalaciones y Bloqueos de Fase 2 (`opencode` → `agy`)

> Si durante la implementación en Fase 2 surge algún conflicto arquitectónico o bloqueo técnico, OpenCode CLI lo registrará aquí con formato `ESC-P0-XX`.

- *Sin escalaciones registradas hasta el momento.*

---

## 3. Backlog de Revisión y Verificación Dinámica de Fase 3 (`agy`)

Una vez que OpenCode CLI entregue `CP-P0-05`, Antigravity (`agy`) ejecutará las siguientes revisiones antes de fusionar a `main`:

- [ ] **R-P0-F0 (`F5-B` y Harness Vitest)**:
  - Verificar `npx tsc --noEmit` (`0 errores`) y ejecución limpia de `src/test/encrypted-storage.test.ts` y `src/test/audit-logger.test.ts` con `src/test/indexeddb-polyfill.ts`.
- [ ] **R-P0-F1 (`NEW-04`, `F2-A`, `SEC-004` en Docker PostgreSQL 17)**:
  - Levantar el arnés PostgreSQL 17 local y aplicar `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql`.
  - Ejecutar la prueba dinámica `T06` con un usuario con factor MFA `verified`:
    - Con JWT `aal1`: confirmar que `SELECT`, `INSERT`, `UPDATE` y `DELETE` devuelven **0 filas / RLS violation** en las 10 tablas y en `storage.objects`.
    - Con JWT `aal2`: confirmar que el usuario accede normalmente a sus propias filas.
    - Con un usuario sin MFA (`auth.mfa_factors` vacío): confirmar que `aal1` sigue funcionando sin regresión.
  - Ejecutar la prueba dinámica `F2-A`: confirmar que `UPDATE public.push_subscriptions SET user_id = auth.uid()` sin `WHERE` ya **no** afecta filas de otros usuarios (`UPDATE 0`).
  - Confirmar que `authenticated` y `anon` ya no tienen permiso `EXECUTE` sobre `public.cleanup_stale_sessions()` (`SEC-004`).
- [ ] **R-P0-F2 (`F8-A`, `SEC-012`, `NEW-06`)**:
  - Verificar que `src/lib/supabase.ts` tiene `flowType: 'pkce'`, que `src/App.tsx` ya no contiene `setSession({ access_token, refresh_token })`, que `Login.tsx` valida estrictamente el redirect URI y que `AndroidManifest.xml` tiene `android:allowBackup="false"`.
- [ ] **R-P0-F3 (`SEC-002` / `NEW-01` y `F4-F`)**:
  - Verificar con el arnés WebCrypto (`T13`) y Vitest que la clave maestra AES-GCM ya no es derivable solo con `user.id` + `salt` de `localStorage`, y que los datos legacy (`100k` iteraciones) se migran sin pérdida.
- [ ] **R-P0-F4 (`SEC-015`, `F4-D`, `F10-B`)**:
  - Verificar que `signOut()` purga `finance-pal-encrypted-v1`, `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, `finance-pal-receipts`, `finance-pal-audit` y `finance-pal-keystore`, y que `audit-logger.ts` enmascara emails.
- [ ] **R-P0-F5 (`SEC-008` / `T11`)**:
  - Verificar que `rateLimiter` (`auth`: 5 req / 60s) está activo en `Login.tsx` y `PerfilSection.tsx`, y que se exigen contraseñas de 12+ caracteres tanto en cliente como en `supabase/config.toml`.

---

## 4. Criterios de Aceptación del Sprint P0 (`CA-P0-01` a `CA-P0-08`)

- [ ] **CA-P0-01 (`F5-B` & Tests)**: `npx tsc --noEmit` devuelve `0 errores` y `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts src/test/security.test.ts` pasa al 100%.
- [ ] **CA-P0-02 (`NEW-04` & `F2-A` & `SEC-004`)**: La migración `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql` bloquea cualquier acceso `aal1` cuando el usuario tiene MFA `verified`, impide el hijacking cross-tenant en `push_subscriptions` y revoca `cleanup_stale_sessions()` de `authenticated`/`anon`.
- [ ] **CA-P0-03 (`F8-A` & `SEC-012`)**: `supabase.ts` usa `flowType: 'pkce'`, `App.tsx` no acepta `access_token`/`refresh_token` implícitos por deep link, `Login.tsx` restringe `isValidRedirectUri` y `AndroidManifest.xml` define `android:allowBackup="false"`.
- [ ] **CA-P0-04 (`SEC-002` & `F4-F`)**: `encrypted-storage.ts` combina un pepper aleatorio de 256 bits en `IndexedDB` (`finance-pal-keystore`) con `user.id`, e incluye migración de lectura sin pérdida para ciphertexts previos.
- [ ] **CA-P0-05 (`SEC-015`, `F4-D`, `F10-B`)**: `AuthContext.signOut()` purga todo `localStorage` e `IndexedDB` (`receipts`, `audit`, `keystore`), y `audit-logger.ts` enmascara emails.
- [ ] **CA-P0-06 (`SEC-008` / `T11`)**: `Login.tsx` y `PerfilSection.tsx` aplican `rateLimiter.checkLimit(..., 'auth')` y exigen contraseñas de `>= 12` caracteres con complejidad.
- [ ] **CA-P0-07 (Higiene & Secretos)**: `gitleaks dir .agent src supabase android --redact` reporta `0 leaks` y `package.json` no fue modificado.
- [ ] **CA-P0-08 (Graphify)**: `graphify update .` ejecutado al finalizar los cambios de código.

---

## 5. Dictamen Final de Antigravity (Fase 3)

- **Estado**: ⏳ *En espera de que OpenCode CLI complete la Fase 2 (`CP-P0-00` a `CP-P0-05`).*
