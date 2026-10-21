# F10 — Privacidad, Logging y Manejo de Errores (`T25`, `SEC-019`)

> **Fase:** `F10` — Prioridad `P2`
> **Fecha:** `2026-10-20`
> **Nivel:** `N0` (inventario estático de `src/`, `public/sw.js` y bundle de producción)
> **Alcance:** 92 sentencias `console.*` en `src/` (sin tests), 7 llamadas a `logger.*`, `src/lib/app-error.ts`, `src/components/ErrorBoundary.tsx`, `src/lib/web-vitals.ts`, `src/lib/audit-logger.ts`, `src/lib/supabase-storage.ts`, `src/store/finance-store.ts` (`exportData`/`importData`), `src/services/*` y configuración de build (`vite.config.ts`).
> **Estado:** `T25` **PARCIAL**. `SEC-019` **PARCIAL**: no hay email/montos explícitos en logs, pero sí `clientId`, UUIDs y errores crudos; `drop_console` no elimina 8 referencias `.catch(console.*)` del bundle. Se identifican brechas de privacidad/erasure (`F10-A`…`F10-D`).

---

## 0. Resumen

| Hallazgo | Severidad | Veredicto |
| :--- | :---: | :--- |
| `SEC-019` — `userId`/`clientId`/PII en logs de consola | **Baja/Media** | ⚠️ **PARCIAL**: 92 `console.*` + 7 `logger.*`; no se encontraron `email`, montos ni `userId` explícitos, pero `sync-engine` registra `clientId` (UUID de dispositivo) y varios `catch(console.error)` registran errores crudos de Supabase. `drop_console` deja 8 referencias en `dist/assets/*.js` (`.catch(console.error/warn)` no se eliminan). |
| `F10-A` (nuevo) — `excludePII` no excluye PII financiera real | **Media** (CVSS 5.0) | ❌ **CONFIRMADO**: `excludePII` solo mapea a `excludeBankDetails`/`excludeEmail`/`excludeReceipts`; no elimina descripciones, conceptos, montos, metas, deudas ni `changeLog`. La UI de exportación no expone los flags; el export por defecto incluye email (`SEC-018`). |
| `F10-B` — Audit log local con PII y sin retención/borrado | **Baja** (CVSS 3.3) | ❌ **CONFIRMADO**: IndexedDB `finance-pal-audit` guarda `userId`, acciones y `details` (incl. `newEmail`) en claro; hasta 10 000 entradas; no se limpia en logout ni hay UI de purga/exportación. |
| `F10-C` — `sanitizeForLog` no redacta secretos/URLs | **Baja** | ❌ **CONFIRMADO**: `sanitizeForLog` solo hace `JSON.stringify` + truncado a 200 caracteres; no enmascara `token`, `signedUrl`, `email` ni `userId`. Se usa en errores de Storage (`supabase-storage.ts:144,150,178,193,198`). |
| `F10-D` — Sin borrado de cuenta/erasure en nube | **Media (cumplimiento)** | ❌ **CONFIRMADO**: no hay `deleteUser`/RPC de borrado total; `resetAll` solo limpia el store local; `signOut` no limpia IndexedDB de audit/recibos (`SEC-015`). No se puede ejercer cancelación/erasure completo desde la app. |
| `F10-E` — Transferencias a terceros y transparencia | **Baja/Info** | ⚠️ Google Fonts (IP/UA), GitHub API (versión), Supabase y hosting reciben datos; no hay pantalla de aviso de privacidad ni consentimiento. No hay analytics publicitario ni Sentry. |
| `F10-F` — `web-vitals`/`ErrorBoundary` sin telemetría remota | **Info (positivo)** | ✅ `web-vitals` solo hace `console.info` local; `ErrorBoundary` no envía a Sentry/LogRocket (código comentado). No hay fuga a terceros por telemetría. |

**Resultado de pruebas:** `T25` ⚠️ **PARCIAL**. `SEC-019` ⚠️ **PARCIAL**.

