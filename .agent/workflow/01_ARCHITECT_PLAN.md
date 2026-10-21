# 🏛️ Plan Arquitectónico: Sprint de Remediación P0 — Seguridad y Privacidad (Finance Pal v1.21.1)

> **Fase:** 1 — Arquitectura, Especificación Técnica y Plan de Construcción (`P0-F0` a `P0-F5`)  
> **Arquitecto Lead:** Antigravity CLI (`agy`)  
> **Modelos Autorizados (`agy`):** Google Gemini 3.8 Flash / Google Argon 4  
> **Agente Constructor (`Fase 2`):** OpenCode CLI (`DeepSeek 4.1 Flash`)  
> **Entrada de Referencia:** `.agent/security_audit.md` (Sección v2 §12.1–§12.9) y `.agent/workflow/03_ANTIGRAVITY_REVIEW.md`  
> **Estado:** 🟢 LISTO PARA CONSTRUCCIÓN

---

## 1. Objetivo y Alcance del Sprint de Remediación P0

La Re-auditoría Integral v2 (`CP-00`…`CP-11` + Cierre Fase 3 `3a0da24`) emitió el dictamen `🔴 RIESGO ALTO — NO CERTIFICABLE` hasta cerrar **6 brechas bloqueantes (`P0`)** más 2 bloqueantes técnicos de compilación/tests (`F5-B` y `fake-indexeddb`).

El objetivo de este sprint es **implementar, probar y verificar en código** las correcciones definitivas para los **6 bloqueantes P0**, respetando estrictamente la arquitectura **Local-First + Fachada `useFinanceData`** (`.agent/rules/architecture.md`):

