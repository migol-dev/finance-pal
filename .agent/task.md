# Tarea Actual: Pendientes de la Migración a React Query

> **Rol:** Arquitecto de Software
> **Restricción:** NO implementar lógica final. Solo definir la estructura, interfaces, imports y criterios de aceptación para que el Constructor (OpenCode) programe cada archivo.
> **Contexto:** La arquitectura limpia base (servicios, hooks de query y mutation por entidad) ya fue implementada en la migración anterior. Este documento cubre los **dos pendientes restantes**.

---

## Estado Actual del Proyecto

### Lo que YA existe (no tocar)

| Archivo | Estado |
|---|---|
| `src/services/accounts.service.ts` | ✅ Implementado |
| `src/services/transactions.service.ts` | ✅ Implementado |
| `src/services/fixedItems.service.ts` | ✅ Implementado |
| `src/services/goals.service.ts` | ✅ Implementado |
| `src/services/goalFolders.service.ts` | ✅ Implementado |
| `src/services/debts.service.ts` | ✅ Implementado |
| `src/services/settings.service.ts` | ✅ Implementado (`fetchUserSettings`, `upsertUserSettings`) |
| `src/hooks/queries/use*Query.ts` (6 archivos) | ✅ Implementados |
| `src/hooks/mutations/use*Mutations.ts` (6 archivos) | ✅ Implementados |
| `src/hooks/useFinanceData.ts` | ✅ Refactorizado (hook fachada) |
| `src/lib/queryKeys.ts` | ✅ Implementado |
| `src/lib/queryClient.ts` | ✅ Implementado |
| `src/store/slices/*.ts` | ✅ Sin llamadas a Supabase |

### Lo que AÚN FALTA (los dos pendientes)

| # | Pendiente | Archivos afectados |
|---|---|---|
| **P1** | Servicio y hook de mutación para subida de **recibos fotográficos** a **Supabase Storage** | `src/services/storage.service.ts` (NUEVO) · `src/hooks/mutations/useReceiptMutations.ts` (NUEVO) · `src/services/transactions.service.ts` (MODIFICAR) · `src/hooks/useFinanceData.ts` (MODIFICAR) |
| **P2** | Extraer las **operaciones en lote** (`downloadFromCloud`, `syncAllToCloud`, `loadSettingsFromCloud`) del `finance-store.ts` y reubicarlas en servicios/hooks propios | `src/services/cloudSync.service.ts` (NUEVO) · `src/hooks/mutations/useCloudSyncMutations.ts` (NUEVO) · `src/store/finance-store.ts` (MODIFICAR) · `src/hooks/useFinanceData.ts` (MODIFICAR) |

---

## PENDIENTE 1 — Storage Service: Recibos Fotográficos

### Diagnóstico

El campo `receipt` en `Transaction` actualmente acepta:
- Un `data:image/...;base64,...` (data URL embebida — problemático para sincronización en la nube)
- Una ruta de archivo nativa Capacitor (ej. `receipts/abc123.jpg`)
- Una URL de Supabase Storage (ej. `https://<project>.supabase.co/storage/v1/object/...`)

La función `syncAllToCloud` en `finance-store.ts` (línea 449-458) sube el campo `receipt` tal cual a la columna `receipt` de la tabla `transactions`. Si es un data URL en base64 largo, esto supone:
1. **Tamaño excesivo** en base de datos (columna texto, no objeto binario)
2. **Sin gestión de archivos** (no se puede purgar, versionar ni servir con CDN)
3. **No hay lógica de upload** a Supabase Storage separada del insert de la fila

El `storage.service.ts` debe encapsular toda la lógica de Supabase Storage para recibos: subida, obtención de URL pública y eliminación.

### Nueva Estructura de Directorios (P1)

```
src/
├── services/
│   └── storage.service.ts          ← NUEVO: funciones puras de Supabase Storage
│
└── hooks/
    └── mutations/
        └── useReceiptMutations.ts  ← NUEVO: useMutation para upload/delete de recibos
```

### Archivos Afectados (P1)

| Archivo | Acción | Cambio |
|---|---|---|
| `src/services/storage.service.ts` | **CREAR** | Funciones puras: `uploadReceipt`, `deleteReceipt`, `getReceiptPublicUrl` |
| `src/hooks/mutations/useReceiptMutations.ts` | **CREAR** | Hook `useReceiptMutations` con mutations de upload y delete |
| `src/services/transactions.service.ts` | **MODIFICAR** | `insertTransaction` y `updateTransaction` deben aceptar que `receipt` sea ya una URL de Storage (no base64) |
| `src/hooks/useFinanceData.ts` | **MODIFICAR** | Exponer `uploadReceipt` y `deleteReceipt` provenientes de `useReceiptMutations` |

### Interfaces y Tipos (P1)

#### `src/services/storage.service.ts` — Imports exactos

```typescript
import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
// NO importar React, NO importar hooks, NO importar Zustand
```