---

## 1. Método

```bash
# Inventario (excluye tests)
rg -n "console\.(log|error|warn|debug|info|trace)" src \
  --glob '!**/*.test.*' --glob '!**/__tests__/**' --glob '!src/test/**'
# → 92 sentencias

rg -n "logger\.(debug|info|warn|error|appError)|handleError\(" src \
  --glob '!**/*.test.*' --glob '!src/test/**'
# → 7 llamadas

# Bundle de producción (build F1)
rg -o "console\.(log|error|warn|info|debug)" dist/assets/*.js | wc -l
# → 8 referencias en 5 chunks

# Configuración de minificación
rg -n "drop_console|drop_debugger|sourcemap" vite.config.ts
```

No se ejecutó la app ni se enviaron datos a terceros. No se leyeron `.env*`. No se modificó `src/**`.

---

## 2. Inventario de logging (`SEC-019`)

### 2.1 Distribución por archivo

| Archivo | `console.*` | `logger.*` | Riesgo | Notas |
| :--- | ---: | ---: | :--- | :--- |
| `src/lib/supabase-storage.ts` | 16 | 0 | ⚠️ Medio | Errores de upload/delete/signed URL; `sanitizeForLog` no redacta. |
| `src/lib/notifications.ts` | 13 | 0 | Bajo | Errores de permisos/scheduling; `notif.id` (UUID), no título/monto. |
| `src/lib/encrypted-storage.ts` | 10 | 0 | Bajo | `key` de recibo, errores de cifrado; no contenido. |
| `src/store/finance-store.ts` | 8 | 0 | Bajo | `f.id` (UUID), `err` de Supabase; migración warnings. |
| `src/App.tsx` | 6 | 0 | Bajo | Errores de auth/sync; `error.message`. |
| `src/lib/web-push.ts` | 5 | 0 | Bajo | Errores de suscripción; posible endpoint en `error`. |
| `src/hooks/useSessionManager.ts` | 4 | 0 | Bajo | Takeover/sync; no `deviceName`. |
| `src/components/app/DataConflictDialog.tsx` | 4 | 0 | Bajo | Errores de descarga; no payload. |
| `src/lib/app-error.ts` | 3 | 0 | ⚠️ Medio | `logger` imprime `context` arbitrario. |
| `src/lib/sync-engine.ts` | 0 | 3 | ⚠️ Medio | `clientId` (UUID de dispositivo) y `{ error }`. |
| `src/context/AuthContext.tsx` | 1 | 3 | Bajo | `{ error: e }` de GoTrue. |
| `src/hooks/useNotificationScheduler.ts` | 3 | 0 | Bajo | Errores de scheduling. |
| `src/components/app/NotificationPermissionPrompt.tsx` | 2 | 0 | Bajo | Permisos. |
| `src/pages/ajustes/secciones/NotificacionesSection.tsx` | 2 | 0 | Bajo | Permisos. |
| `src/hooks/useFinanceData.ts` | 2 | 0 | Bajo | `f.id` + `err`. |
| `src/lib/web-vitals.ts` | 1 | 0 | Bajo | Métricas (nombre/valor/delta/id), sin usuario. |
| `src/main.tsx` | 1 | 0 | Bajo | “Update available”. |
| `src/lib/version-check.ts` | 1 | 0 | Bajo | Error de red. |
| `src/lib/migration.ts` | 1 | 0 | Bajo | Error de migración. |
| `src/lib/audit-logger.ts` | 1 | 0 | Bajo | Error al escribir IndexedDB. |
| `src/components/ErrorBoundary.tsx` | 1 | 0 | ⚠️ Medio | `error` + `errorInfo` (stack de componentes). |
| `src/pages/NotFound.tsx` | 1 | 0 | Bajo | `location.pathname` (ruta). |
| `src/pages/Login.tsx` | 1 | 0 | Bajo | `.catch(console.error)` de MFA. |
| `src/pages/ajustes/secciones/PerfilSection.tsx` | 1 | 0 | Bajo | Error de estado MFA. |
| `src/store/sync-store.ts` | 1 | 0 | Bajo | Error de guardado cifrado. |
| `src/components/app/IconPicker.tsx` | 1 | 0 | Bajo | Error de recorte de imagen. |
| `src/components/app/useUpdateToast.ts` | 1 | 0 | Bajo | Error de versión. |
| `src/components/app/UpdateNotification.tsx` | 1 | 0 | Bajo | Error de versión. |
| **Total** | **92** | **7** | — | — |

