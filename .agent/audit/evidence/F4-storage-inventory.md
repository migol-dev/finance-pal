# F4 — Inventario de Almacenamiento del Cliente y Limpieza de Sesión (`T13`)

> **Fase:** `F4` — Prioridad `P0`
> **Fecha:** `2026-10-20`
> **Niveles:** `N0` (revisión de código) + `N2` (intento de inventario dinámico)
> **Alcance:** `localStorage`, `sessionStorage`, IndexedDB, Cache Storage, cookies y Filesystem nativo (Capacitor).
> **Estado de `T13`:** `⚠️ ESCALADA (parcial)` — el inventario estático está completo; la comprobación dinámica **pre/post logout y cambio A→B** no se pudo ejecutar porque no existen las cuentas `audit-a`/`audit-b` (mismo bloqueo que `T06`, `T09` y `T12`).

---

## 0. Resumen

| Hallazgo | Severidad | Veredicto |
| :--- | :---: | :--- |
| `SEC-001` — Zustand en texto plano en `localStorage` | — | ✅ **CERRADO**: `setItem` elimina el texto plano y cifra; no hay fallback a plaintext. |
| `SEC-015` — Datos no borrados al cerrar sesión | **Alta** | ❌ **CONFIRMADO (agravado)**: el estado financiero, la cola de sync, los recibos y el audit log **no se borran**; además `clearEncryptedState()` elimina el salt compartido y deja ilegibles los blobs cifrados (pérdida de datos). |
| `SEC-018` — `profile.email` persistido en Zustand | **Media** | ❌ **CONFIRMADO**: se guarda cifrado en `migol-finanzas-v2`, se sincroniza a `user_settings.profile` (JSONB) y se exporta por defecto. |
| `F4-D` (nuevo) — Pérdida de recibos/estado tras logout | **Alta** (integridad/disponibilidad) | ❌ **CONFIRMADO (código)**: al borrar `finance-pal-encrypted-v1-salt`, la clave cambia y los ciphertexts de `migol-finanzas-v2` y de IndexedDB `finance-pal-receipts` ya no se pueden descifrar. |
| `F4-E` (nuevo) — Audit log global en texto plano | **Media** (privacidad) | ❌ **CONFIRMADO**: `finance-pal-audit` no se cifra ni se limpia; el siguiente usuario del mismo navegador puede leer `userId`, acciones y `details` (p. ej. `newEmail`). |

---

## 1. Mapa de almacenamiento

### 1.1 `localStorage`

| Clave | Contenido | Cifrado | ¿Se borra en `signOut()`? | Evidencia |
| :--- | :--- | :---: | :--- | :--- |
| `migol-finanzas-v2` | Estado Zustand completo: `accounts`, `transactions`, `goals`, `debts`, `fixedItems`, `changeLog`, `profile` (incl. `email`), `appSettings`, referencias `__receipt:*`. | AES-256-GCM (PBKDF2 600k) | ❌ **No** explícitamente. `clearEncryptedState()` usa la clave por defecto `finance-pal-encrypted-v1`, no `migol-finanzas-v2`. El estado se sobrescribe con arrays vacíos, pero el ciphertext puede quedar si la escritura falla o compite con el borrado del salt. | `finance-store.ts:293`, `:326-346`; `AuthContext.tsx:84-94` |
| `finance-pal-sync-queue-encrypted` | Cola de mutaciones pendientes (`payload` con datos financieros). | AES-256-GCM | ⚠️ **Parcial**: `useSyncStore.clearQueue()` la vacía y el persist escribe `[]`; no se borra la clave ni se llama `clearEncryptedState('finance-pal-sync-queue-encrypted')`. | `sync-store.ts:26-63`, `:88-91`; `AuthContext.tsx:93` |
| `finance-pal-encrypted-v1` | Caché de React Query (`QUERY_CACHE_KEY`) con resultados de consultas (posible PII/finanzas). | AES-256-GCM | ✅ **Sí**: `clearEncryptedState()` sin argumentos usa esta clave. | `App.tsx:39-67`; `encrypted-storage.ts:21`, `:245-261` |
| `finance-pal-encrypted-v1-salt` | `{salt: base64, iterations: 600000}`. **Metadato público**, no secreto. | — | ✅ **Sí** (se elimina), pero **rompe la clave** de todos los blobs cifrados con ese salt. | `encrypted-storage.ts:69-88`, `:253-257` |
| `finance-pal-device-secret` | Secreto aleatorio de 32 bytes (base64) usado solo si no hay sesión (`getDeviceSecret`). | — | ❌ **No** | `encrypted-storage.ts:43-60` |
| `sb-rjforcrdyfuodsqtopvp-auth-token` | Sesión Supabase: `access_token`, `refresh_token`, `user` (email, id, metadata). | ❌ **Texto plano** (comportamiento por defecto de supabase-js) | ✅ **Sí**: `_removeSession()` de auth-js borra la clave. | `SupabaseClient.ts` (storageKey `sb-${host}-auth-token`); `AuthContext.tsx:77` |
| `finance-pal-device-id` | UUID del dispositivo (`user_sessions.device_id`). | — | ❌ **No** | `useSessionManager.ts:9-20` |
| `finance-pal-client-id` | UUID para el rate limiter local. | — | ❌ **No** | `rate-limiter.ts:119-126` |
| `finance-pal-notif-delivery-log-v1` | Mapa `dedupeKey → timestamp` de notificaciones entregadas. | — | ❌ **No** | `notifications.ts:50`, `:95-118` |
| `finance-pal-version-check` | Última versión/timestamp comprobado. | — | ❌ **No** | `version-check.ts:17`, `:114-165` |
| `finance-pal-sync-disabled` | Flag `"true"` si el usuario desactivó sync. | — | ❌ **No** | `supabase.ts:14-27` |
| `finance-pal-migration-skipped` | Flag de migración. | — | ❌ **No** | `MigracionNube.tsx:48` |
| `sb-...-code-verifier` | Verificador PKCE (no se usa porque el flujo es implícito). | — | N/A | `supabase.ts:33` |