#### Interfaces internas de `storage.service.ts`

```typescript
// Nombre del bucket en Supabase Storage
const RECEIPTS_BUCKET = 'receipts';

// Payload de entrada para subir un recibo
export interface ReceiptUploadInput {
  /** ID único del recibo — se usa como nombre de archivo en Storage */
  receiptId: string;
  /** ID del usuario autenticado — define el prefijo de carpeta */
  userId: string;
  /**
   * Datos del archivo. Acepta:
   *   - data URL (string): "data:image/jpeg;base64,..."
   *   - Blob / File: objeto binario directo
   */
  file: string | Blob | File;
  /** MIME type del archivo (ej. "image/jpeg", "image/png", "image/webp") */
  mimeType: string;
}

// Resultado de una subida exitosa
export interface ReceiptUploadResult {
  /** Ruta relativa dentro del bucket: "{userId}/{receiptId}" */
  storagePath: string;
  /** URL pública firmada o anónima servida por Supabase CDN */
  publicUrl: string;
}
```

#### Firmas de funciones exportadas de `storage.service.ts`

```typescript
/**
 * Sube un recibo a Supabase Storage.
 * Si el archivo es un data URL base64, lo convierte a Blob antes de subir.
 * Retorna la ruta de Storage y la URL pública.
 * Lanza AppError(ErrorCodes.STORAGE_UPLOAD_FAILED) si falla.
 */
export async function uploadReceipt(
  input: ReceiptUploadInput
): Promise<ReceiptUploadResult>;

/**
 * Elimina un recibo de Supabase Storage por su ruta relativa.
 * Lanza AppError(ErrorCodes.STORAGE_DELETE_FAILED) si falla.
 */
export async function deleteReceipt(storagePath: string): Promise<void>;

/**
 * Obtiene la URL pública de un recibo ya existente en Storage
 * a partir de su ruta relativa (no hace llamadas de red).
 * Es una función síncrona que solo construye la URL.
 */
export function getReceiptPublicUrl(storagePath: string): string;

/**
 * Helper interno: convierte un data URL base64 a Blob.
 * No se exporta. Solo uso interno en uploadReceipt.
 */
function dataUrlToBlob(dataUrl: string): Blob;
```

> **Nota para el Constructor:** El nombre de archivo en Storage debe seguir el patrón `{userId}/{receiptId}` para que las RLS policies del bucket `receipts` puedan restringir acceso por `userId`. El `receiptId` debe venir del `id` de la transacción o de un `generateSecureId()` nuevo.

#### `src/hooks/mutations/useReceiptMutations.ts` — Imports exactos

```typescript
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { uploadReceipt, deleteReceipt } from '@/services/storage.service';
import type { ReceiptUploadInput, ReceiptUploadResult } from '@/services/storage.service';
import { supabase } from '@/lib/supabase';
```

#### Interfaces y firma de `useReceiptMutations`

```typescript
// Input para subir el recibo de una transacción específica
export interface UploadReceiptForTransactionInput {
  /** ID de la transacción a la que pertenece el recibo */
  transactionId: string;
  /**
   * Datos del archivo: data URL base64 o Blob/File.
   * Si es data URL, el servicio lo convierte a Blob internamente.
   */
  file: string | Blob | File;
  /** MIME type del archivo */
  mimeType: string;
}

// Input para eliminar el recibo de una transacción
export interface DeleteReceiptForTransactionInput {
  /** ID de la transacción */
  transactionId: string;
  /**
   * Ruta relativa en Storage (ej. "{userId}/{transactionId}").
   * Se necesita para llamar a deleteReceipt del servicio.
   */
  storagePath: string;
}

export interface ReceiptMutations {
  /**
   * Sube el archivo a Supabase Storage y actualiza el campo `receipt`
   * de la transacción (en Zustand Y en la columna `transactions.receipt`)
   * con la URL pública resultante.
   */
  uploadReceiptForTransaction: UseMutationResult<
    ReceiptUploadResult,
    Error,
    UploadReceiptForTransactionInput
  >;
  /**
   * Elimina el archivo de Storage y limpia el campo `receipt`
   * de la transacción (en Zustand Y en Supabase).
   */
  deleteReceiptForTransaction: UseMutationResult<
    void,
    Error,
    DeleteReceiptForTransactionInput
  >;
}

export function useReceiptMutations(): ReceiptMutations;
```

#### Flujo interno de `uploadReceiptForTransaction`

```
onMutate:
  — Ninguno (no hay optimistic update porque no tenemos la URL final aún)

mutationFn:
  1. supabase.auth.getUser() → obtener userId
  2. Construir ReceiptUploadInput: { receiptId: transactionId, userId, file, mimeType }
  3. uploadReceipt(input) → ReceiptUploadResult { storagePath, publicUrl }
  4. updateTransaction(transactionId, { receipt: publicUrl })
     ↑ llama a transactions.service.ts para actualizar la columna en Supabase
  5. useFinance.getState().updateTx(transactionId, { receipt: publicUrl })
     ↑ actualiza Zustand local para reflejar la URL real

onSuccess:
  — queryClient.invalidateQueries({ queryKey: financeKeys.transactions() })

onError:
  — queryClient.invalidateQueries({ queryKey: financeKeys.transactions() })
  — NO lanzar error silenciosamente: dejar que el componente maneje el error visible
```