### 2.2 ¿Hay PII explícita?

Búsqueda dirigida sobre las inmediaciones de cada `console.*` por `email|correo|monto|amount|userId|clientId|device|profile|transaction|account|debt|goal|receipt|signed|token`:

- **No** se encontró `email`, `correo`, `monto`, `amount` ni `userId` en argumentos de `console.*`.
- **Sí** se encontró `clientId` en `src/lib/sync-engine.ts:84`:

```ts
logger.warn('Sync rate limited, retry after: ' + rateLimitResult.retryAfter, { clientId });
```

`clientId` es un UUID persistente de dispositivo (`getClientIdentifier()`), considerado dato personal pseudónimo en GDPR/LFPDPPP. Se imprime en `logger.warn` → `console.warn` (`app-error.ts:170-174`), aunque en producción la llamada directa a `console.warn` se elimina por `drop_console`.

- `finance-store.ts:108` y `useFinanceData.ts:249,253` incluyen `f.id` (UUID de concepto fijo) y `err`; no montos.
- `encrypted-storage.ts:334,489` incluyen `key` (ruta de recibo, p. ej. `receipts/<uuid>`); no imagen ni base64.
- `ErrorBoundary.tsx:28` incluye `errorInfo.componentStack`: nombres de componentes y trazas, no props/estado; puede incluir mensajes de error con datos si un componente los lanza.
- `supabase-storage.ts` usa `sanitizeForLog`, que **no** redacta: `JSON.stringify` + truncado (`src/lib/supabase-storage.ts:203-211`). Un error de Storage podría incluir `path` con `userId`, nombre de archivo o una URL firmada; no se observó un `signedUrl` en los errores capturados, pero el sanitizador no lo garantiza.
- `app-error.ts` `logger.*` acepta `context?: Record<string, unknown>`; los llamadores actuales pasan `{ error }` y `{ clientId }`, no email/montos. Si en el futuro se pasa `profile` o `transaction`, se imprimiría sin filtro.

### 2.3 Producción: `drop_console` no elimina todo

`vite.config.ts:37-43`:

```ts
build: {
  minify: "terser",
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  },
}
```

Esto elimina las **llamadas** `console.log(...)`, pero no las **referencias** a la función, como `.catch(console.error)` o `.catch(console.warn)`. En el bundle de producción quedan **8 referencias** en 5 chunks:

| Chunk | Refs | Origen |
| :--- | ---: | :--- |
| `dist/assets/finance-store-DirJUdk4.js` | 2 | `exportData(...).catch(console.error)`, `resetAll(...).catch(console.error)` |
| `dist/assets/Login-CySxlWOm.js` | 1 | `.catch(console.error)` del estado MFA |
| `dist/assets/Ajustes--NZtBOU1.js` | 1 | `cancelAllLocalNotifications().catch(console.warn)` |
| `dist/assets/index-CdnLva7f.js` | 2 | `subscribeToWebPush().catch(console.warn)` (2 rutas) |
| `dist/assets/vendor-ChEgrCWr.js` | 2 | runtime de Capacitor/GoTrue (`console.error`/`console.log`) |

Estas referencias pueden imprimir el objeto de error crudo en la consola del WebView. En Android release, la consola no es visible sin `adb logcat`/debugging, pero sigue siendo una fuga local y contradice la expectativa de “cero logs en producción”. **Recomendación:** sustituir `.catch(console.error)` por un handler que use `showUserError`/`logger` con redacción, o `catch(() => {})` si no se va a registrar; añadir `pure_funcs`/regla ESLint `no-console` y verificar el bundle en CI.

