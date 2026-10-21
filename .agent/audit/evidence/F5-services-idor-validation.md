# F5 — Servicios, IDOR, Validación y Sincronización (`T15`, `T16`, `SEC-005`, `SEC-020`)

> **Fase:** `F5` — Prioridad `P1`
> **Fecha:** `2026-10-20`
> **Niveles:** `N0` (revisión de código) + `N1` (contraste con RLS de `F2`)
> **Alcance:** `src/services/*.service.ts`, `src/lib/supabase-storage.ts`, `src/lib/web-push.ts`, `src/lib/sync-engine.ts`, `src/lib/migration.ts`, `src/hooks/mutations/*`, `src/hooks/useSessionManager.ts`, `src/components/app/DataConflictDialog.tsx`, `src/App.tsx`, `src/store/finance-store.ts` (`importData`) y `src/lib/{validators,sanitizers,schema-migrations}.ts`.
> **Estado:** `SEC-005` y `SEC-020` **parciales**; se identificaron 3 rutas sin filtro explícito de `user_id` (contenidas por RLS), 1 bug de firma en recibos, y validación de importación más débil que los esquemas Zod.

---

## 0. Resumen

| Hallazgo | Severidad | Veredicto |
| :--- | :---: | :--- |
| `SEC-005` — IDOR en servicios por falta de `.eq('user_id', ...)` | **Media** (defensa en profundidad) | ⚠️ **PARCIAL**: la mayoría de llamadas filtra `user_id`; `goals.addGoalContribution` (SELECT/UPDATE por `id`), `useAccountMutations.mergeAccounts` (UPDATE/DELETE por `ids`) y `useSessionManager` (DELETE/UPDATE por `id`/`device_id`) no lo hacen. RLS `auth.uid() = user_id` está activo en las 10 tablas (`F2`), por lo que **no se confirmó cross-tenant**; el riesgo es que un fallo de RLS o un cambio futuro convierta estas rutas en IDOR real. |
| `F5-A` (nuevo) — Validación de importación más débil que Zod | **Media** (integridad) | ❌ **CONFIRMADO**: `importData` usa `sanitize*`, no los esquemas Zod; acepta montos negativos, fechas arbitrarias y strings sin límite. |
| `SEC-020` — Importación JSON sin límite antes de `JSON.parse` | **Baja/Media** (DoS local) | ⚠️ **PARCIAL**: `DatosSection` limita el archivo a 20 MB antes de `file.text()`/`JSON.parse`, pero `useFinance.importData()` no tiene límite ni contadores máximos de arrays; un llamador distinto de la UI podría saltarse el control. |
| `F5-B` (nuevo) — Firma incorrecta en mutaciones de recibos | **Alta** (funcional) | ❌ **CONFIRMADO**: `updateTransaction(input.transactionId, { receipt })` pasa 2 argumentos a una función de 3 (`userId, id, patch`); `tsc` falla y en runtime el update de la transacción no se ejecuta tras subir/borrar el recibo. |
| `F5-C` (nuevo) — Sync destructivo no transaccional | **Media** (integridad/disponibilidad) | ❌ **CONFIRMADO (diseño)**: `syncAllToCloud` hace `DELETE ... WHERE user_id` y luego upserts uno a uno; un fallo intermedio deja la nube parcialmente vacía. |
| `F5-D` (nuevo) — Llamadas directas a Supabase fuera de la fachada | **Baja** (mantenibilidad/privacidad) | ❌ **CONFIRMADO**: `DataConflictDialog.tsx` y `App.tsx` consultan tablas directamente; el diálogo usa `select('*')` y duplica mappers. |

---

## 1. Método y consulta al grafo

Se ejecutó primero la consulta indicada por el plan:

```text
$ graphify query "supabase update delete upsert calls in services"
Graph: graphify-out/graph.json (1852 nodes) | Traversal: BFS depth=2
... cloudSync.service.ts, settings.service.ts, useFinanceData(), etc.
```

Después se inventariaron las llamadas reales con:

```bash
rg -n "\.from\(['\"]|\.storage\s*\.from|\.rpc\(" src --glob '!src/test/**'
```

No hay llamadas `.rpc()` en `src/` (las RPC de producción se revisaron en `F2`). El inventario cubre 9 archivos `src/services/*.service.ts` más `supabase-storage.ts`, `web-push.ts`, `sync-engine.ts`, `migration.ts` y los hooks/componentes que llaman al SDK.

**Origen de `userId`:** en todos los servicios el `userId` es un parámetro que proviene de una fuente de confianza:

- `supabase.auth.getUser()` en hooks de mutación, `useCloudSyncMutations`, `migration.ts` y `web-push.ts`;
- `useAuth().session.user.id` en queries, `DataConflictDialog` y `App.tsx`;
- nunca de un campo del formulario, de la URL, de `localStorage` arbitrario o del JSON importado.

Esto reduce el riesgo de IDOR: el atacante tendría que controlar la sesión, no solo un identificador.

---

## 2. Matriz completa de llamadas

Leyenda: ✅ filtro explícito correcto; ⚠️ sin filtro explícito (RLS es la única barrera); ❌ bug o riesgo adicional.

### 2.1 Servicios por entidad

| Archivo#Línea | Función | Tabla/vista | Operación | Filtro `user_id` | Origen `userId` | Veredicto |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `accounts.service.ts:85-89` | `fetchAccounts` | `accounts_safe` | `select` | `.eq('user_id', userId)` | parámetro (sesión) | ✅ |
| `accounts.service.ts:101` | `insertAccount` | `accounts` | `upsert` | `payload.user_id` | parámetro | ✅ |
| `accounts.service.ts:111` | `updateAccount` | `accounts` | `update` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `accounts.service.ts:121` | `deleteAccount` | `accounts` | `delete` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `debts.service.ts:125-129` | `fetchDebts` | `debts` + `debt_payments_safe` | `select` | `.eq('user_id', userId)` | parámetro | ✅ |
| `debts.service.ts:141` | `insertDebt` | `debts` | `upsert` | `payload.user_id` | parámetro | ✅ |
| `debts.service.ts:151` | `updateDebt` | `debts` | `update` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `debts.service.ts:161` | `deleteDebt` | `debts` | `delete` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `debts.service.ts:191` | `insertDebtPayment` | `debt_payments` | `upsert` | `payload.user_id` | parámetro | ✅ |
| `debts.service.ts:202` | `deleteDebtPayment` | `debt_payments` | `delete` | `.eq('id', paymentId).eq('user_id', userId)` | parámetro | ✅ |
| `fixedItems.service.ts:118-122` | `fetchFixedItems` | `fixed_items` | `select` | `.eq('user_id', userId)` | parámetro | ✅ |
| `fixedItems.service.ts:134` | `insertFixedItem` | `fixed_items` | `upsert` | `payload.user_id` | parámetro | ✅ |
| `fixedItems.service.ts:144` | `updateFixedItem` | `fixed_items` | `update` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `fixedItems.service.ts:154` | `deleteFixedItem` | `fixed_items` | `delete` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `fixedItems.service.ts:168-172` | `toggleFixedItemActive` | `fixed_items` | `update` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `goalFolders.service.ts:69-73` | `fetchGoalFolders` | `goal_folders` | `select` | `.eq('user_id', userId)` | parámetro | ✅ |
| `goalFolders.service.ts:85` | `insertGoalFolder` | `goal_folders` | `upsert` | `payload.user_id` | parámetro | ✅ |
| `goalFolders.service.ts:95` | `updateGoalFolder` | `goal_folders` | `update` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `goalFolders.service.ts:105` | `deleteGoalFolder` | `goal_folders` | `delete` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `goalFolders.service.ts:129` | `reorderGoalFolders` | `goal_folders` | `upsert` (array) | `payload.user_id` en cada fila | parámetro | ✅ |
| `goals.service.ts:115-119` | `fetchGoals` | `goals` | `select` | `.eq('user_id', userId)` | parámetro | ✅ |
| `goals.service.ts:131` | `insertGoal` | `goals` | `upsert` | `payload.user_id` | parámetro | ✅ |
| `goals.service.ts:141` | `updateGoal` | `goals` | `update` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `goals.service.ts:151` | `deleteGoal` | `goals` | `delete` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `goals.service.ts:165-169` | `addGoalContribution` | `goals` | `select` | **solo `.eq('id', goalId)`** | parámetro | ⚠️ |
| `goals.service.ts:187-193` | `addGoalContribution` | `goals` | `update` (`saved`, `contributions`) | **solo `.eq('id', goalId)`** | parámetro | ⚠️ |
| `transactions.service.ts:108-112` | `fetchTransactions` | `transactions_safe` | `select` | `.eq('user_id', userId)` | parámetro | ✅ |
| `transactions.service.ts:124` | `insertTransaction` | `transactions` | `upsert` | `payload.user_id` | parámetro | ✅ |
| `transactions.service.ts:134` | `updateTransaction` | `transactions` | `update` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `transactions.service.ts:144` | `deleteTransaction` | `transactions` | `delete` | `.eq('id', id).eq('user_id', userId)` | parámetro | ✅ |
| `settings.service.ts:77-81` | `fetchUserSettings` | `user_settings` | `select` | `.eq('user_id', userId)` | parámetro | ✅ |
| `settings.service.ts:84-88` | `fetchUserSettings` (fallback) | `user_settings` | `select` | `.eq('user_id', userId)` | parámetro | ✅ |
| `settings.service.ts:114-116` | `upsertUserSettings` | `user_settings` | `upsert` (`onConflict: user_id`) | `payload.user_id` | parámetro | ✅ |
| `settings.service.ts:120-122` | `upsertUserSettings` (retry) | `user_settings` | `upsert` | `payload.user_id` | parámetro | ✅ |
| `storage.service.ts:45` | `uploadReceipt` | Storage `receipts` | `upload` | path `${userId}/${receiptId}` | parámetro | ✅/⚠️ |
| `storage.service.ts:66` | `deleteReceipt` | Storage `receipts` | `remove([storagePath])` | **sin comprobación de prefijo** | parámetro `storagePath` | ⚠️ |
| `storage.service.ts:84-86` | `getReceiptSignedUrl` | Storage `receipts` | `createSignedUrl` | **sin comprobación de prefijo** | parámetro `storagePath` | ⚠️ |