| ID Bloqueante | CVSS v3.1 | Descripción del Problema | Fase del Sprint |
| :--- | :---: | :--- | :---: |
| **`F5-B` + Arnés IDB** | Funcional | `useReceiptMutations.ts:81,105` rompe `tsc` (`TS2554`: 2 args en vez de 3) y `fake-indexeddb/auto` falla al resolver `build/esm/` en Vitest. | **`P0-F0`** (`CP-P0-00`) |
| **`NEW-04` + `F2-A` + `SEC-004`** | 🔴 **8.1** | 1) MFA es solo UI: 0 políticas RLS exigen `aal2` (`T09`).<br>2) `push_subscriptions` tiene `UPDATE USING (true)`, permitiendo secuestro masivo de filas con `UPDATE` sin `WHERE` (`T06`).<br>3) `cleanup_stale_sessions()` tiene `GRANT EXECUTE TO authenticated` y guard `current_user` roto (`T07`). | **`P0-F1`** (`CP-P0-01`) |
| **`F8-A` + `SEC-012` + `NEW-06`** | 🔴 **8.1** | 1) Cliente Supabase usa OAuth `implicit` y `App.tsx` ejecuta `setSession` desde el fragmento del intent sin validar origen/`state`.<br>2) `isValidRedirectUri` acepta cualquier puerto/path en `localhost` y cualquier subdominio `.financepal.com`.<br>3) `AndroidManifest.xml` tiene `allowBackup="true"` sin reglas de exclusión. | **`P0-F2`** (`CP-P0-02`) |
| **`SEC-002` / `NEW-01` + `F4-F`** | 🟠 **7.1 / 5.5** | 1) `F4-F`: El upgrade PBKDF2 de `100,000` a `600,000` iteraciones sobrescribe el salt sin re-cifrar los datos existentes, provocando pérdida de datos en el siguiente arranque.<br>2) `SEC-002`/`NEW-01`: La clave AES-GCM se deriva únicamente de `session.user.id` (UUID público) + salt en `localStorage`, y el salt es único global para todas las cuentas. | **`P0-F3`** (`CP-P0-03`) |
| **`SEC-015` / `F4-D` + `F10-B`** | 🟠 **7.1** | `signOut()` llama a `clearEncryptedState()` con la clave por defecto `finance-pal-encrypted-v1`, dejando huérfanos `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, recibos en IndexedDB/Filesystem y el `audit_log` en claro (incluyendo `newEmail`), pero borrando el salt compartido (`T13`). | **`P0-F4`** (`CP-P0-04`) |
| **`SEC-008` / `T11`** | 🟠 **7.4** | `rate-limiter.ts` (`auth`) no está conectado en `Login.tsx` ni `PerfilSection.tsx`; longitud mínima de contraseña en 6/8 caracteres en lugar de 12 (`ASVS V2.1.1`); cambio de contraseña no exige contraseña actual (`ASVS V2.1.6`); `supabase/config.toml` en `minimum_password_length = 6`. | **`P0-F5`** (`CP-P0-05`) |

---

## 2. Reglas de Seguridad y Restricciones de Construcción

1. **Protocolo Context-First (`AGENTS.md` / `GEMINI.md`):**
   - Antes de editar cualquier archivo, consulta `graphify query "<concepto>"` si necesitas contexto adicional.
   - Al finalizar la Fase `P0-F5`, ejecuta `graphify update .` para mantener el grafo sincronizado.
2. **Respeto a `.agentignore`:**
   - **PROHIBIDO** leer, imprimir o modificar `.env`, `.env.local` o `.env.template`.
   - **PROHIBIDO** modificar `package.json` o `package-lock.json`.
3. **Protección de Producción (`rjforcrdyfuodsqtopvp`):**
   - OpenCode CLI (`Fase 2`) escribirá la migración SQL en `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql` y actualizará `supabase/schema.sql`, `supabase/schema_push_notifications.sql` y `supabase/config.toml`, **pero NO ejecutará `supabase db push` contra producción**.
   - En `Fase 3`, Antigravity (`agy`) validará primero la migración en el contenedor `postgres:17-alpine` contra la suite `poc-t06-t09-t12-rls-tests.sql` antes de cualquier aplicación remota.

---

## 3. Especificación Técnica Detallada por Fase (`P0-F0` a `P0-F5`)

### 🛠️ Fase `P0-F0`: Desbloqueo de TypeScript (`F5-B`) y Arnés IndexedDB para Vitest (`CP-P0-00`)

#### `P0-F0.1` — `src/hooks/mutations/useReceiptMutations.ts`
- **Problema (`F5-B`):** `updateTransaction(userId: string, id: string, patch: Partial<Transaction>)` en `src/services/transactions.service.ts:68` recibe **3 argumentos**, pero `useReceiptMutations.ts` la invoca con 2 argumentos en las líneas `81` y `105`.
- **Especificación de cambio:**
  1. En `uploadReceiptForTransaction.mutationFn` (línea 81): cambiar `await updateTransaction(input.transactionId, { receipt: result.publicUrl });` por:
     ```ts
     await updateTransaction(userId, input.transactionId, { receipt: result.publicUrl });
     ```
  2. En `deleteReceiptForTransaction.mutationFn` (líneas 99-106): obtener `userId` igual que en `uploadReceiptForTransaction`:
     ```ts
     const { data } = await supabase.auth.getUser();
     const userId = data.user?.id;
     if (!userId) throw new Error('No user');
     await deleteReceipt(input.storagePath);
     await updateTransaction(userId, input.transactionId, { receipt: undefined });
     ```

#### `P0-F0.2` — `src/test/indexeddb-polyfill.ts`, `src/test/setup.ts`, `src/test/encrypted-storage.test.ts`, `src/test/audit-logger.test.ts`
- **Problema:** `node_modules/fake-indexeddb` en este entorno carece del directorio compilado `build/esm/`, haciendo fallar `import "fake-indexeddb/auto"`.
- **Especificación de cambio:**
  1. Crear `src/test/indexeddb-polyfill.ts` que implemente e instale en `globalThis.indexedDB` y `globalThis.IDBKeyRange` un polyfill ligero en memoria compatible con las operaciones usadas por `encrypted-storage.ts` y `audit-logger.ts`:
     - `indexedDB.open(name, version)` con disparo de `onupgradeneeded` y `onsuccess`.
     - `db.createObjectStore(name, options?: { keyPath?: string })` y `objectStoreNames.contains(name)`.
     - `store.createIndex(name, keyPath, options)` e `index(name)`.
     - `store.put(value, key?)`, `store.get(key)`, `store.delete(key)`, `store.clear()`, `store.getAll()`, `store.getAllKeys()`.
     - `index.getAll()` e `index.openCursor(range?, direction?: 'next' | 'prev')` (ordenando por el campo del índice en orden ascendente o descendente y soportando `cursor.continue()`).
     - `IDBKeyRange.bound(lower, upper)`, `IDBKeyRange.lowerBound(lower)`, `IDBKeyRange.upperBound(upper)`.
  2. Importar `./indexeddb-polyfill` en `src/test/setup.ts`.
  3. En `src/test/encrypted-storage.test.ts` y `src/test/audit-logger.test.ts`, reemplazar `import "fake-indexeddb/auto";` por `import "./indexeddb-polyfill";`.

---

### 🗄️ Fase `P0-F1`: Base de Datos — Enforcement MFA `aal2` (`NEW-04`), Fix `push_subscriptions` (`F2-A`) y RPC (`SEC-004`) (`CP-P0-01`)

#### `P0-F1.1` — Nueva migración `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql`
Crear el archivo `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql` con:

1. **Función `public.is_mfa_compliant()` (`NEW-04`):**
   ```sql
   CREATE OR REPLACE FUNCTION public.is_mfa_compliant()
   RETURNS boolean
   LANGUAGE sql
   SECURITY DEFINER
   SET search_path = ''
   STABLE
   AS $$
     SELECT CASE
       WHEN auth.uid() IS NULL THEN false
       WHEN EXISTS (
         SELECT 1
         FROM auth.mfa_factors mf
         WHERE mf.user_id = auth.uid()
           AND mf.status = 'verified'
       ) THEN COALESCE(auth.jwt()->>'aal', 'aal1') = 'aal2'
       ELSE true
     END;
   $$;

   REVOKE ALL ON FUNCTION public.is_mfa_compliant() FROM PUBLIC;
   GRANT EXECUTE ON FUNCTION public.is_mfa_compliant() TO authenticated, service_role;
   ```
2. **Políticas `AS RESTRICTIVE` en las 10 tablas `public` y `storage.objects` (`NEW-04`):**
   Para cada tabla `t` en `('accounts', 'debts', 'debt_payments', 'fixed_items', 'goal_folders', 'goals', 'push_subscriptions', 'transactions', 'user_sessions', 'user_settings')` y para `storage.objects`:
   ```sql
   DROP POLICY IF EXISTS "Require AAL2 when MFA enabled" ON public.<t>;
   CREATE POLICY "Require AAL2 when MFA enabled"
     ON public.<t>
     AS RESTRICTIVE
     FOR ALL
     TO authenticated
     USING (public.is_mfa_compliant())
     WITH CHECK (public.is_mfa_compliant());
   ```
   Y en `storage.objects`:
   ```sql
   DROP POLICY IF EXISTS "Require AAL2 when MFA enabled on objects" ON storage.objects;
   CREATE POLICY "Require AAL2 when MFA enabled on objects"
     ON storage.objects
     AS RESTRICTIVE
     FOR ALL
     TO authenticated
     USING (public.is_mfa_compliant())
     WITH CHECK (public.is_mfa_compliant());
   ```
3. **Corrección de la política `UPDATE` en `public.push_subscriptions` (`F2-A`):**
   ```sql
   DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
   CREATE POLICY "Users can update own push subscriptions"
     ON public.push_subscriptions
     FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id);
   ```
4. **Corrección de privilegios y guard en `public.cleanup_stale_sessions()` (`SEC-004` / `NEW-03`):**
   ```sql
   CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
   RETURNS integer
   LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = ''
   AS $$
   DECLARE
     deleted_count integer;
   BEGIN
     IF COALESCE( current_setting('request.jwt.claims', true)::jsonb->>'role', session_user ) <> 'service_role'
        AND session_user <> 'postgres' THEN
       RAISE EXCEPTION 'Access denied: service_role required';
     END IF;
     DELETE FROM public.user_sessions
     WHERE last_seen_at < NOW() - INTERVAL '2 minutes'
       AND created_at < NOW() - INTERVAL '2 minutes';
     GET DIAGNOSTICS deleted_count = ROW_COUNT;
     RETURN deleted_count;
   END;
   $$;

   REVOKE ALL ON FUNCTION public.cleanup_stale_sessions() FROM PUBLIC, anon, authenticated;
   GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions() TO service_role;
   ```
5. **Restricción de privilegios excesivos (`F2-C`):**
   - `REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;`
   - `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` (ya que ninguna tabla tiene políticas para `anon`).

#### `P0-F1.2` — Actualizar `supabase/schema.sql` y `supabase/schema_push_notifications.sql`
- Reflejar `public.is_mfa_compliant()`, las políticas `AS RESTRICTIVE`, la política `UPDATE` corregida de `push_subscriptions` (`USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`) y `cleanup_stale_sessions()` en `supabase/schema.sql` y `supabase/schema_push_notifications.sql`.

---

### 🔐 Fase `P0-F2`: OAuth PKCE, Validación Estricta de Redirect/Callback y Android Backup (`F8-A`, `SEC-012`, `NEW-06`) (`CP-P0-02`)

#### `P0-F2.1` — `src/lib/supabase.ts`
- Configurar explícitamente el cliente Supabase con `flowType: 'pkce'`:
  ```ts
  export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  ```

#### `P0-F2.2` — `src/pages/Login.tsx` y `src/pages/AuthCallback.tsx` (`SEC-012`)
- En `src/pages/Login.tsx`:
  - Endurecer `isValidRedirectUri(uri: string)`:
    1. Si `OAUTH_REDIRECT_ALLOWLIST.includes(uri)` → `true` (en producción excluir puertos de desarrollo si `!import.meta.env.DEV`).
    2. Si `parsed.protocol === 'https:' && parsed.hostname === 'financepal-web.vercel.app' && parsed.pathname === '/auth/callback'` → `true`.
    3. Eliminar el comodín `parsed.hostname.endsWith('.financepal.com')` sin validación de protocolo y eliminar el comodín `parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'` que aceptaba cualquier puerto y cualquier path. En desarrollo (`import.meta.env.DEV`), aceptar únicamente `^http:\/\/(localhost|127\.0\.0\.1):(5173|8080|3000)\/auth\/callback$`.