### 2.4 Veredicto `SEC-019`

⚠️ **PARCIAL**:

- No hay PII financiera explícita (email/montos) en los logs revisados.
- Sí hay un identificador persistente (`clientId`), UUIDs de entidades y errores crudos de Supabase.
- `drop_console` reduce la exposición en producción, pero deja 8 referencias `.catch(console.*)`.
- El audit log local (no consola) sí contiene PII y no se limpia (`F10-B`).

---

## 3. `app-error.ts`, `ErrorBoundary` y `web-vitals`

### 3.1 `src/lib/app-error.ts`

- `AppError` incluye `context`, `originalError`, `timestamp`; `toJSON()` **no** incluye `originalError` (correcto), pero `logger.appError` pasa `{ ...error.context, severity }` a `addLog`.
- `logger` mantiene un buffer **en memoria** de 200 entradas (`MAX_LOG_ENTRIES=200`); no persiste en localStorage/IndexedDB ni envía a red. `getLogs()` no tiene llamantes en `src/`.
- `addLog` imprime `context` sin redacción; en producción `console` se elimina (salvo referencias), pero el buffer en memoria podría exponerse vía XSS/devtools. No se encontró una ruta que lo exponga.
- `handleError` se usa una vez (`App.tsx:201`, contexto `'Auto-download'`), sin datos.

**Veredicto:** aceptable si se mantiene en memoria y no se conecta a un endpoint; añadir redacción de claves sensibles (`email`, `token`, `authorization`, `apikey`, `signedUrl`) antes de cualquier envío futuro.

### 3.2 `src/components/ErrorBoundary.tsx`

- `componentDidCatch` hace `console.error('ErrorBoundary caught an error:', error, errorInfo)`.
- El bloque de Sentry/LogRocket está **comentado** (`ErrorBoundary.tsx:31-34`); no hay `Sentry.captureException` activo.
- `errorInfo.componentStack` puede revelar la estructura de la UI, no datos financieros; el `error.message` podría contener PII si un componente lo incluye.
- El fallback muestra un mensaje genérico y reinicia; no expone el error al usuario.

**Veredicto:** sin telemetría remota (positivo). En producción la llamada `console.error(...)` se elimina; no se persiste.

### 3.3 `src/lib/web-vitals.ts`

```ts
function send(metric: Metric) {
  console.info('[web-vitals]', metric.name, metric.value, metric.delta, metric.id);
}
```

- Solo `console.info`; no hay `fetch`/`sendBeacon` a un endpoint. El comentario sugiere reemplazarlo por un POST, pero no está implementado.
- `main.tsx:11-14` lo inicializa solo en `import.meta.env.PROD`.
- Métricas: CLS, INP, LCP, FCP, TTFB; `metric.id` es un ID aleatorio por carga, no el usuario. No es PII, pero puede correlacionarse con sesión si se enviara a un backend.
- **Veredicto:** ✅ sin fuga a terceros. Si se habilita un endpoint, aplicar consentimiento, retención y anonimización.

---

## 4. Exportación, `excludePII` y erasure

### 4.1 `exportData` (`src/store/finance-store.ts:112-153`)

`ALL_SCOPES` (`finance-store.ts:71-75`):

```ts
export const ALL_SCOPES: Required<ExportScopes> = {
  fixedItems: true, transactions: true, goals: true, goalFolders: true, debts: true,
  changeLog: true, theme: true, profile: true, accounts: true,
  excludePII: false, excludeBankDetails: false, excludeEmail: false, excludeReceipts: false,
};
```

`piiOpts` (`finance-store.ts:117-122`):

```ts
const piiOpts = {
  excludeBankDetails: sc.excludeBankDetails ?? sc.excludePII,
  excludeEmail: sc.excludeEmail ?? sc.excludePII,
  excludeReceipts: sc.excludeReceipts ?? sc.excludePII,
};
```