### 2.2 Sync, push y migración

| Archivo#Línea | Función | Tabla | Operación | Filtro `user_id` | Origen `userId` | Veredicto |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `cloudSync.service.ts:88-93` | `downloadAllFromCloud` | `accounts`, `transactions_safe`, `fixed_items`, `goals`, `debts` + `debt_payments`, `goal_folders` | `select` | `.eq('user_id', userId)` en cada consulta | parámetro (sesión) | ✅ |
| `cloudSync.service.ts:128` | `syncAllToCloud` | `accounts` | `delete` | `.eq('user_id', userId)` | parámetro | ✅ |
| `cloudSync.service.ts:130-135` | `syncAllToCloud` | `accounts` | `upsert` | `user_id: userId` | parámetro | ✅ |
| `cloudSync.service.ts:141` | `syncAllToCloud` | `transactions` | `delete` | `.eq('user_id', userId)` | parámetro | ✅ |
| `cloudSync.service.ts:143-150` | `syncAllToCloud` | `transactions` | `upsert` | `user_id: userId` | parámetro | ✅ |
| `cloudSync.service.ts:156` | `syncAllToCloud` | `fixed_items` | `delete` | `.eq('user_id', userId)` | parámetro | ✅ |
| `cloudSync.service.ts:158-165` | `syncAllToCloud` | `fixed_items` | `upsert` | `user_id: userId` | parámetro | ✅ |
| `cloudSync.service.ts:171` | `syncAllToCloud` | `goals` | `delete` | `.eq('user_id', userId)` | parámetro | ✅ |
| `cloudSync.service.ts:173-179` | `syncAllToCloud` | `goals` | `upsert` | `user_id: userId` | parámetro | ✅ |
| `cloudSync.service.ts:185` | `syncAllToCloud` | `goal_folders` | `delete` | `.eq('user_id', userId)` | parámetro | ✅ |
| `cloudSync.service.ts:187-190` | `syncAllToCloud` | `goal_folders` | `upsert` | `user_id: userId` | parámetro | ✅ |
| `cloudSync.service.ts:196` | `syncAllToCloud` | `debts` | `delete` | `.eq('user_id', userId)` | parámetro | ✅ |
| `cloudSync.service.ts:198-203` | `syncAllToCloud` | `debts` | `upsert` | `user_id: userId` | parámetro | ✅ |
| `cloudSync.service.ts:219` | `syncAllToCloud` | `debt_payments` | `upsert` | `user_id: userId` | parámetro | ✅ |
| `web-push.ts:51-61` | `subscribeToWebPush` | `push_subscriptions` | `upsert` (`onConflict: endpoint`) | `user_id: session.user.id` | sesión | ✅ |
| `web-push.ts:110-114` | `unsubscribeFromWebPush` | `push_subscriptions` | `delete` | `.eq('endpoint', endpoint).eq('user_id', session.user.id)` | sesión | ✅ |
| `sync-engine.ts:145` | `processSyncQueue` | tabla del allowlist | `upsert` (batch) | `payload.user_id = userId` | sesión | ✅ |
| `sync-engine.ts:149` | `processSyncQueue` | tabla del allowlist | `delete` | `.eq('user_id', userId).in('id', ids)` | sesión | ✅ |
| `migration.ts:121-125` | migración de recibos | `transactions` | `update` (`receipt`) | `.eq('id', transactionId).eq('user_id', userId)` | `getUser()` | ✅ |
| `migration.ts:173` | `upsertAccount` | `accounts` | `upsert` | `user_id` | `getUser()` | ✅ |
| `migration.ts:200` | `upsertTransaction` | `transactions` | `upsert` | `user_id` | `getUser()` | ✅ |
| `migration.ts:228` | `upsertFixedItem` | `fixed_items` | `upsert` | `user_id` | `getUser()` | ✅ |
| `migration.ts:252` | `upsertGoal` | `goals` | `upsert` | `user_id` | `getUser()` | ✅ |
| `migration.ts:263-268` | `upsertDebt` | `debts` | `select` | `.eq('user_id', userId)` | `getUser()` | ✅ |
| `migration.ts:293` | `upsertDebt` | `debts` | `upsert` | `user_id` | `getUser()` | ✅ |
| `migration.ts:316` | `upsertDebtPayment` | `debt_payments` | `upsert` | `user_id` | `getUser()` | ✅ |

