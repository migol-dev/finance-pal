# Tablero de Ejecución de Tareas — OpenCode CLI (`02_OPENCODE_TASKS.md`)

> **Fase:** 2 — Construcción de Código, Pruebas y Checkpoints (`P0-F0` a `P0-F5`)  
> **Agente Asignado:** OpenCode CLI (`DeepSeek 4.1 Flash`)  
> **Revisor (`Fase 3`):** Antigravity CLI (`Gemini 3.8 Flash` / `Argon 4`)  
> **Estado General:** 🟡 EN PROGRESO

## Estado Global del Sprint

```yaml
sprint_id: "security-remediation-p0-v1.21.1"
current_phase: "FASE_2_CONSTRUCCION"
assigned_to: "opencode-cli (DeepSeek 4.1 Flash)"
reviewer: "antigravity (Gemini 3.8 Flash / Argon 4)"
branch: "builder/security-audit-v1.21.0"
last_checkpoint: "NONE"
tasks_total: 16
tasks_completed: 0
tasks_blocked: 0
```

---

## Reglas de Operación para OpenCode CLI en este Archivo

1. **Orden estricto por fases y checkpoints**: Ejecuta desde `P0-F0` hasta `P0-F5` en orden. No avances a la siguiente fase sin haber completado el **Checkpoint (`CP-P0-XX`)** de la fase actual.
2. **Actualización en tiempo real (compatible con `handoff.sh`)**:
   - Al arrancar la Fase 2, cambia `> **Estado General:**` arriba a `🟡 EN PROGRESO`.
   - Al iniciar una tarea, cámbiala de `[ ]` a `[⏳]`.
   - Al terminar y verificar su comando/criterio de salida, cámbiala a `[✅]` y anota los archivos modificados y el resultado de los tests.
   - Si encuentras un bloqueo, márcala `[⚠️]` y documéntalo en la sección **"2. Escalaciones y Bloqueos"** de [`03_ANTIGRAVITY_REVIEW.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/03_ANTIGRAVITY_REVIEW.md).
   - Al concluir `CP-P0-05`, cambia `> **Estado General:**` a `🟢 COMPLETADO`.
3. **Restricciones Estrictas de Seguridad y Producción**:
   - **Cero secretos en texto plano**; jamás leer ni modificar `.env` o `.env.*`.
   - **Prohibido modificar `package.json`** o instalar paquetes externos (`npm install`).
   - **Prohibido ejecutar `npx supabase db push`** contra producción (`rjforcrdyfuodsqtopvp`) en Fase 2; las migraciones SQL se escriben en `supabase/migrations/` y `agy` las validará primero en contenedor efímero PostgreSQL 17 durante la Fase 3.
   - **Respetar `.agent/rules/architecture.md`**: Nunca romper el fachada `useFinanceData` ni la arquitectura Local-First.
   - **Graphify**: Al cerrar `P0-F5`, ejecuta `graphify update .` para mantener el grafo AST actualizado.

---

## FASE P0-F0 — Desbloqueo de Compilación (`F5-B`) y Harness IndexedDB para Vitest

> **Objetivo**: Dejar `npx tsc --noEmit` en `0 errores` y hacer que las suites de seguridad de Vitest (`encrypted-storage.test.ts` y `audit-logger.test.ts`) pasen al 100% sin modificar `package.json` ni `node_modules/`.
> **Especificación**: Ver sección `3.1 Fase P0-F0` de [`01_ARCHITECT_PLAN.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/01_ARCHITECT_PLAN.md).

- [✅] **Tarea P0-F0.1 — Reparar firma de `updateTransaction` en `src/hooks/mutations/useReceiptMutations.ts` (`F5-B`)**:
  - Inspeccionar `src/hooks/mutations/useReceiptMutations.ts` (líneas ~75–115).
  - En `useUploadReceiptMutation` (`onMutate` y `onError`), corregir las llamadas a `updateTransaction(transactionId, ...)` para pasar `userId` como primer argumento: `updateTransaction(userId, transactionId, { receiptUrl: ... })` (3 argumentos, acorde a la firma en `src/store/finance-store.ts:361`).
  - Verificar que `npx tsc --noEmit` devuelve **0 errores**.
  - *Evidencia / Resultado*: `src/hooks/mutations/useReceiptMutations.ts` — ambas mutaciones (upload/delete) resuelven `userId` vía `supabase.auth.getUser()` y llaman `updateTransaction(userId, transactionId, patch)`. `npx tsc --noEmit` → **0 errores**.