#### Flujo interno de `deleteReceiptForTransaction`

```
mutationFn:
  1. deleteReceipt(storagePath)
  2. updateTransaction(transactionId, { receipt: undefined })
  3. useFinance.getState().updateTx(transactionId, { receipt: undefined })

onSuccess:
  — queryClient.invalidateQueries({ queryKey: financeKeys.transactions() })

onError:
  — queryClient.invalidateQueries({ queryKey: financeKeys.transactions() })
```

### Modificación a `useFinanceData.ts` (P1)

```typescript
// Agregar import:
import { useReceiptMutations } from '@/hooks/mutations/useReceiptMutations';
import type { UploadReceiptForTransactionInput, DeleteReceiptForTransactionInput } from '@/hooks/mutations/useReceiptMutations';

// Dentro del hook, instanciar:
const receiptM = useReceiptMutations();

// En el return, agregar:
uploadReceipt: (input: UploadReceiptForTransactionInput) =>
  receiptM.uploadReceiptForTransaction.mutateAsync(input),
deleteReceipt: (input: DeleteReceiptForTransactionInput) =>
  receiptM.deleteReceiptForTransaction.mutateAsync(input),
```

> **Nota:** `UiSelection` en `useFinanceData.ts` NO incluye `syncAllToCloud` en la Fase final del P2. Ver sección P2.

### Modificación a `src/services/transactions.service.ts` (P1)

El campo `receipt` en `TransactionInsertPayload` y `TransactionUpdatePayload` ya es `string | undefined`. **No requiere cambio de tipo.** Lo que cambia es la semántica: el Constructor debe agregar un comentario JSDoc indicando que el campo ya debe contener una URL de Storage o ruta nativa, nunca un data URL base64, cuando se llama desde `insertTransaction`.

```typescript
// En TransactionInsertPayload — añadir JSDoc:
/**
 * URL de Supabase Storage o ruta de archivo nativo (Capacitor).
 * NUNCA debe ser un data URL base64 al llamar a insertTransaction.
 * Si el archivo aún no fue subido, llamar primero a uploadReceipt de storage.service.ts.
 */
receipt: string | undefined;
```

---

## PENDIENTE 2 — Extracción de Operaciones en Lote de `finance-store.ts`

### Diagnóstico

El `finance-store.ts` actualmente contiene tres operaciones que violan el principio de responsabilidad única del store Zustand:

| Función | Líneas | Problema |
|---|---|---|
| `loadSettingsFromCloud()` | 382–397 | Llama directamente a `supabase.auth.getSession()` y `supabase.from('user_settings').select()`. El store Zustand no debe tocar la red. |
| `downloadFromCloud()` | 399–425 | Hace 6 llamadas paralelas a Supabase con mappers inline, duplicando la lógica ya existente en los servicios por entidad. |
| `syncAllToCloud()` | 427–532 | Hace inserts/deletes masivos de todas las entidades y settings. Mezcla lógica de red con estado local. |

Adicionalmente, `useFinanceData.ts` (línea 75 en `UiSelection` y línea 131 en `useShallow`) expone `syncAllToCloud` desde Zustand directamente, lo cual es incorrecto arquitecturalmente (un store local no debería tener funciones de red).

### Nueva Estructura de Directorios (P2)

```
src/
├── services/
│   └── cloudSync.service.ts           ← NUEVO: funciones puras de sincronización masiva
│
└── hooks/
    └── mutations/
        └── useCloudSyncMutations.ts   ← NUEVO: hooks useMutation para operaciones en lote
```

### Archivos Afectados (P2)

| Archivo | Acción | Cambio |
|---|---|---|
| `src/services/cloudSync.service.ts` | **CREAR** | Funciones puras: `downloadAllFromCloud`, `syncAllToCloud`, `loadSettingsFromCloud` |
| `src/hooks/mutations/useCloudSyncMutations.ts` | **CREAR** | Hooks de mutation para operaciones en lote con feedback de progreso |
| `src/store/finance-store.ts` | **MODIFICAR** | Eliminar `loadSettingsFromCloud`, `downloadFromCloud`, `syncAllToCloud` de la interfaz `State` y de la implementación |
| `src/hooks/useFinanceData.ts` | **MODIFICAR** | Reemplazar `syncAllToCloud: ui.syncAllToCloud` por `syncAllToCloud` proveniente de `useCloudSyncMutations` |

### Interfaces y Tipos (P2)

#### `src/services/cloudSync.service.ts` — Imports exactos