`excludePII` **solo** se propaga a:
- `sanitizeAccountForExport` → elimina `clabe`, `bank`, `holderName`.
- `sanitizeProfileForExport` → elimina `email`.
- `sanitizeTransactionForExport` → elimina `receipt` y `externalPayee`.

No elimina:
- `transactions` con `amount`, `note`, `description`, `category`, `date`, `accountId`;
- `fixedItems` (concepto, monto, frecuencia);
- `goals`/`goalFolders` (nombre, objetivo, aportes);
- `debts`/`payments` (persona, monto, abonos);
- `changeLog` (descripciones de cambios, que pueden incluir montos/nombres);
- `profile.name`, `profile.avatar`;
- `accounts.name`, `initialBalance`.

**Conclusión:** `excludePII=true` no convierte el export en anónimo; sigue siendo un extracto financiero completo. El nombre es engañoso y puede inducir a compartir datos sensibles. Además, la UI `ScopePicker` (`DatosSection.tsx:32-95`) solo muestra las claves de `SCOPE_LABELS` (cuentas, fijos, movimientos, metas, deudas, historial, perfil, tema); **no** expone `excludePII`/`excludeEmail`/`excludeReceipts`, que quedan en `false`. El export por defecto incluye email (`SEC-018`).

**Recomendación (P1/P2):**
1. Renombrar `excludePII` a `excludeBankDetails` o implementar una anonimización real (eliminar/redondear montos, quitar notas/fechas, seudonimizar IDs).
2. Exponer toggles “Incluir email”, “Incluir datos bancarios”, “Incluir recibos” en `ScopePicker`.
3. Añadir un aviso claro de que el JSON contiene datos financieros sensibles y no cifrados.
4. Para exportaciones de portabilidad, incluir audit log/recibos si el usuario los solicita; documentar qué queda fuera (datos solo en nube).

**Vector CVSS 3.1:** `AV:L/AC:L/PR:L/UI:R/S:U/C:H/I:N/A:N` → **5.0 (Media)**.
(Requiere acceso al archivo exportado o que el usuario lo comparta; el impacto es confidencialidad alta.)

### 4.2 `importData` y validación

- `importData` (`finance-store.ts:154-...`) hace `JSON.parse` sin límite de tamaño en el store; la UI limita a 20 MB (`DatosSection.tsx:242-245`) — `SEC-020`/`F5-A`.
- No usa los esquemas Zod estrictos (`validators.ts`) para validar entidades; un JSON manipulado puede introducir campos/valores no esperados. No se observó prototype pollution global (`F5`), pero la falta de validación agrava la integridad del export/import.
- `importData` no incluye auditoría de qué datos se importaron más allá de `scopes` (`audit.dataImported`), no del contenido.

### 4.3 Erasure / cancelación

- **No existe** una función `deleteUser`, `auth.admin.deleteUser`, RPC `delete_user` ni endpoint de borrado total en `src/**` o `supabase/**` (búsqueda `deleteUser|delete_user|admin.delete|rpc(...delete)` sin resultados).
- `useFinance.getState().resetAll()` (`finance-store.ts:281-288`) solo reinicia el store local (`fixedItems`, `transactions`, `goals`, `debts`, `changeLog`, settings); **no** borra:
  - las tablas de Supabase (`accounts`, `transactions`, `debts`, `goals`, `fixed_items`, `debt_payments`, `user_settings`, `user_sessions`, `push_subscriptions`);
  - el bucket `receipts`;
  - IndexedDB `finance-pal-audit`/`finance-pal-receipts`;
  - `localStorage` (sesión, salt, device-secret).