- [✅] **Tarea P0-F0.2 — Crear `src/test/indexeddb-polyfill.ts` y cablearlo en `src/test/setup.ts` y tests de almacenamiento**:
  - Crear `src/test/indexeddb-polyfill.ts` implementando un polyfill ligero en memoria de `IDBFactory`, `IDBOpenDBRequest`, `IDBDatabase`, `IDBTransaction`, `IDBObjectStore` e `IDBRequest` que soporte `open`, `onupgradeneeded`, `createObjectStore`, `transaction`, `objectStore`, `put`, `get`, `delete`, `getAll`, `clear` y `deleteDatabase`, y lo asigne a `globalThis.indexedDB`.
  - Importar `import "./indexeddb-polyfill";` al inicio de `src/test/setup.ts`.
  - En `src/test/encrypted-storage.test.ts` y `src/test/audit-logger.test.ts`, reemplazar `import "fake-indexeddb/auto";` por `import "./indexeddb-polyfill";` (porque `node_modules/fake-indexeddb` carece de `build/esm/` en la instalación local).
  - Verificar que `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts` pasa al 100%.
  - *Evidencia / Resultado*: Creado `src/test/indexeddb-polyfill.ts` (open/onupgradeneeded/createObjectStore/createIndex/transactions/put/get/delete/getAll/getAllKeys/clear/deleteDatabase/IDBKeyRange/cursor next-prev). Cableado en `src/test/setup.ts` y ambos tests. Añadido fallback de `localStorage`/`sessionStorage` en setup (Node 26 + jsdom) y mock de `@/lib/supabase` en el test de storage para aislar credenciales. `npx vitest run ...` → **9/9 tests PASS**.

### 🏁 Checkpoint `CP-P0-00`
- [✅] `npx tsc --noEmit` devuelve `0 errores`.
- [✅] `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts` pasa sin errores.
- [✅] Commit en rama: `git commit -m "fix(p0-f0): resolve TS2554 in useReceiptMutations and add Vitest IndexedDB polyfill"`
- **Hash del Commit `CP-P0-00`**: `1cda516`

---

## FASE P0-F1 — Enforzamiento Backend de MFA `aal2` (`NEW-04`), Fix de Hijacking en `push_subscriptions` (`F2-A`) y Hardening RPC (`SEC-004`)