```typescript
import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import { mapAccountFromDb } from '@/services/accounts.service';
import { mapTransactionFromDb } from '@/services/transactions.service';
import { mapFixedItemFromDb } from '@/services/fixedItems.service';
import { mapGoalFromDb } from '@/services/goals.service';
import { mapGoalFolderFromDb } from '@/services/goalFolders.service';
import { mapDebtFromDb } from '@/services/debts.service';
import { mapUserSettingsFromDb } from '@/services/settings.service';
import type {
  Account,
  Transaction,
  FixedItem,
  Goal,
  GoalFolder,
  Debt,
  ThemeMode,
  UserProfile,
} from '@/lib/finance';
// NO importar React, NO importar hooks, NO importar Zustand
```

#### Interfaces de `cloudSync.service.ts`

```typescript
// Resultado completo de una descarga desde la nube
export interface CloudSnapshot {
  accounts: Account[];
  transactions: Transaction[];
  fixedItems: FixedItem[];
  goals: Goal[];
  goalFolders: GoalFolder[];
  debts: Debt[];
}

// Resultado de settings remotos
export interface CloudSettings {
  theme: ThemeMode;
  profile: UserProfile;
}

// Resultado del sync masivo a la nube
export interface CloudSyncResult {
  /** Número total de registros sincronizados con éxito */
  syncedCount: number;
  /** Errores por entidad (vacío si todo OK) */
  errors: Array<{ entity: string; message: string }>;
}

// Input del sync masivo (snapshot local del store)
export interface CloudSyncInput {
  userId: string;
  accounts: Account[];
  transactions: Transaction[];
  fixedItems: FixedItem[];
  goals: Goal[];
  goalFolders: GoalFolder[];
  debts: Debt[];
  theme: ThemeMode;
  profile: UserProfile;
}
```

#### Firmas de funciones exportadas de `cloudSync.service.ts`

```typescript
/**
 * Descarga todas las entidades de Supabase para el userId dado.
 * Usa los mappers existentes de cada servicio por entidad.
 * Lanza AppError(ErrorCodes.DB_QUERY_FAILED) si alguna de las 6 consultas falla.
 *
 * Internamente usa Promise.all([
 *   supabase.from('accounts')...,
 *   supabase.from('transactions')...,
 *   supabase.from('fixed_items')...,
 *   supabase.from('goals')...,
 *   supabase.from('debts')...,
 *   supabase.from('goal_folders')...,
 * ])
 * y aplica los mappers de cada servicio correspondiente.
 */
export async function downloadAllFromCloud(
  userId: string
): Promise<CloudSnapshot>;

/**
 * Sincroniza (delete+insert masivo) todas las entidades del usuario a Supabase.
 * Las transacciones con receipt en base64 deben ser manejadas externamente
 * (el caller debe resolver los uploads a Storage antes de llamar a esta función).
 *
 * Retorna CloudSyncResult con el conteo de registros sincronizados y errores parciales.
 * NO lanza excepción si hay errores en entidades individuales: los acumula en `errors`.
 */
export async function syncAllToCloud(
  input: CloudSyncInput
): Promise<CloudSyncResult>;

/**
 * Carga theme y profile del usuario desde user_settings.
 * Delega a fetchUserSettings de settings.service.ts.
 * Retorna null si no hay registro aún.
 *
 * NOTA: Esta función existe solo por compatibilidad semántica.
 * En realidad es un wrapper de fetchUserSettings.
 */
export async function loadSettingsFromCloud(
  userId: string
): Promise<CloudSettings | null>;
```

> **Nota para el Constructor:** `syncAllToCloud` NO debe lanzar excepción global si falla una entidad individual. Debe acumular errores en el array `errors` y continuar con las demás entidades. Solo lanzar si falla la autenticación o la sesión es inválida.

#### `src/hooks/mutations/useCloudSyncMutations.ts` — Imports exactos

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import {
  downloadAllFromCloud,
  syncAllToCloud,
  loadSettingsFromCloud,
  type CloudSyncResult,
  type CloudSnapshot,
  type CloudSettings,
} from '@/services/cloudSync.service';
```

#### Interfaces y firma de `useCloudSyncMutations`

```typescript
export interface CloudSyncMutations {
  /**
   * Descarga todas las entidades desde Supabase y las aplica al store Zustand.
   * Invalida el caché de React Query para que los queries refresquen.
   */
  downloadFromCloud: UseMutationResult<CloudSnapshot, Error, void>;

  /**
   * Sube todas las entidades del store Zustand a Supabase (delete+insert masivo).
   * Retorna el número de registros sincronizados.
   */
  syncAllToCloud: UseMutationResult<CloudSyncResult, Error, void>;

  /**
   * Carga theme y profile desde user_settings y los aplica al store Zustand.
   */
  loadSettingsFromCloud: UseMutationResult<CloudSettings | null, Error, void>;
}