- `signOut` (`AuthContext.tsx:97-105`) resetea el store Zustand, vacía la cola de sync y llama a `clearEncryptedState()`/`supabase.auth.signOut`, pero **no** borra IndexedDB `finance-pal-audit`/`finance-pal-receipts` ni el audit log; además `clearEncryptedState()` elimina el salt compartido, dejando recibos/estado previos indescifrables (`SEC-015`).
- No hay UI de “Eliminar mi cuenta” ni flujo de solicitud de cancelación; el usuario solo puede borrar cuentas financieras/transacciones individuales.
- **Consecuencia:** no se puede ejercer el derecho de cancelación/erasure (LFPDPPP) ni el artículo 17 GDPR desde la app; los datos permanecen en Supabase hasta una intervención manual del operador. Esto es una brecha de cumplimiento, no explotable por un atacante, pero relevante para la auditoría.

**Recomendación (P1):**
1. Implementar una Edge Function/RPC `delete-account` con `service_role` que borre Storage + tablas + `auth.users` (o un proceso manual documentado con SLA).
2. Añadir confirmación fuerte (reautenticación/MFA) y auditoría.
3. Limpiar `localStorage`/IndexedDB/Filesystem al completar.
4. Documentar retención y base legal; ofrecer exportación antes del borrado.

---

## 5. Audit log local (`F10-B`)

`src/lib/audit-logger.ts`:

- `AuditEntry` contiene `userId`, `action`, `resource`, `resourceId`, `details`, `prevHash`, `hash`.
- `details` puede incluir `newEmail` (`PerfilSection.tsx:117` → `audit.emailChanged(session.user.id, { newEmail })`), `scopes` de export/import, `enabled` de sync, `reason` de logout, `provider` de login.
- Se guarda en IndexedDB `finance-pal-audit`, store `audit_log`, **sin cifrar**; `MAX_AUDIT_ENTRIES=10000`.
- No hay función `clearAuditLog`/`deleteAuditLog` ni UI de purga; `queryAuditLogs` solo lee.
- No se limpia en `signOut` (`SEC-015`); el `userId` y el `newEmail` quedan tras cambiar de cuenta.
- El hash-chain SHA-256 es tamper-evident solo localmente y sin HMAC (`SEC-009`); un atacante con acceso al IndexedDB puede reescribir la cadena.

**Veredicto:** ❌ PII local persistente sin retención/borrado. **Recomendación:** cifrar el audit log con la misma clave del estado (o una clave separada), añadir “Exportar/Borrar historial” en Ajustes, limitar retención (p. ej. 90 días/1000 entradas) y no almacenar `newEmail` en claro (guardar hash o solo el hecho del cambio).

**Vector CVSS 3.1:** `AV:L/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` → **3.3 (Baja)**.

---

## 6. Matriz de privacidad (LFPDPPP / GDPR)

> Esta matriz es técnica y no constituye asesoría legal. La app parece ser de uso personal/consumer; no se encontró aviso de privacidad ni consentimiento.