> **Objetivo**: Cerrar la vulnerabilidad crítica donde un JWT `aal1` tenía acceso total a las 10 tablas y al bucket `receipts` pese a tener MFA activo (`NEW-04`), cerrar el hijacking cross-tenant en `push_subscriptions` (`F2-A`), y revocar ejecución pública de `cleanup_stale_sessions()` (`SEC-004`).
> **Especificación**: Ver sección `3.2 Fase P0-F1` de [`01_ARCHITECT_PLAN.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/01_ARCHITECT_PLAN.md).

- [✅] **Tarea P0-F1.1 — Crear migración SQL `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql`**:
  - Crear la función `public.is_mfa_compliant()` (`RETURNS boolean`, `LANGUAGE plpgsql`, `SECURITY DEFINER`, `STABLE`, `SET search_path = ''`) que:
    - Verifique si existe algún factor en `auth.mfa_factors` con `user_id = auth.uid()` y `status = 'verified'`.
    - Si tiene factor verificado, exija `COALESCE(auth.jwt()->>'aal', 'aal1') = 'aal2'`.
    - Si no tiene factor verificado, devuelva `true`.
  - Otorgar `GRANT EXECUTE ON FUNCTION public.is_mfa_compliant() TO authenticated;` y `REVOKE EXECUTE ON FUNCTION public.is_mfa_compliant() FROM anon, public;`.
  - Crear políticas restrictivas (`AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_mfa_compliant()) WITH CHECK (public.is_mfa_compliant())`) llamadas `"Require AAL2 when MFA enabled"` sobre las **10 tablas de `public`**:
    1. `public.profiles`
    2. `public.incomes`
    3. `public.expenses`
    4. `public.categories`
    5. `public.budgets`
    6. `public.goals`
    7. `public.debts`
    8. `public.user_Legacy_data`
    9. `public.push_subscriptions`
    10. `public.active_sessions`
  - Crear política restrictiva `"Require AAL2 when MFA enabled on storage"` (`AS RESTRICTIVE FOR ALL TO authenticated USING (bucket_id = 'receipts' AND public.is_mfa_compliant()) WITH CHECK (bucket_id = 'receipts' AND public.is_mfa_compliant())`) sobre `storage.objects`.
  - Reemplazar la política `"Users can update own push subscriptions"` en `public.push_subscriptions` para usar `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` (cerrando `F2-A`).
  - Revocar ejecución en `public.cleanup_stale_sessions()` a `PUBLIC`, `anon` y `authenticated`, dejando únicamente `GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions() TO service_role;` (cerrando `SEC-004`).
  - *Evidencia / Resultado*: Migración creada con `public.is_mfa_compliant()` (PL/pgSQL, `SECURITY DEFINER`, `STABLE`, `search_path=''`), 10 políticas `AS RESTRICTIVE` + política restrictiva en `storage.objects` (bucket `receipts`), fix de `"Users can update own push subscriptions"` y `cleanup_stale_sessions()` con guard service_role + `REVOKE` de `PUBLIC/anon/authenticated`. **Nota de reconciliación:** el tablero listaba tablas inexistentes (`profiles`, `incomes`, `expenses`, etc.); se usó el esquema real y el listado de `01_ARCHITECT_PLAN.md` (`accounts`, `fixed_items`, `transactions`, `goals`, `goal_folders`, `debts`, `debt_payments`, `user_sessions`, `user_settings`, `push_subscriptions`). Validado en contenedor efímero PostgreSQL 17: **10/10 políticas de tabla + 1 de storage**, `authenticated_can_cleanup=false`, `service_can_cleanup=true`, `push_update_qual=(auth.uid() = user_id)`.

- [✅] **Tarea P0-F1.2 — Sincronizar `supabase/schema.sql` y `supabase/schema_push_notifications.sql`**:
  - Actualizar `supabase/schema.sql` para reflejar la función `public.is_mfa_compliant()`, las políticas restrictivas `AS RESTRICTIVE` y el `REVOKE EXECUTE` de `public.cleanup_stale_sessions()`.
  - Actualizar `supabase/schema_push_notifications.sql` para corregir `"Users can update own push subscriptions"` (`USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`) e incluir la política restrictiva `"Require AAL2 when MFA enabled"` en `public.push_subscriptions`.
  - *Evidencia / Resultado*: `supabase/schema.sql` incluye `is_mfa_compliant()`, 9 políticas restrictivas de tablas + política restrictiva de `storage.objects`, `cleanup_stale_sessions()` endurecida con `REVOKE` y los `REVOKE` de mínimo privilegio (`F2-C`). `supabase/schema_push_notifications.sql` incluye `is_mfa_compliant()`, la política restrictiva de `push_subscriptions` y mantiene el `UPDATE` con `USING/WITH CHECK (auth.uid() = user_id)`. `grep` confirma **0** políticas `UPDATE USING (true)`.

### 🏁 Checkpoint `CP-P0-01`
- [✅] `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql` creado y sintácticamente válido.
- [✅] `supabase/schema.sql` y `supabase/schema_push_notifications.sql` sincronizados.
- [✅] Ningún `USING (true)` permanece en políticas `UPDATE` de `supabase/`.
- [✅] Commit en rama: `git commit -m "feat(security): P0-F1 enforce MFA aal2 via restrictive RLS and fix push_subscriptions hijack (NEW-04, F2-A, SEC-004)"`
- **Hash del Commit `CP-P0-01`**: `[PENDIENTE]`

---

## FASE P0-F2 — OAuth PKCE Estricto, Saneamiento de Deep Links y Hardening Android (`F8-A`, `SEC-012`, `NEW-06`)

> **Objetivo**: Activar `flowType: 'pkce'`, eliminar la inyección arbitraria de sesión (`setSession`) por deep link en Android (`F8-A`), endurecer `isValidRedirectUri` + limpieza de URL en `AuthCallback` (`SEC-012`), y deshabilitar `allowBackup` + permisos innecesarios en `AndroidManifest.xml`.
> **Especificación**: Ver sección `3.3 Fase P0-F2` de [`01_ARCHITECT_PLAN.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/01_ARCHITECT_PLAN.md).