### 2.3 Hooks, componentes y store

| Archivo#Línea | Función | Tabla | Operación | Filtro `user_id` | Origen `userId` | Veredicto |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `App.tsx:166-170` | comprobación de nube | `accounts`, `transactions`, `fixed_items`, `goals`, `debts` | `select` (count, head) | `.eq('user_id', userId)` | sesión | ✅ |
| `DataConflictDialog.tsx:50-55` | descarga | `accounts`, `transactions`, `fixed_items`, `goals`, `debts` + `debt_payments`, `goal_folders` | `select('*')` | `.eq('user_id', userId)` | sesión | ⚠️ (`*`) |
| `DataConflictDialog.tsx:122-127` | cuentas por defecto | `accounts` | `insert` | `user_id: session.user.id` | sesión | ✅ |
| `DataConflictDialog.tsx:170-173` | contadores | `transactions`, `fixed_items`, `goals`, `debts` | `select` (count) | `.eq('user_id', userId)` | sesión | ✅ |
| `useAccountMutations.ts:110-112` | `mergeAccounts` | `transactions` | `update` (`account_id`) | **sin `user_id`**; solo `.in('account_id', idsToDelete)` | ids del store | ⚠️ |
| `useAccountMutations.ts:115-117` | `mergeAccounts` | `accounts` | `delete` | **sin `user_id`**; solo `.in('id', idsToDelete)` | ids del store | ⚠️ |
| `useSessionManager.ts:72` | takeover forzado | `user_sessions` | `delete` | **sin `user_id`**; solo `.eq('device_id', otherDevice.id)` | `otherDevice` del canal | ⚠️ |
| `useSessionManager.ts:111` | cerrar sesión local | `user_sessions` | `delete` | **sin `user_id`**; solo `.eq('id', sessionIdRef.current)` | ref local | ⚠️ |
| `useSessionManager.ts:162-165` | limpieza de sesiones viejas | `user_sessions` | `delete` | `.eq('user_id', userId).lt('last_seen_at', cutoff)` | sesión | ✅ |
| `useSessionManager.ts:169-172` | buscar otras sesiones | `user_sessions` | `select` | `.eq('user_id', userId).neq('device_id', deviceId)` | sesión | ✅ |
| `useSessionManager.ts:185-190` | registrar sesión | `user_sessions` | `insert` | `user_id: userId` | sesión | ✅ |
| `useSessionManager.ts:192-194` | borrar sesiones del mismo device | `user_sessions` | `delete` | `.eq('user_id', userId).eq('device_id', deviceId)` | sesión | ✅ |
| `useSessionManager.ts:213-216` | heartbeat | `user_sessions` | `update` (`last_seen_at`) | **sin `user_id`**; solo `.eq('id', sessionIdRef.current)` | ref local | ⚠️ |
| `useSessionManager.ts:226-231` | listar sesiones | `user_sessions` | `select` | `.eq('user_id', userId)` | sesión | ✅ |

**Conclusión de la matriz:** 3 rutas de escritura no incluyen `user_id` (`goals.addGoalContribution`, `mergeAccounts`, `useSessionManager`), y `storage.service.deleteReceipt/getReceiptSignedUrl` no validan el prefijo del path. No se encontró ningún `userId` derivado de entrada del usuario. La barrera efectiva es RLS.

---

## 3. `SEC-005` — Análisis y veredicto

### 3.1 Rutas sin filtro explícito

1. **`goals.service.addGoalContribution`** (`:165-193`):
   - `select('saved, contributions').eq('id', goalId).single()` no filtra `user_id`.
   - `update({saved, contributions}).eq('id', goalId)` tampoco.
   - Si un atacante conoce el UUID de una meta ajena, la consulta llega a PostgREST; la política `Users can update their own goals` (`F2-catalog-and-rls.md` §6) exige `auth.uid() = user_id`, por lo que devuelve 0 filas / error. **No explotable con la RLS actual.**
   - Si en el futuro se añade una política `USING (true)` o se usa `service_role` desde el cliente, sí sería IDOR.