- En `src/pages/AuthCallback.tsx`:
  - Leer `URLSearchParams(window.location.search)` y `window.location.hash`:
    - Si existe `error_description` o `error`, mostrar un mensaje sanitizado y limpiar inmediatamente la URL con `window.history.replaceState({}, document.title, window.location.pathname)`.
    - Si existe `code` en query string y `getSession()` aún no lo ha canjeado, ejecutar `await supabase.auth.exchangeCodeForSession(code)` antes de redirigir a `'/'`, limpiando siempre la barra de direcciones con `window.history.replaceState({}, document.title, window.location.pathname)`.

#### `P0-F2.3` — `src/App.tsx` y `android/app/src/main/**` (`F8-A` y `NEW-06`)
- En `src/App.tsx` (líneas 383-409):
  - Eliminar por completo la rama de flujo implícito (`extractHashParams(url)`, `access_token`, `refresh_token`, `supabase.auth.setSession(...)`).
  - Aceptar **únicamente** el flujo PKCE (`const code = extractParamFromUrl(url, 'code')` → `await supabase.auth.exchangeCodeForSession(code)`), rechazando cualquier URL que contenga `access_token` o `refresh_token` en el fragmento o query.
- En `android/app/src/main/AndroidManifest.xml`:
  - Cambiar `android:allowBackup="true"` a `android:allowBackup="false"` y añadir:
    ```xml
    android:dataExtractionRules="@xml/data_extraction_rules"
    android:fullBackupContent="@xml/backup_rules"
    ```
  - Eliminar los permisos innecesarios `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` y `READ_MEDIA_IMAGES` (`F8-G`).