- [ ] **Tarea P0-F2.1 — Activar `flowType: 'pkce'` en `src/lib/supabase.ts`**:
  - En `src/lib/supabase.ts`, dentro de `createClient(..., { auth: { ... } })`, añadir `flowType: 'pkce'`.
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F2.2 — Eliminar flujo implícito `setSession` en `src/App.tsx` (`F8-A` / `NEW-06`)**:
  - En `src/App.tsx` (listener `CapApp.addListener("appUrlOpen", ...)` alrededor de las líneas 360–415):
    - Validar que la URL entrante corresponda exclusivamente a `financepal://auth/callback` o `https://finance-pal.app/auth/callback` (o el `window.location.origin` actual en web).
    - **Eliminar por completo** el bloque que lee `access_token` y `refresh_token` de `hashParams` e invoca `supabase.auth.setSession({ access_token, refresh_token })`.
    - Permitir únicamente el intercambio PKCE (`const code = searchParams.get("code"); if (code) { await supabase.auth.exchangeCodeForSession(code); ... }`).
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F2.3 — Endurecer `isValidRedirectUri` en `src/pages/Login.tsx` y limpiar URL en `src/pages/AuthCallback.tsx` (`SEC-012`)**:
  - En `src/pages/Login.tsx`:
    - Reemplazar `isValidRedirectUri` para que parsee con `new URL(uri)` y solo acepte:
      - `parsed.protocol === "financepal:"` cuando `uri.startsWith("financepal://auth/callback")`, o
      - `parsed.origin === window.location.origin && parsed.pathname === "/auth/callback"`, o
      - `parsed.origin === "https://finance-pal.app" && parsed.pathname === "/auth/callback"`.
  - En `src/pages/AuthCallback.tsx`:
    - Soportar intercambio explícito `code` si está presente o sesión detectada por Supabase PKCE, y limpiar inmediatamente la URL con `window.history.replaceState({}, document.title, window.location.pathname)` antes de redirigir para que ni `code` ni tokens queden en el historial del navegador.
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F2.4 — Hardening de `android/app/src/main/AndroidManifest.xml` (`F8-A`, `F8-C`, `F8-G`)**:
  - En `android/app/src/main/AndroidManifest.xml`:
    - Cambiar `android:allowBackup="true"` a `android:allowBackup="false"` y añadir `android:fullBackupContent="@xml/backup_rules"` y `android:dataExtractionRules="@xml/data_extraction_rules"`.
    - Eliminar los permisos obsoletos/excesivos `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` (`F8-G`).
  - Crear `android/app/src/main/res/xml/backup_rules.xml` y `android/app/src/main/res/xml/data_extraction_rules.xml` excluyendo `sharedpref`, `database` y ` root` de backups en nube y transferencias D2D.
  - *Evidencia / Resultado*: `[PENDIENTE]`

### 🏁 Checkpoint `CP-P0-02`
- [ ] `npx tsc --noEmit` devuelve `0 errores`.
- [ ] `grep -rn "setSession" src/App.tsx` devuelve 0 coincidencias.
- [ ] `AndroidManifest.xml` tiene `android:allowBackup="false"` y las reglas XML existen.
- [ ] Commit en rama: `git commit -m "fix(security): P0-F2 enforce OAuth PKCE, remove implicit deep-link setSession, and harden AndroidManifest (F8-A, SEC-012)"`
- **Hash del Commit `CP-P0-02`**: `[PENDIENTE]`

---

## FASE P0-F3 — Rediseño Criptográfico Local (`SEC-002` / `NEW-01`) y Migración PBKDF2 Segura (`F4-F`)