2. **`useAccountMutations.mergeAccounts`** (`:110-117`):
   - `update({account_id: intoId}).in('account_id', idsToDelete)` y `delete().in('id', idsToDelete)` no filtran `user_id`.
   - `idsToDelete` viene de `fromIds` que envía la UI a partir de las cuentas locales; un JSON importado podría incluir UUIDs ajenos (los sanitizers aceptan cualquier UUID válido). Aun así, RLS bloquea el UPDATE/DELETE cross-tenant.
   - Además, la operación no es transaccional: si el update de transacciones funciona y el delete de cuentas falla, quedan transacciones apuntando a una cuenta que no se borró.

3. **`useSessionManager`** (`:72`, `:111`, `:213-216`):
   - `delete().eq('device_id', otherDevice.id)` y `delete().eq('id', sessionIdRef.current)` no filtran `user_id`; `otherDevice.id` viene del canal Realtime (público, ver `F3`), pero RLS limita el DELETE a filas propias.
   - `update({last_seen_at}).eq('id', sessionIdRef.current)` tampoco filtra `user_id`; el `id` es una ref local obtenida del INSERT.
   - Ya documentado en `F3-auth-mfa-sessions.md` §4.2 como riesgo de diseño; RLS contiene el cross-tenant.

### 3.2 Storage

- `storage.service.deleteReceipt(storagePath)` y `getReceiptSignedUrl(storagePath)` confían en el path recibido. `useReceiptMutations` pasa `input.storagePath` desde la UI; no hay validación `startsWith(userId + '/')` en el servicio.
- La variante `src/lib/supabase-storage.ts` **sí** valida (`:163-166`, `:186`) y es la que se usa en `migration.ts`; la variante `src/services/storage.service.ts` es la que usa `useReceiptMutations` y **no** valida.
- Las políticas de Storage (`F2-catalog-and-rls.md` §7) exigen `auth.uid() = foldername(name)[1]`, por lo que un path ajeno es rechazado por el servidor. El riesgo es de defensa en profundidad y de consistencia entre las dos implementaciones.

### 3.3 `push_subscriptions`

`F2` detectó que la política UPDATE usa `USING (true)` con `WITH CHECK (auth.uid() = user_id)` (`F2-catalog-and-rls.md` §5). Un usuario podría intentar actualizar una fila ajena si conoce su `endpoint`; el `WITH CHECK` impide dejarla asignada a otro, pero permitiría “moverla” a su propio `user_id` y desviar notificaciones. La política SELECT sí filtra por `user_id`, así que la enumeración de endpoints ajenos no es directa. Se registra como **riesgo BAJO** relacionado con `SEC-005`; recomendación: cambiar `USING (true)` por `USING (auth.uid() = user_id)`.

### 3.4 Veredicto

**`SEC-005`: ⚠️ PARCIAL (Media, defensa en profundidad).**

- No se confirmó IDOR cross-tenant: las 10 tablas tienen RLS con `auth.uid() = user_id` (`F2`), las vistas `*_safe` tienen `security_invoker=true`, y Storage exige el prefijo del usuario.
- Sí se confirmaron **3 rutas de escritura sin filtro explícito** y **2 funciones de Storage sin comprobación de prefijo**. La corrección es añadir `.eq('user_id', userId)` en todas ellas y validar el path en `storage.service.ts`, aunque RLS ya lo cubra.
- `T15` se marca `⚠️ PARCIAL` (no `✅ PASA`) porque la matriz estática encontró esas rutas; la prueba dinámica A→B sigue bloqueada por falta de cuentas (`T06`).

---

## 4. `SEC-020` y validación de importación

### 4.1 Flujo real

```
<input type="file" accept="application/json,.json">   DatosSection.tsx:362
  └─ handleImportFile(file)                            DatosSection.tsx:239-282
       ├─ if (file.size > 20 MB) return                :240-243
       ├─ file.text()                                  :244
       ├─ JSON.parse(text)                             :247
       ├─ normalizeImportKeys(raw)                     :252
       └─ setPendingPayload(text)                      :268
            └─ importData(pendingPayload, scopes)      :280
                 └─ JSON.parse(json)                   finance-store.ts:157
                      ├─ migrateImported(parsed)       :163
                      ├─ sanitizeFixed/Tx/Account/...  :170-190
                      └─ set({...})                    :197
```

### 4.2 Tamaño