- Crear `android/app/src/main/res/xml/backup_rules.xml` y `android/app/src/main/res/xml/data_extraction_rules.xml` excluyendo `file`, `database`, `sharedpref`, `external` y `root` para garantizar que ni Auto Backup ni D2D extraigan `app_webview/` ni `files/`.

---

### 💾 Fase `P0-F3`: Criptografía Local (`SEC-002`/`NEW-01`) y Migración PBKDF2 100k→600k (`F4-F`) (`CP-P0-03`)

#### `P0-F3.1` y `P0-F3.2` — `src/lib/encrypted-storage.ts`
Rediseñar la gestión de claves y migración de iteraciones en `src/lib/encrypted-storage.ts` manteniendo 100% compatibilidad con las firmas públicas exportadas:

1. **Constantes de Almacenamiento Unificadas:**
   ```ts
   export const STORAGE_KEY = 'finance-pal-encrypted-v1';
   export const ALL_ENCRYPTED_STATE_KEYS = [
     'finance-pal-encrypted-v1',
     'migol-finanzas-v2',
     'finance-pal-sync-queue-encrypted',
   ] as const;
   ```
2. **Secreto Criptográfico Local en IndexedDB (`SEC-002` / `NEW-01`):**
   - Crear un almacén IndexedDB dedicado `finance-pal-keystore` (objectStore `keys`) donde se persista un pepper aleatorio de 256 bits (`device-pepper-v2`, 32 bytes generados con `crypto.getRandomValues(new Uint8Array(32))`).
   - En `getEncryptionSecret(mode: 'v2' | 'legacy' = 'v2')`:
     - En modo `'v2'`: combinar `${userId || 'anon'}:${pepperB64}` (de modo que el `user.id` público del JWT + el salt de `localStorage` **NO** bastan por sí solos para derivar la clave sin acceso al almacén `finance-pal-keystore`, y además dos usuarios distintos en el mismo dispositivo derivan claves distintas).
     - En modo `'legacy'`: usar el comportamiento anterior (`userId` o `localStorage.getItem('finance-pal-device-secret')`) únicamente como fallback de lectura en `decryptData()` para migrar sin pérdida los blobs existentes.