| Categoría | Datos | Local | Nube / terceros | Retención | Consentimiento / base | Derechos |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Identidad** | `profile.email`, `name`, `avatar`, `user.id` | Zustand cifrado + `localStorage` (sesión); avatar puede ser data URL | Supabase Auth (`auth.users`) y `user_settings.profile` JSONB (email/nombre/avatar) | Hasta borrado manual; sin política | No hay aviso/consentimiento explícito; ejecución del contrato | Acceso/portabilidad vía export (email incluido por defecto); rectificación vía perfil; cancelación no implementada |
| **Financieros** | Cuentas (nombre, CLABE, banco, titular, saldo), transacciones (monto, nota, categoría, fecha, cuenta, receptor), deudas, metas, fijos, changeLog | Estado cifrado AES-GCM en `Directory.Data`/`localStorage`; changeLog en claro dentro del estado cifrado | Tablas Supabase (`accounts`, `transactions`, `debts`, `goals`, `fixed_items`, `debt_payments`); `user_settings` | Indefinida; sin TTL; `cleanup_stale_sessions` no aplica | Ejecución del contrato; no hay consentimiento granular | Export JSON (parcial); borrado por entidad; erasure total no |
| **Recibos** | Imágenes/comprobantes (data URL o archivo), `receipt_url` | `Directory.Data/receipts/**`, IndexedDB, estado | Bucket `receipts` (privado, signed URLs 1 h) | Indefinida; limpieza solo de huérfanos | Ejecución del contrato | Incluidos en export si `excludeReceipts=false`; borrado individual; no hay borrado masivo claro |
| **Auth/sesión** | JWT, refresh token, `deviceId`, `deviceName`, user agent, IP | `localStorage` (`sb-...-auth-token`), `user_sessions` en nube | Supabase Auth/PostgREST; logs de hosting (Netlify/Vercel) y Supabase | Refresh 1 h, rotación; `sessions_timebox=0`, `inactivity=0`; filas `user_sessions` hasta limpieza | Ejecución del contrato | Logout local; no revoca todos los dispositivos; filas residuales |
| **Audit log** | `userId`, acción, recurso, `details` (incl. `newEmail`), hash | IndexedDB `finance-pal-audit` **sin cifrar** | No se sincroniza | 10 000 entradas; sin TTL; no se borra en logout | Interés legítimo/seguridad; sin aviso | No hay UI de acceso/export/borrado; `queryAuditLogs` solo interno |
| **Push** | Endpoint, claves `p256dh`/`auth`, `user_id`, preferencias | `localStorage`/estado | `push_subscriptions`, Edge Function, servicio push del navegador (FCM/APNs/Mozilla) | Hasta unsubscribe; nativo no funcional (`F8-E`) | Consentimiento vía permiso del navegador | Desuscribir en Ajustes; el endpoint queda si falla la baja |
| **Telemetría** | Web Vitals (CLS/INP/LCP/FCP/TTFB), `metric.id` | Solo consola; no persistencia | ❌ Ninguno (no Sentry/LogRocket) | N/A | N/A | N/A |
| **Preferencias** | Tema, notificaciones, accesibilidad, `hideAmounts` | Estado cifrado | `user_settings` (theme, notification_prefs, accent, compact, glass) | Indefinida | Ejecución del contrato | Edición en Ajustes; export incluye theme |
| **Backups** | JSON completo, backup Android | `Directory.Cache` (export), `files/` + `app_webview/` (Auto Backup) | Google Drive/D2D si `allowBackup=true` (`NEW-06`) | Depende del usuario/Google; sin reglas | Consentimiento del SO para backup | El usuario puede borrar el archivo; no hay control granular |
| **Terceros** | IP/UA en solicitudes | — | Google Fonts (`fonts.googleapis.com`/`gstatic`), GitHub API (`api.github.com`), Supabase, Netlify/Vercel | Logs del proveedor según su política | No hay aviso in-app; fuentes sin SRI (`F7-B`) | No hay opt-out de fuentes/versión; sync se puede desactivar |

### 6.1 Derechos ARCO / GDPR

| Derecho | Estado | Evidencia |
| :--- | :--- | :--- |
| **Acceso** | ⚠️ Parcial | Export JSON de entidades; no incluye audit log ni todos los datos solo-cloud; no hay panel de “mis datos”. |
| **Rectificación** | ✅ Parcial | Edición de perfil/cuentas/transacciones; email vía Auth; no hay corrección masiva. |
| **Cancelación/Erasure** | ❌ No | Sin borrado de cuenta/cloud; `resetAll` local; `signOut` deja residuos (`F10-D`, `SEC-015`). |
| **Oposición/Restricción** | ⚠️ Parcial | Sync on/off; no hay consentimiento granular de fuentes/versión; no analytics. |
| **Portabilidad** | ⚠️ Parcial | JSON versionado; excluye audit log, claves de cifrado y posiblemente recibos cloud; `excludePII` engañoso. |
| **Limitación de conservación** | ❌ No | Sin TTL local/cloud; audit 10k; sesiones sin timeout; backup sin reglas. |
| **Seguridad** | ⚠️ Parcial | TLS, RLS, AES-GCM local; clave derivada de `user.id` (`SEC-002`), backup (`NEW-06`), logs (`SEC-019`). |
| **Transparencia** | ⚠️ Parcial | README técnico; no aviso de privacidad in-app; terceros no listados. |