**Conclusión `SEC-001`:** el estado financiero **no** se escribe en texto plano:
- `setItem` hace `localStorage.removeItem(name)` antes de cifrar (`finance-store.ts:334`).
- Si `isEncryptionAvailable()` es falso, **no** hay fallback: registra error y no guarda (`:342-345`). Es una decisión *fail-closed* correcta.
- La migración lee el plaintext legacy y lo elimina inmediatamente (`:311-320`); lo mismo en `sync-store.ts:36-42`.

**Riesgo residual:** el token de sesión de Supabase y el `device-secret` sí están en texto plano. Cualquier XSS puede leer `sb-...-auth-token` y usar el `access_token`/`refresh_token`; el cifrado del estado no protege contra XSS mientras la sesión esté activa (ver `NEW-01`).

### 1.2 `sessionStorage`

- No se escribe ningún dato de la aplicación. `ErrorBoundary.tsx:102` hace `sessionStorage.clear()` como parte de la recuperación de errores.
- Supabase-js usa `localStorage` por defecto (`persistSession: true`), no `sessionStorage`.

**Veredicto:** sin residuos financieros; no requiere limpieza específica.

### 1.3 IndexedDB

| Base / store | Contenido | Cifrado | ¿Se borra en `signOut()`? |
| :--- | :--- | :---: | :--- |
| `finance-pal-receipts` / `receipts` | Data URLs de recibos (`data:image/...`), claves `tx:<uuid>` y `pay:<uuid>`. | AES-256-GCM (`saveReceipt` → `encryptData`) | ❌ **No**. `clearEncryptedState()` no toca IndexedDB. |
| `finance-pal-audit` / `audit_log` | Entradas de auditoría: `id`, `timestamp`, `userId`, `action`, `resource`, `resourceId`, `details` (incl. `newEmail`), `prevHash`, `hash`. | ❌ **Texto plano** | ❌ **No**. |

**Recibos:** `saveReceipt()` cifra antes de `put` (`encrypted-storage.ts:299-308`). `loadReceipt()` intenta descifrar y, si falla, acepta el formato legacy `data:` y lo re-cifra (`:312-358`). El contenido no queda en claro salvo recibos legacy no migrados.

**Audit log:** no se cifra; se guarda en claro con `userId` y `details`. No hay UI que lo muestre, pero cualquier script del origen (XSS) o el siguiente usuario con DevTools puede abrir la base. `emailChanged` guarda `{ newEmail }` (`PerfilSection.tsx:117`).

### 1.4 Cache Storage y cookies

- `public/sw.js` define `CACHE_VERSION = 'fp-v1.21.0'` y en `activate` borra caches con nombre distinto, pero **no** hace `cache.add`/`cache.put` de respuestas. No se cachean datos financieros ni respuestas de la API.
- No se usan cookies para sesión (Supabase usa `localStorage`); no hay `document.cookie` en `src/`.
- `signOut` no limpia Cache Storage, pero el impacto es bajo porque no contiene datos de la app.