- **UI:** 20 MB máximo antes de leer el archivo (`DatosSection.tsx:240`). Es un control real para el usuario normal.
- **Store:** `importData(json, scopes)` no comprueba `json.length` antes de `JSON.parse` (`finance-store.ts:155-157`). Si otro llamador (una futura página, un test, una integración) invoca la API directamente, no hay límite.
- **Colecciones:** no hay límite de número de elementos por array. Un JSON de 20 MB con cientos de miles de transacciones puede tardar segundos en `JSON.parse`, `normalizeImportKeys` (recursivo) y los `.map(sanitize*)`, bloqueando el hilo principal. No se observó un límite de profundidad en `normalizeImportKeys`, que recursa sin control.
- **Veredicto `SEC-020`: ⚠️ PARCIAL.** El control de 20 MB en la UI mitiga el caso normal; falta el límite en la capa de store y los topes de arrays/profundidad.

### 4.3 Validación: Zod vs sanitizers

`src/lib/validators.ts` define esquemas estrictos y bien acotados:

- `transactionSchema`: `amount` positivo, `concept` ≤ 200, `date` ISO, `note` ≤ 1000, `receipt` ≤ 10 MB, `.strict()`.
- `accountSchema`: `name` ≤ 100, `clabe` 18 dígitos, `denominations` ≤ 50.
- `goalSchema`: `target` positivo, `contributions` ≤ 10,000, `purchaseUrl` URL.
- `debtSchema`, `fixedItemSchema`, `userProfileSchema`, etc.

Pero `importData` **no usa Zod**. Usa `sanitizeTx`, `sanitizeAccount`, `sanitizeGoal`, `sanitizeDebt`, `sanitizeFixed`, `sanitizeGoalFolder` y `sanitizeProfile`, que solo comprueban tipos básicos:

| Campo | Zod | `sanitize*` en import | Consecuencia |
| :--- | :--- | :--- | :--- |
| `amount` | `positive().max(1e12)` | `isNum(raw.amount)` | Acepta negativos y `1e308`. |
| `concept` | `max(200)` | `isStr(raw.concept)` | Acepta strings de MB. |
| `date` | ISO/date | `isStr(raw.date)` | Acepta `"hola"`; luego `new Date(...)` puede dar `Invalid Date`. |
| `note` | `max(1000)` | `isStr(raw.note)` | Sin límite. |
| `email` | `email().max(254)` | `isStr(raw.email)` | Acepta cualquier string. |
| `target` | `positive()` | `isNum(raw.target)` | Acepta 0/negativos. |
| arrays | `.max(...)` | solo `Array.isArray` | Sin tope de elementos. |

`validateAndThrow` sí se usa en los slices al crear/actualizar (`transaction-slice.ts:65,104`, `goal-slice.ts:48,67`, etc.), pero **no** en la importación. Esto crea una asimetría: un dato creado por la UI pasa Zod, uno importado no.

**Veredicto `F5-A`: ❌ CONFIRMADO (Media, integridad).** La importación acepta datos que la UI nunca produciría; no hay ejecución de código, pero puede corromper saldos, metas y fechas, y generar renders costosos.

### 4.4 Prototype pollution

Se evaluaron los tres puntos señalados:

1. **`normalizeImportKeys`** (`sanitizers.ts:384-416`): crea un objeto nuevo `out` y asigna `out[mapped] = val`. Si el JSON contiene `"__proto__": {...}`, la asignación cambia el **prototipo de `out`** (no el de `Object.prototype`). No hay un merge recursivo sobre objetos existentes.
2. **`sanitizeMigratedData`** (`schema-migrations.ts:251-302`): usa spreads `{...data.appSettings}` y `{...data.appSettings?.accessibility}`; el spread crea propiedades propias y no invoca el setter `__proto__`.
3. **Merge de Zustand** (`finance-store.ts:390-414`): `{...currentState, ...persistedState, appSettings: {...}}`; el spread no contamina `Object.prototype`. `appSettings` se reconstruye con sanitizadores.

Prueba aislada en Node:

```text
$ node -e '...'
global polluted: undefined global pwned: undefined
out prototype polluted: true merged prototype is Object.prototype: true
merged own __proto__: true
```

**Veredicto: ✅ DESCARTADO (no hay prototype pollution global).** Queda una curiosidad: `normalizeImportKeys` puede alterar el prototipo del objeto parseado (`out.polluted === true`), pero el único consumidor lee claves conocidas (`fixedItems`, `transactions`, etc.) y no ejecuta código. Se recomienda usar `Object.create(null)` o rechazar claves `__proto__`/`constructor`/`prototype` como higiene.

### 4.5 Exportación y PII