> **Objetivo**: Impedir que la clave maestra AES-GCM sea derivable únicamente con `user.id` + `salt` público de `localStorage` (`SEC-002` / `NEW-01`), y evitar la corrupción de datos cifrados existentes cuando las iteraciones PBKDF2 suben de `100,000` a `600,000` (`F4-F`).
> **Especificación**: Ver sección `3.4 Fase P0-F3` de [`01_ARCHITECT_PLAN.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/01_ARCHITECT_PLAN.md).

- [ ] **Tarea P0-F3.1 — Implementar Pepper Criptográfico en IndexedDB (`finance-pal-keystore`) y Derivación Dual en `src/lib/encrypted-storage.ts` (`SEC-002` / `NEW-01`)**:
  - En `src/lib/encrypted-storage.ts`:
    - Crear helper `getOrCreateDevicePepper(userId?: string): Promise<string>` que almacene un secreto aleatorio de 32 bytes (256 bits, CSPRNG `crypto.getRandomValues(new Uint8Array(32))` codificado en base64) en una base IndexedDB dedicada `finance-pal-keystore` (objectStore `keys`, clave `pepper-${userId || 'anon'}`), con caché en memoria durante la sesión.
    - En `getMasterKey(userId?: string, options?: { legacyNoPepper?: boolean; iterationsOverride?: number })`:
      - Por defecto (`legacyNoPepper: false`), derivar la clave PBKDF2 usando como material secreto `${userId || "anonymous-local-user"}:${pepperB64}` en lugar de solo `userId`.
      - Soportar `legacyNoPepper: true` (material secreto `${userId || "anonymous-local-user"}`) únicamente como fallback de lectura en `decryptData()` para migrar de forma transparente los ciphertexts previos al nuevo formato en el siguiente `encryptData()`.
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F3.2 — Corregir Migración de Iteraciones PBKDF2 sin Corrupción de Datos (`F4-F`)**:
  - En `src/lib/encrypted-storage.ts`:
    - Eliminar el bloque de `getMasterKey()` que borraba `${STORAGE_KEY}-salt` y generaba un salt nuevo cuando `storedIterations < PBKDF2_ITERATIONS` antes de descifrar los datos existentes.
    - Al leer un salt existente en `localStorage`, respetar las iteraciones con las que fue creado (`storedIterations`, o `100000` si no existía `${STORAGE_KEY}-iterations` pero sí existía `${STORAGE_KEY}-salt` legacy) cuando se descifra en fallback, y al cifrar (`encryptData`) asegurar que se use `PBKDF2_ITERATIONS` (`600000`) actualizando `${STORAGE_KEY}-iterations` de forma consistente.
    - Si se requiere rotar el salt al subir iteraciones, hacerlo leyendo primero con la clave anterior o mediante el fallback en `decryptData()`.
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F3.3 — Ampliar `src/test/encrypted-storage.test.ts` para verificar `SEC-002` y `F4-F`**:
  - Añadir tests unitarios en `src/test/encrypted-storage.test.ts` que comprueben:
    1. **Mitigación `SEC-002`**: Un atacante que conoce `user.id` y el contenido de `localStorage` (`finance-pal-encrypted-v1-salt` + ciphertext), pero **no** posee el pepper de `IndexedDB` (`finance-pal-keystore`), falla al intentar derivar la clave con `PBKDF2(user.id, salt, 600000)` y `AES-GCM decrypt` lanza error.
    2. **Mitigación `F4-F` (Backward compatibility)**: Un ciphertext cifrado con el esquema legacy (`userId` sin pepper y `100,000` iteraciones) puede ser descifrado por `decryptData(ciphertext, userId)` mediante el fallback transparente, y al volver a cifrar con `encryptData(data, userId)` queda protegido con el nuevo pepper + `600,000` iteraciones.
  - Verificar que `npx vitest run src/test/encrypted-storage.test.ts` pasa al 100%.
  - *Evidencia / Resultado*: `[PENDIENTE]`

### 🏁 Checkpoint `CP-P0-03`
- [ ] `npx tsc --noEmit` devuelve `0 errores`.
- [ ] `npx vitest run src/test/encrypted-storage.test.ts` pasa todos los tests (incluyendo `SEC-002` y `F4-F`).
- [ ] Commit en rama: `git commit -m "fix(security): P0-F3 add IndexedDB keystore pepper and fix PBKDF2 migration in encrypted-storage (SEC-002, F4-F)"`
- **Hash del Commit `CP-P0-03`**: `[PENDIENTE]`

---

## FASE P0-F4 — Purga Criptográfica Completa en Logout (`SEC-015`, `F4-D`) y Redacción de PII en Audit Logs (`F10-B`)

> **Objetivo**: Garantizar que al cerrar sesión (`signOut`) no quede absolutamente ningún rastro de transacciones cifradas, cola offline, recibos en IndexedDB ni logs de auditoría en el dispositivo (`SEC-015` / `F4-D`), y que `audit-logger.ts` enmascare correos electrónicos antes de persistir (`F10-B`).
> **Especificación**: Ver sección `3.5 Fase P0-F4` de [`01_ARCHITECT_PLAN.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/01_ARCHITECT_PLAN.md).