### 1.5 Almacenamiento nativo (Capacitor)

- Estado cifrado: `Filesystem.writeFile({ path: key, directory: Directory.Data })` (`encrypted-storage.ts:184-193`). En Android, `Directory.Data` está dentro del sandbox de la app, pero `android:allowBackup="true"` (`AndroidManifest.xml:5`) permite copias de seguridad; ver `F8`/`NEW-06`.
- Recibos y audit log usan IndexedDB del WebView (mismo perfil que el navegador).
- `finance-pal-device-secret` y `sb-...-auth-token` viven en el `localStorage` del WebView.

---

## 2. `SEC-015` — Limpieza al cerrar sesión

`AuthContext.signOut()` (`AuthContext.tsx:70-105`) ejecuta, en orden:

1. `supabase.auth.signOut()` → borra `sb-...-auth-token` y revoca refresh tokens.
2. `useFinance.setState({ fixedItems: [], transactions: [], goals: [], debts: [], goalFolders: [], changeLog: [], accounts: [] })` → el persist escribe un estado vacío cifrado bajo `migol-finanzas-v2`.
3. `useSyncStore.getState().clearQueue()` → escribe `[]` bajo `finance-pal-sync-queue-encrypted`.
4. `await clearEncryptedState()` → **solo** borra `finance-pal-encrypted-v1` y `finance-pal-encrypted-v1-salt`, y resetea `cryptoKey`/`keyPromise`.
5. `queryClient.clear()`.

**Defectos:**