export function useCloudSyncMutations(): CloudSyncMutations;
```

#### Flujo interno de `downloadFromCloud`

```
mutationFn:
  1. supabase.auth.getUser() → userId
  2. downloadAllFromCloud(userId) → CloudSnapshot
  3. useFinance.getState() — llamar a set() con el snapshot:
     set({ accounts, transactions, fixedItems, goals, goalFolders, debts })

onSuccess:
  — queryClient.invalidateQueries({ queryKey: financeKeys.all })
  — Invalida TODAS las entidades de una sola vez (usa financeKeys.all como raíz)

onError:
  — No hace rollback (la descarga no modifica Supabase, solo el estado local)
  — El componente debe mostrar toast de error
```

#### Flujo interno de `syncAllToCloud`

```
mutationFn:
  1. Si !isSupabaseEnabled → retornar { syncedCount: 0, errors: [] }
  2. supabase.auth.getUser() → userId
  3. Leer snapshot completo: const s = useFinance.getState()
  4. Construir CloudSyncInput:
     { userId, accounts: s.accounts, transactions: s.transactions,
       fixedItems: s.fixedItems, goals: s.goals, goalFolders: s.goalFolders,
       debts: s.debts, theme: s.theme, profile: s.profile }
  5. syncAllToCloud(input) → CloudSyncResult

onSuccess:
  — queryClient.invalidateQueries({ queryKey: financeKeys.all })

onError:
  — No rollback
```

#### Flujo interno de `loadSettingsFromCloud`

```
mutationFn:
  1. Si !isSupabaseEnabled → return null
  2. supabase.auth.getUser() → userId
  3. loadSettingsFromCloud(userId) → CloudSettings | null
  4. Si data !== null:
     useFinance.getState().setTheme(data.theme)
     useFinance.getState().setProfile(data.profile)
  5. Retornar data

onSuccess:
  — Ninguna invalidación (no afecta queries de entidades financieras)
```

### Modificación a `src/store/finance-store.ts` (P2)

#### Cambio en la interfaz `State`

```typescript
// ELIMINAR estas tres líneas de la interfaz State:
loadSettingsFromCloud: () => Promise<void>;
downloadFromCloud: () => Promise<void>;
syncAllToCloud: () => Promise<number>;

// La interfaz State resultante ya NO tendrá operaciones de red.
// Solo mantendrá: saveReceiptFile, hasLocalData, exportData, importData,
// migrateReceiptsInPlace, cleanupOrphanReceipts, resetAll, ensureScheduledTransactions.
```

#### Cambio en la implementación (`create<State>()(persist(...))`)

```typescript
// ELIMINAR completamente los bloques:
// loadSettingsFromCloud: async () => { ... },   (líneas 382-397 actuales)
// downloadFromCloud: async () => { ... },         (líneas 399-425 actuales)
// syncAllToCloud: async () => { ... },            (líneas 427-532 actuales)

// No reemplazar con nada. Estas responsabilidades viven ahora en:
// cloudSync.service.ts + useCloudSyncMutations.ts
```

> **Importante para el Constructor:** El `persist` middleware y toda la lógica de `storage.getItem/setItem/removeItem` (líneas 538-582) NO debe tocarse. Solo se eliminan los tres métodos de red mencionados.

### Modificación a `src/hooks/useFinanceData.ts` (P2)

#### Cambios en imports

```typescript
// AGREGAR import:
import { useCloudSyncMutations } from '@/hooks/mutations/useCloudSyncMutations';
```

#### Cambios en el cuerpo del hook

```typescript
// AGREGAR instancia de mutations (junto a los demás):
const cloudSyncM = useCloudSyncMutations();
```

#### Cambios en `UiSelection` (tipo interno)

```typescript
// ELIMINAR de UiSelection:
syncAllToCloud: () => Promise<number>;

// Ya no se expone desde Zustand — viene del hook de mutations
```

#### Cambios en `useShallow`

```typescript
// ELIMINAR de la selección useShallow:
syncAllToCloud: state.syncAllToCloud,
```

#### Cambios en el `return`

```typescript
// REEMPLAZAR:
syncAllToCloud: ui.syncAllToCloud,

// POR:
downloadFromCloud: () => cloudSyncM.downloadFromCloud.mutateAsync(),
syncAllToCloud: () => cloudSyncM.syncAllToCloud.mutateAsync().then(r => r.syncedCount),
loadSettingsFromCloud: () => cloudSyncM.loadSettingsFromCloud.mutateAsync(),