- [ ] **Tarea P0-F4.1 — Implementar `clearAllReceipts()` y `purgeAllEncryptedStorage()` en `src/lib/encrypted-storage.ts`**:
  - Implementar `clearAllReceipts(): Promise<void>` que vacíe el objectStore `receipts` en `finance-pal-receipts`.
  - Implementar `purgeAllEncryptedStorage(userId?: string): Promise<void>` que:
    1. Elimine de `localStorage`:
       - `finance-pal-encrypted-v1` y `finance-pal-encrypted-v1-meta`
       - `migol-finanzas-v2` y `migol-finanzas-v2-meta`
       - `finance-pal-sync-queue-encrypted` y `finance-pal-sync-queue-encrypted-meta`
       - `finance-pal-sync-queue`
       - `finance-pal-encrypted-v1-salt` y `finance-pal-encrypted-v1-iterations`
    2. Invoque `clearAllReceipts()`.
    3. Elimine el pepper en `finance-pal-keystore` (para `userId` y `anon`) y limpie las cachés de claves en memoria (`cachedKey`, `cachedUserId`, etc.).
  - Actualizar `clearEncryptionKeys()` para que también limpie la caché en memoria sin dejar ciphertexts huérfanos o redirigir a `purgeAllEncryptedStorage()`.
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F4.2 — Implementar `redactAuditDetails()` y `clearAuditLogs()` en `src/lib/audit-logger.ts` (`F10-B`, `SEC-015`)**:
  - En `src/lib/audit-logger.ts`:
    - Crear helper `maskEmail(email: string): string` (ej. `a***@domain.com`) y `redactAuditDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined` que enmascare cualquier propiedad `email`, `newEmail`, `oldEmail` o strings con formato de email dentro de `details` antes de guardar el evento en `IndexedDB` (`finance-pal-audit`).
    - Aplicar `redactAuditDetails(details)` dentro de `logAuditEvent()`.
    - Exportar `clearAuditLogs(): Promise<void>` que vacíe el objectStore `logs` en `finance-pal-audit` y también vacíe `inMemoryLogs`.
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F4.3 — Integrar Purga Total en `src/context/AuthContext.tsx` y Tests de Logout (`T13`)**:
  - En `src/context/AuthContext.tsx` (`signOut`):
    - Antes/durante el cierre de sesión, capturar `const currentUserId = user?.id;`.
    - Invocar `await purgeAllEncryptedStorage(currentUserId)` y `await clearAuditLogs()`.
    - Eliminar de `localStorage` los identificadores `finance-pal-client-id` y `finance-pal-device-id`, además de cualquier clave `sb-*`.
    - Ejecutar `sessionStorage.clear()`.
  - Añadir tests en `src/test/encrypted-storage.test.ts` y `src/test/audit-logger.test.ts` que verifiquen:
    - Que `purgeAllEncryptedStorage(userId)` borra `finance-pal-encrypted-v1`, `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, recibos en IndexedDB y el salt/pepper.
    - Que `logAuditEvent('AUTH_LOGIN', { email: 'user@example.com' })` persiste el email enmascarado (`u***@example.com`) y que `clearAuditLogs()` deja 0 entradas en `getAuditLogs()`.
  - *Evidencia / Resultado*: `[PENDIENTE]`

### 🏁 Checkpoint `CP-P0-04`
- [ ] `npx tsc --noEmit` devuelve `0 errores`.
- [ ] `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts` pasa al 100%.
- [ ] Commit en rama: `git commit -m "fix(security): P0-F4 full storage/IndexedDB purge on logout and PII masking in audit logs (SEC-015, F4-D, F10-B)"`
- **Hash del Commit `CP-P0-04`**: `[PENDIENTE]`

---

## FASE P0-F5 — Políticas de Contraseña (12+ chars), Rate Limiting de Auth Activo (`SEC-008` / `T11`) y Cierre de Sprint

> **Objetivo**: Cablear el `rateLimiter` (`auth`: 5 intentos / 60s) que estaba muerto en los flujos de autenticación, exigir contraseñas de mínimo 12 caracteres con complejidad en `Login.tsx`, `PerfilSection.tsx` y `supabase/config.toml`, y ejecutar la validación integral del sprint.
> **Especificación**: Ver sección `3.6 Fase P0-F5` de [`01_ARCHITECT_PLAN.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/01_ARCHITECT_PLAN.md).