---

## 7. Mapeo a pruebas y checklist

| Prueba / Hallazgo | Resultado | Detalle |
| :--- | :---: | :--- |
| `T25` PII en logs de consola | ⚠️ **PARCIAL** | 92 `console.*` + 7 `logger.*`; sin email/montos; `clientId` + UUIDs + errores crudos; 8 refs en bundle. |
| `SEC-019` | ⚠️ **PARCIAL** | Igual que `T25`; `drop_console` no elimina `.catch(console.*)`; audit log local con PII (`F10-B`). |
| `F10-A` | ❌ **CONFIRMADO (Media)** | `excludePII` no anonimiza montos/descripciones; UI no expone flags; email por defecto. |
| `F10-B` | ❌ **CONFIRMADO (Baja)** | Audit log IndexedDB claro, 10k, sin purga, `newEmail`. |
| `F10-C` | ❌ **CONFIRMADO (Baja)** | `sanitizeForLog` solo trunca; no redacta tokens/URLs. |
| `F10-D` | ❌ **CONFIRMADO (Media, cumplimiento)** | Sin borrado de cuenta/cloud; `resetAll` local. |
| `F10-E` | ⚠️ **CONFIRMADO (Baja/Info)** | Google Fonts/GitHub/Supabase/hosting; sin aviso in-app. |
| `F10-F` | ✅ **SEGURO** | `web-vitals` y `ErrorBoundary` sin telemetría remota. |

---

## 8. Recomendaciones priorizadas

| Prioridad | Acción | Hallazgo | Esfuerzo |
| :--- | :--- | :--- | :---: |
| **P1** | Implementar borrado de cuenta/cloud (Edge Function/RPC + Storage + `auth.users`) con reautenticación y auditoría | `F10-D` | M |
| **P1** | Rediseñar export: toggles de email/bancos/recibos, aviso de datos sensibles, anonimización real o renombrar `excludePII` | `F10-A`/`SEC-018` | M |
| **P2** | Cifrar/purgar audit log; no guardar `newEmail` en claro; retención y UI de borrado | `F10-B` | M |
| **P2** | Redactar `sanitizeForLog` (tokens/URLs/email/userId) y usarlo en todos los errores | `F10-C`/`SEC-019` | S |
| **P2** | Eliminar `.catch(console.*)` o usar un handler redactado; `no-console`/`pure_funcs`; verificar bundle en CI | `SEC-019` | S |
| **P3** | Añadir aviso de privacidad in-app y lista de terceros (Google Fonts, GitHub, Supabase, hosting) | `F10-E` | S |
| **P3** | Incluir audit log/recibos en export de portabilidad y documentar qué falta | `F10-A`/ARCO | S |
| **P3** | Evaluar consentimiento para backup Android y telemetría futura | `NEW-06`/`F10-F` | S |

---

## 9. Limitaciones

- **Solo estático.** No se ejecutó la app ni se inspeccionó la consola de un dispositivo; la afirmación sobre `drop_console` se basa en el bundle `dist/` del build F1 y en la configuración de Vite.
- **`dist/` puede estar desactualizado** respecto al árbol de trabajo; se usó solo para verificar el efecto de `drop_console`, no como fuente de lógica.
- **No se probó el flujo de borrado** (no existe) ni la retención real de Supabase/Netlify/Vercel; las políticas de logs de los proveedores no están en el repo.
- **No se leyó `.env*`**; no se verificaron claves de terceros ni configuración de proyectos de Sentry (no hay).
- **Matriz legal:** no sustituye una revisión de cumplimiento; LFPDPPP/GDPR dependen de la base legal, aviso de privacidad y contratos con encargados, que no están en el código.
- **Audit log:** no se abrió un IndexedDB real; la estructura y el contenido se infieren del código (`logAudit` y llamadas `audit.*`).