`exportData` usa `ALL_SCOPES` con `excludePII`, `excludeEmail`, `excludeBankDetails` y `excludeReceipts` en `false` (`finance-store.ts:71-75`). `DatosSection.tsx` no muestra ningún toggle para esos campos: solo pasa los scopes de entidades. Por tanto, la exportación por defecto incluye `profile.email`, CLABE, banco, titular y recibos. Ya documentado en `SEC-018`; se confirma aquí que **no hay UI para activar `excludePII`**.

---

## 5. Sincronización, conflictos y llamadas directas

### 5.1 `syncAllToCloud` es destructivo y no transaccional

`cloudSync.service.ts:120-238` ejecuta, por cada entidad:

1. `DELETE FROM <tabla> WHERE user_id = $1`
2. `UPSERT` fila por fila desde el snapshot local.

Si el `DELETE` tiene éxito y un `UPSERT` falla (red, RLS, constraint, cuota), la nube queda con datos parciales y el cliente solo acumula el error en `errors[]`. No hay transacción ni “staging table”. El botón “Sobrescribir nube” de `DatosSection` usa esta función; el usuario confirma, pero no hay rollback.

Además, si el store local está vacío por el bug de logout de `F4` (`SEC-015`) o por una importación fallida, `syncAllToCloud` borra la nube y la deja vacía. Es un riesgo de **disponibilidad/integridad**, no de confidencialidad.

### 5.2 Cola offline (`sync-engine.ts`)

- Allowlist de tablas (`:16-18`): `accounts`, `transactions`, `fixed_items`, `goals`, `debts`, `debt_payments`, `goal_folders`. Bien: impide que un payload manipulado escriba en `user_settings`, `user_sessions` o `push_subscriptions`.
- Deduplicación (`:100-121`): DELETE gana; INSERT + UPDATE se colapsa en INSERT con el último payload; UPDATE + UPDATE se queda con el último. Correcto para el caso normal.
- Reintentos (`:52-66`, `:159-173`): backoff exponencial, pero al agotar `MAX_RETRIES` **elimina** la mutación sin dead-letter queue; el cambio se pierde silenciosamente.
- `beforeunload` aborta los `AbortController`, pero `processSyncQueue` no comprueba `controller.signal.aborted` dentro de cada `upsert`/`delete` (solo entre tablas, `:140`), así que una operación en vuelo puede completarse o quedar a medias.
- `userId` sale de `session.user.id` (`:74`), no del payload. Bien.

### 5.3 Conflictos y descarga

- `downloadAllFromCloud` (`cloudSync.service.ts:77-110`) hace 6 consultas en paralelo y reemplaza el store completo (`useCloudSyncMutations.ts:41-47`). No hay merge ni resolución de conflictos: la nube gana y se pierde lo local pendiente. El diálogo `DataConflictDialog` avisa, pero la acción “Descargar nube” no preserva cambios locales.
- `mergeLocalCloudData` (`schema-migrations.ts:215-248`) existe pero **no se usa** en `src/` (solo se exporta). Es código muerto; si se usara, `preferNewer` compara `updated_at`/`created_at` que los objetos de dominio no siempre tienen (camelCase `createdAt`), por lo que el “más nuevo” puede resolverse mal.
- `useSyncStore.clearQueue()` se llama antes de descargar (`DataConflictDialog.tsx:41-44`), descartando mutaciones pendientes sin enviarlas.

### 5.4 Llamadas directas fuera de la fachada

`rg -n "@/lib/supabase" src/pages src/components` y el inventario `.from` muestran:

- `src/components/app/DataConflictDialog.tsx`: 6 SELECT + 1 INSERT + 4 COUNT directos, con `select('*')` y mappers duplicados. No pasa por `useFinanceData` ni por los servicios.
- `src/App.tsx:166-170`: 5 COUNT directos para decidir si hay datos en la nube.
- `src/hooks/useSessionManager.ts`: gestione directa de `user_sessions` (esperable, pero fuera de la fachada).
- `src/hooks/mutations/useAccountMutations.ts`: `mergeAccounts` directo a `transactions`/`accounts`.
- `src/lib/migration.ts`: upserts directos (migración puntual).
- `src/hooks/mutations/useReceiptMutations.ts`: usa `storage.service` y luego `updateTransaction` con la firma incorrecta (ver §6).

**Riesgo:** la lógica de acceso a datos se duplica y las garantías (filtros, sanitización, mapeo) dependen de cada llamador. `select('*')` en el diálogo además trae columnas que la UI no necesita (incluido `user_id`) y dificulta la minimización.

---

## 6. Bug de firma en mutaciones de recibos (`F5-B`)

`src/services/transactions.service.ts:133` define:

```ts
export async function updateTransaction(userId: string, id: string, patch: Partial<Transaction>)
```

Pero `src/hooks/mutations/useReceiptMutations.ts:81` y `:105` llaman:

```ts
await updateTransaction(input.transactionId, { receipt: result.publicUrl });
await updateTransaction(input.transactionId, { receipt: undefined });
```

Faltan el `userId` y se pasa el patch como `id`. `tsc` lo detecta:

```text
src/hooks/mutations/useReceiptMutations.ts(81,13): error TS2554: Expected 3 arguments, but got 2.
src/hooks/mutations/useReceiptMutations.ts(105,13): error TS2554: Expected 3 arguments, but got 2.
```

En runtime, si el bundle se genera sin typecheck, `toUpdatePayload(undefined)` lanza `TypeError` al evaluar `'receipt' in patch`; el recibo ya se subió a Storage, pero la columna `transactions.receipt` no se actualiza y el usuario ve un error. En el borrado, el archivo se elimina de Storage pero la referencia local/DB queda. **Severidad Alta funcional** (pérdida de consistencia de recibos), no de confidencialidad.

**Corrección:** obtener `userId` de `supabase.auth.getUser()` (o pasarlo desde el hook) y llamar `updateTransaction(userId, input.transactionId, { receipt })`.

---

## 7. Matriz `T15` / `T16`

| Prueba | Nivel | Estado | Resultado |
| :--- | :--- | :--- | :--- |
| `T15` Update/delete sin `user_id` | `N0` | `⚠️ PARCIAL` | 3 rutas sin filtro explícito (`addGoalContribution`, `mergeAccounts`, `useSessionManager`); RLS `auth.uid() = user_id` las contiene. Storage service sin validación de prefijo. No se ejecutó A→B dinámico (sin cuentas). |
| `T16` Import JSON malicioso | `N0` | `⚠️ PARCIAL` | UI limita a 20 MB; store no. Zod no se aplica a import; montos negativos, fechas inválidas y strings largos pasan. Prototype pollution global descartada. |

---

## 8. Recomendaciones

1. **Añadir `.eq('user_id', userId)`** en `addGoalContribution` (SELECT y UPDATE), `mergeAccounts` (UPDATE y DELETE) y `useSessionManager` (DELETE/UPDATE por id), aunque RLS ya lo cubra. Es defensa en profundidad y facilita tests.
2. **Unificar Storage:** que `storage.service.ts` valide `storagePath.startsWith(`${userId}/`)` como ya hace `supabase-storage.ts`, o eliminar una de las dos implementaciones.
3. **Corregir `useReceiptMutations`** para pasar `userId` a `updateTransaction`; añadir un test que suba/borre un recibo y verifique la columna.
4. **Validar la importación con Zod** (`exportDataSchema` o los esquemas por entidad) antes de sanitizar; añadir topes de elementos y profundidad, y un límite de tamaño también en `importData`.
5. **Endurecer `push_subscriptions`:** `USING (auth.uid() = user_id)` en UPDATE.
6. **Sync no destructivo:** usar upsert + borrado de huérfanos en una transacción RPC, o una tabla de staging; nunca `DELETE` global seguido de inserts no atómicos.
7. **Centralizar el acceso a datos:** mover `DataConflictDialog` y los COUNT de `App.tsx` a `useFinanceData`/servicios; evitar `select('*')`.
8. **UI de PII:** exponer `excludePII`/`excludeEmail` en la exportación (relacionado con `SEC-018`).

---

## 9. Referencias

- `src/services/accounts.service.ts:84-128`; `debts.service.ts:124-209`; `fixedItems.service.ts:117-179`; `goalFolders.service.ts:68-137`; `goals.service.ts:114-218`; `transactions.service.ts:107-151`; `settings.service.ts:76-132`; `storage.service.ts:38-90`.
- `src/services/cloudSync.service.ts:77-238`; `src/lib/sync-engine.ts:16-211`; `src/lib/web-push.ts:20-124`.
- `src/hooks/mutations/useAccountMutations.ts:99-128`; `useReceiptMutations.ts:60-116`; `src/hooks/useSessionManager.ts:60-231`.
- `src/components/app/DataConflictDialog.tsx:40-180`; `src/App.tsx:160-175`; `src/lib/migration.ts:110-330`.
- `src/store/finance-store.ts:71-75` (`ALL_SCOPES`), `:155-200` (`importData`), `:390-414` (merge).
- `src/pages/ajustes/secciones/DatosSection.tsx:239-282`.
- `src/lib/validators.ts:1-300`; `src/lib/sanitizers.ts:140-430`; `src/lib/schema-migrations.ts:164-302`.
- `F2-catalog-and-rls.md` §5-7 (RLS, Storage, `push_subscriptions`); `F4-storage-inventory.md` §2 (`SEC-015`).