- **Clave equivocada:** el estado financiero vive en `migol-finanzas-v2`, pero `clearEncryptedState()` usa el default `finance-pal-encrypted-v1`. No se borra el blob financiero; solo se sobrescribe (si la escritura del paso 2 tiene éxito).
- **Salt compartido:** el salt se usa para **todas** las claves (`migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, `finance-pal-encrypted-v1`, recibos). Al borrarlo en el paso 4, los ciphertexts que no se hayan sobrescrito quedan indescifrables. En el siguiente login se genera un salt nuevo y una clave nueva.
- **IndexedDB intacta:** `finance-pal-receipts` y `finance-pal-audit` no se borran. El audit log queda en claro y es legible por el siguiente usuario.
- **Carrera:** `setState`/`clearQueue` son síncronos pero el `setItem` del persist es asíncrono; `clearEncryptedState` puede ejecutarse antes de que terminen las escrituras. Si `saveEncryptedState` corre después de borrar el salt, usa el `device-secret` (sin sesión) y deja un blob con una clave distinta; al volver a iniciar sesión no se puede descifrar.
- **`resetAll()`** (`finance-store.ts:279-290`) tiene el mismo problema: solo vacía Zustand y registra `audit.dataDeleted`; no borra IndexedDB, no borra el blob cifrado y no llama a Supabase.

**Veredicto `SEC-015`: ❌ CONFIRMADO (Alta).** No se cumple el borrado completo al cerrar sesión; además, el borrado del salt provoca pérdida de datos locales (recibos y estado no sincronizado).

---

## 3. `SEC-018` — `profile.email`

- `UserProfile` incluye `email?: string` (`finance.ts:576-581`).
- `ProfileForm` guarda `email` en el store (`PerfilSection.tsx:22-35`, `:356-360`).
- El estado completo se cifra en `migol-finanzas-v2` (no plaintext), pero:
  - se sincroniza a `user_settings.profile` (JSONB) en Supabase (`useFinanceData.ts:175-184`, `settings.service.ts:104-131`);
  - se exporta por defecto: `ALL_SCOPES.excludeEmail = false` (`finance-store.ts:71-75`) y `DatosSection.tsx` no ofrece toggle de PII; `sanitizeProfileForExport` solo elimina el email si `excludeEmail` es true (`sanitizers.ts:112-118`).
- El email ya está en `auth.users.email`; duplicarlo en `user_settings.profile` y en exportaciones amplía la superficie de PII sin necesidad funcional clara.

**Veredicto `SEC-018`: ❌ CONFIRMADO (Media, datos minimización).** Persistencia cifrada local + sincronización cloud + export por defecto.

---

## 4. Cambio de cuenta A→B (análisis estático)

Escenario: A cierra sesión y B inicia sesión en el mismo navegador.

| Artefacto | Estado tras A | ¿B puede acceder? | Riesgo |
| :--- | :--- | :--- | :--- |
| `migol-finanzas-v2` (A) | Ciphertext con salt viejo (si no se sobrescribió) | ❌ No (salt borrado → clave nueva). El dato queda como residuo cifrado irrecuperable. | Integridad/disponibilidad; residuo forense. |
| `finance-pal-sync-queue-encrypted` (A) | `[]` o ciphertext viejo | ❌ No si ciphertext viejo; el estado vacío se reescribe. | Bajo. |
| `finance-pal-receipts` (A) | Ciphertext con clave vieja; claves `tx:<uuid>` | ❌ No puede descifrar; los **keys** (UUIDs) son visibles. | Residuo; pérdida de recibos para A. |
| `finance-pal-audit` (A) | Entradas en **texto plano** | ✅ **Sí** (DevTools/script del origen); `queryAuditLogs()` sin `userId` las devuelve. | **Privacidad cross-account**. |
| `sb-...-auth-token` (A) | Borrado por `signOut` | ❌ No | Correcto. |
| Cache Storage | Sin datos | — | Bajo. |

**Conclusión A→B:** no hay fuga directa de datos financieros descifrables (la clave cambia), pero sí **residuo cifrado**, **pérdida de recibos** y **fuga del audit log en claro**. Si A no cierra sesión (cierra la pestaña), B que abra el navegador reanuda la sesión de A hasta que expire el refresh token; el timeout de 30 min es solo cliente.

---

## 5. Evidencia dinámica `T13`

**Estado:** `⚠️ ESCALADA`. No se ejecutó el inventario pre/post logout real porque:
- no hay una cuenta de prueba (`audit-a`) para iniciar sesión;
- crear usuarios en producción está fuera de alcance;
- el análisis estático cubre todas las claves y rutas de limpieza.

**Guion para `agy`:**

1. Provisionar `audit-a` y `audit-b` con datos ficticios (incluido un recibo y un email de perfil).
2. En el navegador, antes del logout, ejecutar:
   ```js
   Object.keys(localStorage).sort()
   indexedDB.databases().then(console.log)
   caches.keys().then(console.log)
   ```
3. Ejecutar `signOut()` desde la UI.
4. Repetir el inventario y comprobar que **no** quedan `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, `finance-pal-receipts` ni `finance-pal-audit` (o que están vacíos).
5. Iniciar sesión como B y comprobar que no puede leer datos de A y que el audit log no contiene entradas de A.
6. Documentar el resultado en este archivo.

---

## 6. Recomendaciones

1. **Unificar claves:** que `clearEncryptedState()` reciba y borre explícitamente `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, `finance-pal-encrypted-v1`, los recibos y el audit log; o usar un prefijo común y borrar por prefijo.
2. **No borrar el salt** en logout si se quieren conservar datos locales; si se rota, re-cifrar todos los blobs y recibos con la clave nueva antes de borrar el salt.
3. **Borrar IndexedDB** `finance-pal-receipts` y `finance-pal-audit` en logout (o particionar por `userId` y borrar la partición de A).
4. **Cifrar el audit log** o, como mínimo, no guardar `newEmail`/PII en `details`; añadir HMAC (ver `F4-crypto-and-auditlog.md`).
5. **Reducir PII:** no persistir `profile.email` si ya está en Auth; si se mantiene, excluirlo de exportaciones por defecto y documentarlo.
6. **Añadir una prueba E2E** de logout que verifique `localStorage`, IndexedDB y Cache Storage.

---

## 7. Referencias

- `src/store/finance-store.ts:279-290` (`resetAll`), `:292-353` (persist).
- `src/store/sync-store.ts:26-91`.
- `src/lib/encrypted-storage.ts:21-125`, `:245-261`, `:282-452`.
- `src/context/AuthContext.tsx:70-105`.
- `src/App.tsx:39-67`.
- `src/lib/audit-logger.ts:49-52`, `:110-137`, `:190-233`.
- `src/hooks/useFinanceData.ts:155-184`; `src/services/settings.service.ts:104-131`.
- `src/pages/ajustes/secciones/PerfilSection.tsx:22-35`, `:108-132`.
- `src/pages/ajustes/secciones/DatosSection.tsx` (export/import).
- `public/sw.js:1-20`; `android/app/src/main/AndroidManifest.xml:5`.
- `F3-auth-mfa-sessions.md` §4.4 (`signOut` scope) y §4.5 (borrado de cuenta).