// Estado de progreso (útil para mostrar indicadores en UI):
isSyncingToCloud: cloudSyncM.syncAllToCloud.isPending,
isDownloadingFromCloud: cloudSyncM.downloadFromCloud.isPending,
```

---

## Plan de Acción Paso a Paso

### FASE A — Storage Service y Hook de Recibos (Pendiente 1)

> **Orden estricto:** A.1 → A.2 → A.3 → A.4

#### Paso A.1 — Crear `src/services/storage.service.ts`

- Definir constante `RECEIPTS_BUCKET = 'receipts'`.
- Implementar `dataUrlToBlob(dataUrl: string): Blob` (helper privado).
- Implementar `uploadReceipt(input: ReceiptUploadInput): Promise<ReceiptUploadResult>`:
  - Si `input.file` es string, llamar a `dataUrlToBlob` primero.
  - Llamar a `supabase.storage.from(RECEIPTS_BUCKET).upload(path, blob, { contentType: input.mimeType, upsert: true })`.
  - La ruta debe ser `${input.userId}/${input.receiptId}`.
  - Obtener URL pública con `supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path)`.
  - Si hay error en el upload, lanzar `AppError(ErrorCodes.STORAGE_UPLOAD_FAILED, ...)`.
- Implementar `deleteReceipt(storagePath: string): Promise<void>`:
  - Llamar a `supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath])`.
  - Si hay error, lanzar `AppError(ErrorCodes.STORAGE_DELETE_FAILED, ...)`.
- Implementar `getReceiptPublicUrl(storagePath: string): string`:
  - Llamar a `supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(storagePath).data.publicUrl`.
  - Función síncrona, no lanza error.
- **NO importar React, NO importar hooks, NO importar Zustand.**

#### Paso A.2 — Crear `src/hooks/mutations/useReceiptMutations.ts`

- Implementar `uploadReceiptForTransaction`:
  - `mutationFn`: `supabase.auth.getUser()` → `uploadReceipt(...)` → `updateTransaction(transactionId, { receipt: publicUrl })` → `useFinance.getState().updateTx(transactionId, { receipt: publicUrl })`.
  - `onSuccess`: `queryClient.invalidateQueries({ queryKey: financeKeys.transactions() })`.
  - `onError`: `queryClient.invalidateQueries({ queryKey: financeKeys.transactions() })`.
- Implementar `deleteReceiptForTransaction`:
  - `mutationFn`: `deleteReceipt(storagePath)` → `updateTransaction(transactionId, { receipt: undefined })` → `useFinance.getState().updateTx(transactionId, { receipt: undefined })`.
  - `onSuccess/onError`: igual que upload.
- Exportar interfaz `ReceiptMutations` y función `useReceiptMutations`.

#### Paso A.3 — Añadir JSDoc a `src/services/transactions.service.ts`

- En `TransactionInsertPayload.receipt` y `TransactionUpdatePayload`: añadir JSDoc indicando que el campo espera URL de Storage o ruta nativa, nunca base64.
- **No cambiar lógica ni tipos** — solo documentar el contrato.

#### Paso A.4 — Modificar `src/hooks/useFinanceData.ts` (import + instancia + return)

- Añadir `import { useReceiptMutations } from '@/hooks/mutations/useReceiptMutations'`.
- Instanciar `const receiptM = useReceiptMutations()` junto a los demás.
- En el `return`, añadir:
  ```typescript
  uploadReceipt: (input) => receiptM.uploadReceiptForTransaction.mutateAsync(input),
  deleteReceipt: (input) => receiptM.deleteReceiptForTransaction.mutateAsync(input),
  ```

---

### FASE B — Extracción de Operaciones en Lote (Pendiente 2)

> **Orden estricto:** B.1 → B.2 → B.3 → B.4

#### Paso B.1 — Crear `src/services/cloudSync.service.ts`

- Implementar `downloadAllFromCloud(userId: string): Promise<CloudSnapshot>`:
  - `Promise.all([6 queries])` usando las mismas columnas que las funciones `fetch*` de los servicios existentes.
  - Usar los mappers de cada servicio: `mapAccountFromDb`, `mapTransactionFromDb`, `mapFixedItemFromDb`, `mapGoalFromDb`, `mapGoalFolderFromDb`, `mapDebtFromDb`.
  - Si alguna query retorna error, lanzar `AppError(ErrorCodes.DB_QUERY_FAILED, ...)`.
- Implementar `syncAllToCloud(input: CloudSyncInput): Promise<CloudSyncResult>`:
  - Para cada entidad: delete por `user_id`, luego insert en bucle.
  - Acumular errores en `errors[]` sin abortar las demás entidades.
  - Al final, upsert en `user_settings` con `theme` y `profile`.
  - Retornar `{ syncedCount, errors }`.
- Implementar `loadSettingsFromCloud(userId: string): Promise<CloudSettings | null>`:
  - Delegar a `fetchUserSettings(userId)` de `settings.service.ts`.
  - Mapear resultado a `CloudSettings` si no es null.
- **NO importar React, NO importar hooks, NO importar Zustand.**

#### Paso B.2 — Crear `src/hooks/mutations/useCloudSyncMutations.ts`

- Implementar `downloadFromCloud`:
  - `mutationFn`: `supabase.auth.getUser()` → `downloadAllFromCloud(userId)` → `useFinance.getState()` set del snapshot completo.
  - `onSuccess`: `queryClient.invalidateQueries({ queryKey: financeKeys.all })`.
- Implementar `syncAllToCloud`:
  - `mutationFn`: si `!isSupabaseEnabled`, retornar early. Leer snapshot de `useFinance.getState()`. Llamar a `syncAllToCloud(input)`.
  - `onSuccess`: `queryClient.invalidateQueries({ queryKey: financeKeys.all })`.
- Implementar `loadSettingsFromCloud`:
  - `mutationFn`: si `!isSupabaseEnabled`, retornar null. `supabase.auth.getUser()` → `loadSettingsFromCloud(userId)`. Si resultado no null: `useFinance.getState().setTheme(...)` y `setProfile(...)`.
- Exportar interfaz `CloudSyncMutations` y función `useCloudSyncMutations`.

#### Paso B.3 — Modificar `src/store/finance-store.ts`

- **Eliminar** de la interfaz `State` (dentro del `interface State extends ...`):
  ```typescript
  loadSettingsFromCloud: () => Promise<void>;
  downloadFromCloud: () => Promise<void>;
  syncAllToCloud: () => Promise<number>;
  ```
- **Eliminar** los tres bloques de implementación dentro del `create<State>()(persist(..., (...a) => { ... }))`.
- **No tocar** el bloque `persist` ni la lógica de `storage.getItem/setItem/removeItem`.
- **No tocar** `resetAll` — esta función ya es solo local (cambia estado Zustand, el audit log a Supabase es un fire-and-forget que puede quedar).

#### Paso B.4 — Modificar `src/hooks/useFinanceData.ts`

- Añadir `import { useCloudSyncMutations } from '@/hooks/mutations/useCloudSyncMutations'`.
- Instanciar `const cloudSyncM = useCloudSyncMutations()`.
- En `UiSelection`: eliminar `syncAllToCloud: () => Promise<number>`.
- En el selector `useShallow`: eliminar `syncAllToCloud: state.syncAllToCloud`.
- En el `return`:
  - Eliminar `syncAllToCloud: ui.syncAllToCloud`.
  - Agregar:
    ```typescript
    downloadFromCloud: () => cloudSyncM.downloadFromCloud.mutateAsync(),
    syncAllToCloud: () =>
      cloudSyncM.syncAllToCloud.mutateAsync().then((r) => r.syncedCount),
    loadSettingsFromCloud: () => cloudSyncM.loadSettingsFromCloud.mutateAsync(),
    isSyncingToCloud: cloudSyncM.syncAllToCloud.isPending,
    isDownloadingFromCloud: cloudSyncM.downloadFromCloud.isPending,
    ```

---

## Estructura Final de Directorios (al completar P1 + P2)

```
src/
├── services/
│   ├── accounts.service.ts          ✅ ya existe
│   ├── transactions.service.ts      ✅ ya existe (+ JSDoc en receipt)
│   ├── fixedItems.service.ts        ✅ ya existe
│   ├── goals.service.ts             ✅ ya existe
│   ├── goalFolders.service.ts       ✅ ya existe
│   ├── debts.service.ts             ✅ ya existe
│   ├── settings.service.ts          ✅ ya existe
│   ├── storage.service.ts           ← NUEVO (P1)
│   └── cloudSync.service.ts         ← NUEVO (P2)
│
├── hooks/
│   ├── queries/                     ✅ 6 archivos ya existen
│   ├── mutations/
│   │   ├── useAccountMutations.ts   ✅ ya existe
│   │   ├── useTransactionMutations.ts ✅ ya existe
│   │   ├── useFixedItemMutations.ts ✅ ya existe
│   │   ├── useGoalMutations.ts      ✅ ya existe
│   │   ├── useGoalFolderMutations.ts ✅ ya existe
│   │   ├── useDebtMutations.ts      ✅ ya existe
│   │   ├── useReceiptMutations.ts   ← NUEVO (P1)
│   │   └── useCloudSyncMutations.ts ← NUEVO (P2)
│   └── useFinanceData.ts            ← MODIFICAR (P1 + P2)
│
└── store/
    └── finance-store.ts             ← MODIFICAR (P2: eliminar 3 métodos de red)