3. **Salt Aislado por Usuario y Corrección de `F4-F` (100k → 600k sin pérdida de datos):**
   - Función `getSaltKey(userId?: string)`: usa `${STORAGE_KEY}-salt:${userId}` cuando hay sesión (con lectura de fallback a `${STORAGE_KEY}-salt` si aún no se ha migrado).
   - **Prohibido sobrescribir `iterations: 600000` en `getMasterKey()` si el salt leído tenía `100,000` iteraciones (`F4-F`).** En su lugar:
     - Si `decryptData(encryptedB64)` detecta que el blob fue cifrado con parámetros legacy (100k iteraciones o clave `'legacy'` solo `user.id`), lo descifra con la clave legacy y marca que requiere re-cifrado con la clave `v2` (`600,000` iteraciones + pepper).
     - En `saveEncryptedState()` y `saveReceipt()`, siempre cifra con la clave activa `v2` (`600,000` iteraciones) y persiste el `SaltData` de `600,000` iteraciones en la clave de salt activa, garantizando que **nunca** exista desincronización entre el salt guardado y los ciphertexts.

---

### 🧹 Fase `P0-F4`: Purga Completa en `signOut()` y Sanitización del Audit Log (`SEC-015`, `F4-D`, `F10-B`) (`CP-P0-04`)