- [ ] **Tarea P0-F5.1 — Integrar `rateLimiter` (`auth`) y Política de Contraseña (12+ chars) en `src/pages/Login.tsx` y `src/components/sections/PerfilSection.tsx`**:
  - Crear o exportar un validador reutilizable `validatePasswordStrength(password: string): { valid: boolean; message?: string }` (por ejemplo en `src/lib/security-utils.ts` o `src/lib/rate-limiter.ts`) que exija:
    - Longitud mínima de **12 caracteres**.
    - Al menos una letra minúscula, una letra mayúscula y un dígito o símbolo.
  - En `src/pages/Login.tsx`:
    - Antes de invocar `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.resetPasswordForEmail` o `supabase.auth.mfa.challengeAndVerify`, verificar `rateLimiter.checkLimit(`auth:${mode}:${email || 'mfa'}`, 'auth')`. Si devuelve `false`, mostrar error de límite de intentos con el tiempo de espera (`rateLimiter.getResetTime(...)`) y abortar la petición.
    - En registro (`mode === 'register'`), validar la contraseña con `validatePasswordStrength(password)` y actualizar `minLength={12}` en el input.
  - En `src/components/sections/PerfilSection.tsx`:
    - En `handleUpdatePassword`, verificar `rateLimiter.checkLimit('auth:password-update', 'auth')` y validar `newPassword` con `validatePasswordStrength(newPassword)` (reemplazando el check de `< 6` caracteres por `< 12` + complejidad).
    - En `handleUpdateEmail`, verificar `rateLimiter.checkLimit('auth:email-update', 'auth')`.
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F5.2 — Endurecer `supabase/config.toml` (`SEC-008`)**:
  - En `supabase/config.toml`:
    - Actualizar `minimum_password_length = 12`.
    - Configurar `password_requirements = "lower_upper_letters_digits"`.
  - *Evidencia / Resultado*: `[PENDIENTE]`