```

---

## Criterios de Aceptación

### P1 — Recibos en Storage

- [ ] **CA-P1-01:** `storage.service.ts` no importa React, hooks ni Zustand.
- [ ] **CA-P1-02:** `uploadReceipt` acepta tanto data URL base64 como `Blob`/`File` y en ambos casos sube un binario (no texto) a Supabase Storage.
- [ ] **CA-P1-03:** La ruta de Storage sigue el patrón `{userId}/{receiptId}` para compatibilidad con RLS.
- [ ] **CA-P1-04:** Tras `uploadReceiptForTransaction`, el campo `receipt` de la transacción en Zustand y en Supabase contiene la URL pública de Storage, no un base64.
- [ ] **CA-P1-05:** Tras `deleteReceiptForTransaction`, el archivo se elimina de Storage y el campo `receipt` queda `undefined` en Zustand y en Supabase.
- [ ] **CA-P1-06:** `useFinanceData` expone `uploadReceipt` y `deleteReceipt` con las firmas correctas y los componentes pueden llamarlas sin importar directamente de `storage.service.ts` ni de `useReceiptMutations.ts`.
- [ ] **CA-P1-07:** El build TypeScript (`tsc --noEmit`) pasa sin errores con los nuevos tipos.
- [ ] **CA-P1-08:** Si Supabase Storage no está disponible (`!isSupabaseEnabled`), `uploadReceiptForTransaction` falla con un error claro (no silenciosamente) para que el componente muestre feedback al usuario.

### P2 — Operaciones en Lote Extraídas

- [ ] **CA-P2-01:** `cloudSync.service.ts` no importa React, hooks ni Zustand.
- [ ] **CA-P2-02:** `downloadAllFromCloud` usa los mappers de los servicios existentes (no duplica lógica de mapeo).
- [ ] **CA-P2-03:** `syncAllToCloud` en el servicio acumula errores parciales sin abortar el proceso completo.
- [ ] **CA-P2-04:** `finance-store.ts` ya no contiene `loadSettingsFromCloud`, `downloadFromCloud` ni `syncAllToCloud` en su interfaz ni en su implementación.
- [ ] **CA-P2-05:** `useFinanceData` sigue exponiendo `syncAllToCloud` con el mismo tipo de retorno `Promise<number>` (compatibilidad con componentes existentes).
- [ ] **CA-P2-06:** `useFinanceData` expone `downloadFromCloud` y `loadSettingsFromCloud` como funciones async.
- [ ] **CA-P2-07:** `useFinanceData` expone `isSyncingToCloud` y `isDownloadingFromCloud` como booleanos de estado para la UI.
- [ ] **CA-P2-08:** Ningún componente o página rompe por la eliminación de los métodos del store (el `useShallow` en `useFinanceData` ya no los incluye).
- [ ] **CA-P2-09:** El build TypeScript pasa sin errores.
- [ ] **CA-P2-10:** Los tests existentes en `src/test/` continúan pasando.

### Arquitecturales (Ambos Pendientes)

- [ ] **CA-ARQ-01:** Ninguna función en `src/services/` importa React, hooks de React ni Zustand.
- [ ] **CA-ARQ-02:** `useFinanceData.ts` sigue siendo el **único punto de entrada** para componentes. Ninguna página importa directamente de `storage.service.ts`, `cloudSync.service.ts`, `useReceiptMutations.ts` ni `useCloudSyncMutations.ts`.
- [ ] **CA-ARQ-03:** No existe uso de `any` explícito en los archivos nuevos.
- [ ] **CA-ARQ-04:** Los nuevos `ErrorCodes` usados (`STORAGE_UPLOAD_FAILED`, `STORAGE_DELETE_FAILED`) existen en `src/lib/app-error.ts`. Si no existen, el Constructor debe añadirlos antes de usarlos.

---

## Notas para el Constructor (OpenCode)

1. **Verificar `ErrorCodes` antes de implementar el servicio de storage:** Abrir `src/lib/app-error.ts` y verificar que existan `STORAGE_UPLOAD_FAILED` y `STORAGE_DELETE_FAILED`. Si no existen, añadirlos al enum antes del Paso A.1.

2. **`financeKeys.all` en `useCloudSyncMutations`:** La clave raíz `financeKeys.all` (definida en `queryKeys.ts` como `['finance'] as const`) no existe actualmente como función sino como array directo. Verificar la forma exacta antes de usarla en `invalidateQueries`. Si es un array, la llamada correcta es `{ queryKey: financeKeys.all }` (sin paréntesis).

3. **Compatibilidad de `syncAllToCloud` en `useFinanceData`:** El método `syncAllToCloud` se llama en algún componente o página existente con `await syncAllToCloud()` y espera un `number`. El wrapper en `useFinanceData` debe mantener `() => Promise<number>` usando `.then(r => r.syncedCount)`.

4. **No eliminar `saveReceiptFile` del store:** La función `saveReceiptFile` en `finance-store.ts` gestiona archivos en el filesystem nativo de Capacitor (no en Supabase Storage). Es distinta de `uploadReceipt` del nuevo servicio. No eliminarla.

5. **`downloadFromCloud` en el hook aplica al store via `useFinance.getState().set`:** En Zustand, para hacer un set masivo desde fuera del store, se usa `useFinance.setState({ accounts, transactions, ... })`. No es necesario llamar a las actions individuales.

6. **Orden de implementación es estricto dentro de cada Fase:** A.1 debe completarse antes que A.2 (el hook depende del servicio). B.1 debe completarse antes que B.2. Las Fases A y B son independientes entre sí y pueden implementarse en paralelo.