#### `P0-F4.1` — `src/lib/encrypted-storage.ts` y `src/lib/audit-logger.ts`
1. En `src/lib/encrypted-storage.ts`:
   - Añadir `export async function clearAllReceipts(): Promise<void>` que vacíe el objectStore `receipts` en `finance-pal-receipts`.
   - Añadir `export async function purgeAllEncryptedStorage(userId?: string): Promise<void>` que:
     1. Elimine de `localStorage` y de Capacitor `Directory.Data` todas las claves en `ALL_ENCRYPTED_STATE_KEYS` (`finance-pal-encrypted-v1`, `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`) más `finance-pal-sync-queue` y sus sufijos `-meta`.
     2. Ejecute `await clearAllReceipts()`.
     3. Elimine `${STORAGE_KEY}-salt` y, si se provee `userId`, `${STORAGE_KEY}-salt:${userId}`, tras haber borrado todos los blobs y recibos.
     4. Limpie `cryptoKey = null; keyPromise = null;`.
   - Actualizar `clearEncryptedState(key: string = STORAGE_KEY)` para que si se invoca sin argumentos (`clearEncryptedState()`), delegue a `purgeAllEncryptedStorage()`, mientras que si se invoca con un `key` específico (`clearEncryptedState('test-state')`), borre ese `key` y su `-meta` sin destruir el salt de otros blobs activos (`F4-D` resuelto).
2. En `src/lib/audit-logger.ts`:
   - Añadir `export function redactAuditDetails(details: Record<string, unknown>): Record<string, unknown>` que enmascare cualquier campo sensible (`email`, `newEmail`, `oldEmail`, `token`, `access_token`, `refresh_token`, `clabe`) antes de calcular el hash y guardar en IndexedDB (ej. `audit-a-private@financepal.local` → `au***@financepal.local`).
   - Añadir `export async function clearAuditLogs(userId?: string): Promise<void>` que elimine las entradas del usuario (o vacíe el objectStore `audit_log` si no se pasa `userId`).

#### `P0-F4.2` — `src/context/AuthContext.tsx` (`signOut()`)
- En `src/context/AuthContext.tsx` (`signOut`, líneas 70-105):
  1. Registrar `if (userId) { await audit.logout(userId, { reason: 'manual' }); }` **antes** de la purga.
  2. Resetear `useFinance` y `useSyncStore.getState().clearQueue()`.
  3. Invocar `await purgeAllEncryptedStorage(userId)` y `await clearAuditLogs()`.
  4. Rotar/eliminar `localStorage.removeItem('finance-pal-client-id')` y `localStorage.removeItem('finance-pal-device-id')` para impedir correlación cross-account entre el Usuario A y el Usuario B.
  5. Limpiar `sessionStorage.clear()` y `queryClient.clear()`.

---

### 🛡️ Fase `P0-F5`: Endurecimiento de Auth, Contraseñas (12+), Rate Limiting (`SEC-008`, `T11`) y Suite de Tests (`CP-P0-05`)

#### `P0-F5.1` — `src/pages/Login.tsx`, `src/pages/ajustes/secciones/PerfilSection.tsx`, `src/lib/rate-limiter.ts`
1. En `src/lib/rate-limiter.ts`:
   - Ajustar la configuración `'auth'` a `{ maxRequests: 5, windowMs: 60000, keyPrefix: 'auth' }` (5 intentos por minuto).
2. En `src/pages/Login.tsx`:
   - Importar `rateLimiter, getClientIdentifier` desde `@/lib/rate-limiter`.
   - En `handleSubmit`, `handleMfaSubmit` y `handleOAuth`: verificar `await rateLimiter.checkLimit(`${getClientIdentifier()}:${email.trim().toLowerCase() || 'oauth'}`, 'auth')`. Si `!limit.allowed`, mostrar `toast.error(\`Demasiados intentos. Espera ${limit.retryAfter ?? 60} segundos.\`)` y abortar.
   - En `calculatePasswordStrength(password)` y en la validación de registro (`!isLogin`): exigir **longitud mínima de 12 caracteres** (`password.length >= 12`, `ASVS V2.1.1`) y `strength.score >= 3`.
   - En los `catch (error)` de `handleSubmit`, `handleOAuth` y `handleMfaSubmit`: no exponer mensajes internos crudos del backend; mapear `Invalid login credentials` a `'Credenciales inválidas'` y usar mensajes genéricos seguros.