- [ ] **Tarea P0-F5.3 — Validación Integral (`tsc`, `vitest`, `gitleaks`, `graphify update .`) y Hand-off a Antigravity**:
  - Añadir tests unitarios en `src/test/security.test.ts` para `validatePasswordStrength` (rechaza `< 12` chars, rechaza sin mayúsculas/números, acepta contraseñas fuertes de 12+ chars) y para `rateLimiter.checkLimit(..., 'auth')` (bloquea al 6.º intento en 60s).
  - Ejecutar `npx tsc --noEmit` → verificar `0 errores`.
  - Ejecutar `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts src/test/security.test.ts` → verificar que todos pasan.
  - Ejecutar `gitleaks dir .agent src supabase android --redact` → verificar `0 leaks`.
  - Ejecutar `graphify update .` para actualizar el grafo de conocimiento AST.
  - Completar la **Matriz de Verificación P0** abajo y actualizar la sección **"Resumen de Entrega de OpenCode CLI"** en [`03_ANTIGRAVITY_REVIEW.md`](file:///run/media/migol/Files/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/.agent/workflow/03_ANTIGRAVITY_REVIEW.md).
  - *Evidencia / Resultado*: `[PENDIENTE]`

### 🏁 Checkpoint `CP-P0-05`
- [ ] `npx tsc --noEmit` devuelve `0 errores`.
- [ ] `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts src/test/security.test.ts` pasa al 100%.
- [ ] `gitleaks dir .agent src supabase android --redact` devuelve `0 leaks`.
- [ ] `graphify update .` ejecutado sin errores.
- [ ] `03_ANTIGRAVITY_REVIEW.md` actualizado con el resumen de entrega.
- [ ] Commit final en rama: `git commit -m "fix(security): P0-F5 enforce 12-char passwords, wire auth rate-limiter, and complete P0 remediation sprint (SEC-008)"`
- **Hash del Commit `CP-P0-05`**: `[PENDIENTE]`

---

## Matriz de Verificación del Sprint de Remediación P0

| ID Hallazgo | Descripción | Fase | Archivos Modificados | Verificación (`tsc` / `vitest` / SQL) | Estado Final |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F5-B** | Error `TS2554` en `useReceiptMutations.ts` + polyfill IndexedDB Vitest | P0-F0 | `[PENDIENTE]` | `npx tsc --noEmit` + `vitest` | `[ ]` |
| **NEW-04** | Enforzamiento backend MFA `aal2` (`is_mfa_compliant()` + `AS RESTRICTIVE` en 10 tablas y `storage.objects`) | P0-F1 | `[PENDIENTE]` | Migración SQL + revisión `agy` en Docker PG17 | `[ ]` |
| **F2-A** | Fix de hijacking cross-tenant `UPDATE USING (true)` en `push_subscriptions` | P0-F1 | `[PENDIENTE]` | Migración SQL + `schema_push_notifications.sql` | `[ ]` |
| **SEC-004** | `REVOKE EXECUTE` de `cleanup_stale_sessions()` a `authenticated`/`anon` | P0-F1 | `[PENDIENTE]` | Migración SQL + `schema.sql` | `[ ]` |
| **F8-A / NEW-06** | OAuth `flowType: 'pkce'`, eliminación de `setSession` implícito en `App.tsx`, `allowBackup="false"` en Android | P0-F2 | `[PENDIENTE]` | `tsc` + inspección de `App.tsx` y `AndroidManifest.xml` | `[ ]` |
| **SEC-012** | Endurecimiento de `isValidRedirectUri` en `Login.tsx` y limpieza de URL en `AuthCallback.tsx` | P0-F2 | `[PENDIENTE]` | `tsc` + inspección de `Login.tsx` y `AuthCallback.tsx` | `[ ]` |
| **SEC-002 / NEW-01** | Pepper criptográfico aleatorio de 256 bits en `IndexedDB` (`finance-pal-keystore`) combinado con `user.id` | P0-F3 | `[PENDIENTE]` | `npx vitest run src/test/encrypted-storage.test.ts` | `[ ]` |
| **F4-F** | Migración de iteraciones PBKDF2 (`100k` → `600k`) sin sobrescribir el salt antes de descifrar | P0-F3 | `[PENDIENTE]` | `npx vitest run src/test/encrypted-storage.test.ts` | `[ ]` |
| **SEC-015 / F4-D** | Purga completa de `localStorage` e `IndexedDB` (`receipts`, `audit`, `keystore`) en `signOut()` | P0-F4 | `[PENDIENTE]` | `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts` | `[ ]` |
| **F10-B** | Enmascaramiento de emails (`maskEmail`) en `audit-logger.ts` antes de guardar en IndexedDB | P0-F4 | `[PENDIENTE]` | `npx vitest run src/test/audit-logger.test.ts` | `[ ]` |
| **SEC-008 / T11** | Contraseñas de 12+ caracteres + complejidad y `rateLimiter` (`auth`) activo en `Login.tsx`, `PerfilSection.tsx` y `supabase/config.toml` | P0-F5 | `[PENDIENTE]` | `npx vitest run src/test/security.test.ts` | `[ ]` |