3. En `src/pages/ajustes/secciones/PerfilSection.tsx`:
   - Exigir longitud mínima de **12 caracteres** al actualizar contraseña (`newPassword.length < 12`).
   - Aplicar `rateLimiter.checkLimit(session.user.id, 'auth')` en cambio de email y cambio de contraseña.

#### `P0-F5.2` — `supabase/config.toml`
- Actualizar en `supabase/config.toml`:
  - `minimum_password_length = 12`
  - `password_requirements = "lower_upper_letters_digits_symbols"`
  - En `[auth.email]`: `enable_confirmations = true`, `secure_password_change = true`.
  -En `[auth.rate_limit]`: `sign_in_sign_ups = 10`, `token_verifications = 10`.

#### `P0-F5.3` — Suite de Pruebas de Regresión P0 y Actualización del Grafo
- Ampliar `src/test/encrypted-storage.test.ts` y `src/test/audit-logger.test.ts` con pruebas unitarias para:
  1. Migración de datos cifrados con `100,000` iteraciones a `600,000` iteraciones sin pérdida de descifrado (`F4-F`).
  2. `clearEncryptedState('single-key')` conserva el salt y permite seguir descifrando otras claves (`F4-D`).
  3. `purgeAllEncryptedStorage()` elimina `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, `finance-pal-encrypted-v1`, recibos en IndexedDB y el salt (`SEC-015` / `T13`).
  4. `logAudit` redacta `newEmail`/`email` en `details` y `clearAuditLogs()` vacía el almacén (`F10-B`).
- Ejecutar:
  - `npx tsc --noEmit` (debe terminar con **0 errores**).
  - `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts` (debe pasar al **100%**).
  - `npm run build` (debe compilar limpio).
  - `graphify update .` (para actualizar el grafo de conocimiento).

---

## 4. Criterios de Aceptación del Sprint P0 (`CA-P0-01` a `CA-P0-08`)

- **CA-P0-01 (`NEW-04`):** Con la migración `20261020220000_p0_mfa_aal2_and_push_rls.sql` cargada, la prueba `T09` confirma que un JWT `aal1` de un usuario con MFA `verified` recibe `0 rows` en `SELECT`/`UPDATE`/`DELETE` y `RLS 42501` en `INSERT`, mientras que con `aal2` funciona normalmente.
- **CA-P0-02 (`F2-A`):** La prueba `T06` confirma que `UPDATE public.push_subscriptions SET user_id = auth.uid()` sin `WHERE` solo afecta las filas propias (`rows = 1`) y `0` filas ajenas.
- **CA-P0-03 (`SEC-004`):** `has_function_privilege('authenticated', 'public.cleanup_stale_sessions()', 'EXECUTE')` devuelve `false`.
- **CA-P0-04 (`F8-A` / `SEC-012` / `NEW-06`):** `supabase.ts` usa `flowType: 'pkce'`, `App.tsx` ya no llama a `setSession` desde fragmentos de URL, `isValidRedirectUri` rechaza puertos/paths arbitrarios y `AndroidManifest.xml` define `allowBackup="false"` con reglas de exclusión.
- **CA-P0-05 (`SEC-002` / `F4-F`):** `encrypted-storage.ts` usa el pepper en IndexedDB (`finance-pal-keystore`) + `userId` y migra iteraciones `100k -> 600k` sin corromper blobs previos.
- **CA-P0-06 (`SEC-015` / `F4-D` / `F10-B`):** `signOut()` purga `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, `finance-pal-receipts` y `finance-pal-audit`, y `logAudit()` redacta emails en `details`.
- **CA-P0-07 (`SEC-008` / `T11`):** `Login.tsx` y `PerfilSection.tsx` aplican `rateLimiter` (`auth`, 5 req/min) y exigen contraseñas de $\ge 12$ caracteres.
- **CA-P0-08 (Calidad y Compilación):** `npx tsc --noEmit`, `npx vitest run src/test/encrypted-storage.test.ts src/test/audit-logger.test.ts` y `npm run build` pasan con 0 errores.
