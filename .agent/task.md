# Tarea Actual: Desacoplamiento de la Capa de Red — TanStack Query + Supabase

> **Rol:** Arquitecto de Software  
> **Restricción:** NO implementar lógica final. Solo definir la estructura, interfaces, imports y criterios de aceptación para que el Constructor (OpenCode) programe cada archivo.

---

## Diagnóstico del Estado Actual

### Problemas identificados

| Archivo | Problema |
|---|---|
| `src/store/slices/account-slice.ts` | Llama directamente a `supabase.from(...).insert/update/delete` dentro del slice de Zustand. **Zustand no debe tocar la red.** |
| `src/store/slices/debt-slice.ts` | Ídem: contiene lógica de `supabase` embebida en mutations de Zustand. |
| `src/store/slices/fixed-slice.ts` | Ídem. |
| `src/store/slices/goal-slice.ts` | Ídem. |
| `src/store/slices/transaction-slice.ts` | Ídem. |
| `src/store/slices/settings-slice.ts` | Llama a `supabase.auth.getSession()` y `supabase.from('user_settings')` directamente dentro de `setTheme` y `setProfile`. |
| `src/hooks/useHybridData.ts` | Hook "Dios": mezcla estado remoto (React Query), estado local (Zustand), lógica de merge y mutations wrapeadas. Debe desmembrarse. |
| `src/hooks/useFinanceData.ts` | Duplica parte de la responsabilidad de `useHybridData.ts`. Redundancia arquitectónica. |
| `src/hooks/useSupabaseQueries.ts` | Contiene funciones `fetch*` y mappers junto a los hooks de query. Se debe separar la capa de acceso a datos (servicios) de los hooks. |

### Responsabilidades actuales incorrectas

```
Zustand slices ──→ llaman a supabase directamente  ← VIOLACIÓN
useHybridData  ──→ mezcla queries + mutations + merges ← VIOLACIÓN
useFinanceData ──→ duplica lógica de useHybridData  ← REDUNDANCIA
```

### Objetivo final

```
Supabase SDK
    ↓
src/services/  (funciones puras fetch* + mutate* + mappers)
    ↓
src/hooks/queries/   (useQuery wrappers por entidad)
src/hooks/mutations/ (useMutation wrappers por entidad)
    ↓
src/hooks/useFinanceData.ts  (hook de fachada: data + mutations + UI state)
    ↓
Componentes / Pages
```

---

## Nueva Estructura de Directorios

```
src/
├── services/                          ← NUEVO: capa de acceso a datos (solo Supabase SDK, sin hooks)
│   ├── accounts.service.ts            ← fetch, insert, update, delete + mapper
│   ├── transactions.service.ts
│   ├── fixedItems.service.ts
│   ├── goals.service.ts
│   ├── goalFolders.service.ts
│   ├── debts.service.ts
│   └── settings.service.ts            ← fetch/upsert user_settings
│
├── hooks/
│   ├── queries/                       ← NUEVO: un archivo por entidad, solo useQuery
│   │   ├── useAccountsQuery.ts
│   │   ├── useTransactionsQuery.ts
│   │   ├── useFixedItemsQuery.ts
│   │   ├── useGoalsQuery.ts
│   │   ├── useGoalFoldersQuery.ts
│   │   └── useDebtsQuery.ts
│   │
│   ├── mutations/                     ← NUEVO: un archivo por entidad, solo useMutation
│   │   ├── useAccountMutations.ts
│   │   ├── useTransactionMutations.ts
│   │   ├── useFixedItemMutations.ts
│   │   ├── useGoalMutations.ts
│   │   ├── useGoalFolderMutations.ts
│   │   └── useDebtMutations.ts
│   │
│   ├── useFinanceData.ts              ← REFACTOR: hook fachada que compone queries + mutations + UI state
│   ├── useSupabaseQueries.ts          ← DEPRECAR: migrar contenido a services/ y hooks/queries/
│   ├── useHybridData.ts               ← ELIMINAR: reemplazado por useFinanceData.ts refactorizado
│   ├── use-mobile.tsx                 ← SIN CAMBIOS
│   ├── use-toast.ts                   ← SIN CAMBIOS
│   ├── useNetwork.ts                  ← SIN CAMBIOS
│   ├── useSessionManager.ts           ← SIN CAMBIOS
│   └── useSystemTheme.ts              ← SIN CAMBIOS
│
├── lib/
│   ├── queryKeys.ts                   ← NUEVO: catálogo centralizado de query keys (extrae de useSupabaseQueries)
│   ├── queryClient.ts                 ← NUEVO: instancia y configuración de QueryClient (extrae de App.tsx)
│   └── ...resto sin cambios
│
├── store/
│   ├── finance-store.ts               ← REFACTOR: eliminar lógica de red, mantener solo estado local
│   ├── slices/
│   │   ├── account-slice.ts           ← REFACTOR: eliminar llamadas a supabase, solo mutación de estado Zustand
│   │   ├── debt-slice.ts              ← REFACTOR: ídem
│   │   ├── fixed-slice.ts             ← REFACTOR: ídem
│   │   ├── goal-slice.ts              ← REFACTOR: ídem
│   │   ├── transaction-slice.ts       ← REFACTOR: ídem
│   │   └── settings-slice.ts          ← REFACTOR: eliminar llamadas a supabase de setTheme/setProfile
│   └── sync-store.ts                  ← SIN CAMBIOS (gestiona la offline queue)
│
└── App.tsx                            ← REFACTOR MENOR: importar queryClient desde lib/queryClient.ts
```

---

## Archivos Afectados

### Archivos a CREAR (nuevos)

| Archivo | Descripción |
|---|---|
| `src/lib/queryKeys.ts` | Catálogo de query keys tipadas |
| `src/lib/queryClient.ts` | Instancia singleton de `QueryClient` |
| `src/services/accounts.service.ts` | Funciones puras de acceso a Supabase para cuentas |
| `src/services/transactions.service.ts` | Funciones puras para transacciones |
| `src/services/fixedItems.service.ts` | Funciones puras para items fijos |
| `src/services/goals.service.ts` | Funciones puras para metas |
| `src/services/goalFolders.service.ts` | Funciones puras para carpetas de metas |
| `src/services/debts.service.ts` | Funciones puras para deudas |
| `src/services/settings.service.ts` | Funciones puras para configuración en nube |
| `src/hooks/queries/useAccountsQuery.ts` | Hook `useQuery` para cuentas |
| `src/hooks/queries/useTransactionsQuery.ts` | Hook `useQuery` para transacciones |
| `src/hooks/queries/useFixedItemsQuery.ts` | Hook `useQuery` para items fijos |
| `src/hooks/queries/useGoalsQuery.ts` | Hook `useQuery` para metas |
| `src/hooks/queries/useGoalFoldersQuery.ts` | Hook `useQuery` para carpetas |
| `src/hooks/queries/useDebtsQuery.ts` | Hook `useQuery` para deudas |
| `src/hooks/mutations/useAccountMutations.ts` | Hooks `useMutation` para cuentas |
| `src/hooks/mutations/useTransactionMutations.ts` | Hooks `useMutation` para transacciones |
| `src/hooks/mutations/useFixedItemMutations.ts` | Hooks `useMutation` para items fijos |
| `src/hooks/mutations/useGoalMutations.ts` | Hooks `useMutation` para metas |
| `src/hooks/mutations/useGoalFolderMutations.ts` | Hooks `useMutation` para carpetas |
| `src/hooks/mutations/useDebtMutations.ts` | Hooks `useMutation` para deudas |

### Archivos a REFACTORIZAR

| Archivo | Cambio requerido |
|---|---|
| `src/store/slices/account-slice.ts` | Eliminar toda importación y uso de `supabase`, `isSupabaseEnabled`, `useSyncStore`. Las actions solo actualizan estado Zustand. |
| `src/store/slices/debt-slice.ts` | Ídem |
| `src/store/slices/fixed-slice.ts` | Ídem |
| `src/store/slices/goal-slice.ts` | Ídem |
| `src/store/slices/transaction-slice.ts` | Ídem |
| `src/store/slices/settings-slice.ts` | Eliminar llamadas a `supabase` dentro de `setTheme` y `setProfile`. La sincronización de settings a la nube se hace vía `useMutation` externo. |
| `src/hooks/useFinanceData.ts` | Refactorizar para importar desde `hooks/queries/*` y `hooks/mutations/*`. Eliminar lógica de merge manual; usar solo datos de React Query como fuente de verdad cuando Supabase está habilitado. |
| `src/App.tsx` | Reemplazar la instanciación inline de `QueryClient` con `import { queryClient } from '@/lib/queryClient'`. |

### Archivos a DEPRECAR / ELIMINAR (en orden)

| Archivo | Acción |
|---|---|
| `src/hooks/useSupabaseQueries.ts` | Deprecar: migrar `fetch*` y mappers a `services/`, migrar `financeKeys` a `lib/queryKeys.ts`, migrar hooks `use*` a `hooks/queries/*`. Eliminar el archivo al finalizar. |
| `src/hooks/useHybridData.ts` | Eliminar al completar el refactor de `useFinanceData.ts`. |

---

## Imports Exactos y Dependencias

### `src/lib/queryKeys.ts`
```typescript
// Sin imports externos. Solo exports de constantes.
```

### `src/lib/queryClient.ts`
```typescript
import { QueryClient } from '@tanstack/react-query';
```

### `src/services/*.service.ts` (patrón común)
```typescript
import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
import type { /* entidad correspondiente */ } from '@/lib/finance';
// NO importar React, NO importar hooks, NO importar Zustand
```

### `src/hooks/queries/use*Query.ts` (patrón común)
```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { fetch<Entidad> } from '@/services/<entidad>.service';
import { AppError, ErrorCodes } from '@/lib/app-error';
```

### `src/hooks/mutations/use*Mutations.ts` (patrón común)
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { insert<Entidad>, update<Entidad>, delete<Entidad> } from '@/services/<entidad>.service';
import { useSyncStore } from '@/store/sync-store';
// (useSyncStore solo para encolar mutations offline)
```

### `src/hooks/useFinanceData.ts` (refactorizado)
```typescript
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAccountsQuery } from '@/hooks/queries/useAccountsQuery';
import { useTransactionsQuery } from '@/hooks/queries/useTransactionsQuery';
import { useFixedItemsQuery } from '@/hooks/queries/useFixedItemsQuery';
import { useGoalsQuery } from '@/hooks/queries/useGoalsQuery';
import { useGoalFoldersQuery } from '@/hooks/queries/useGoalFoldersQuery';
import { useDebtsQuery } from '@/hooks/queries/useDebtsQuery';
import { useAccountMutations } from '@/hooks/mutations/useAccountMutations';
import { useTransactionMutations } from '@/hooks/mutations/useTransactionMutations';
import { useFixedItemMutations } from '@/hooks/mutations/useFixedItemMutations';
import { useGoalMutations } from '@/hooks/mutations/useGoalMutations';
import { useGoalFolderMutations } from '@/hooks/mutations/useGoalFolderMutations';
import { useDebtMutations } from '@/hooks/mutations/useDebtMutations';
import type { /* todos los tipos de dominio */ } from '@/lib/finance';
import type { ExportScopes } from '@/store/finance-store';
```

### Slices refactorizados — imports ELIMINADOS
```typescript
// ELIMINAR de todos los slices:
import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync-store';

// MANTENER en todos los slices:
import { StateCreator } from 'zustand';
import { /* tipos de dominio */ } from '@/lib/finance';
import { validateAndThrow, generateSecureId } from '@/lib/sanitizers';
```

---

## Interfaces y Tipos de TypeScript

### `src/lib/queryKeys.ts` — Catálogo de claves tipadas

```typescript
// Tipo inferido del factory object para type-safety en invalidaciones
export const financeKeys = {
  all: ['finance'] as const,
  accounts: () => ['accounts'] as const,
  transactions: () => ['transactions'] as const,
  fixedItems: () => ['fixed_items'] as const,
  goals: () => ['goals'] as const,
  goalFolders: () => ['goal_folders'] as const,
  debts: () => ['debts'] as const,
  userSettings: (userId: string) => ['user_settings', userId] as const,
} as const;

export type FinanceQueryKey = ReturnType<typeof financeKeys[keyof typeof financeKeys]>;
```

### `src/services/accounts.service.ts` — Interfaces de servicio

```typescript
// Tipo de fila cruda de Supabase (antes de mapear a dominio)
interface AccountRow {
  id: string;
  name: string;
  type: string;
  initial_balance: number | null;
  currency: string | null;
  denominations: unknown[] | null;
  clabe: string | null;
  bank: string | null;
  holder_name: string | null;
}

// Payload para INSERT/UPDATE en Supabase
interface AccountInsertPayload {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_balance: number | undefined;
  currency: string | undefined;
  denominations: unknown[] | undefined;
  clabe: string | undefined;
  bank: string | undefined;
  holder_name: string | undefined;
}

interface AccountUpdatePayload extends Partial<Omit<AccountInsertPayload, 'id' | 'user_id'>> {}

// Firmas de funciones exportadas
export async function fetchAccounts(userId: string): Promise<Account[]>;
export async function insertAccount(userId: string, account: Account): Promise<void>;
export async function updateAccount(id: string, patch: Partial<Account>): Promise<void>;
export async function deleteAccount(id: string): Promise<void>;
export function mapAccountFromDb(row: AccountRow): Account;
```

### `src/hooks/queries/useAccountsQuery.ts` — Tipo de retorno

```typescript
// Retorna el tipo estándar de useQuery de TanStack
import type { UseQueryResult } from '@tanstack/react-query';
import type { Account } from '@/lib/finance';

export function useAccountsQuery(): UseQueryResult<Account[], Error>;
```

### `src/hooks/mutations/useAccountMutations.ts` — Tipo de retorno

```typescript
import type { UseMutationResult } from '@tanstack/react-query';
import type { Account } from '@/lib/finance';

export interface AccountMutations {
  addAccount: UseMutationResult<void, Error, Omit<Account, 'id'>>;
  updateAccount: UseMutationResult<void, Error, { id: string; patch: Partial<Account> }>;
  removeAccount: UseMutationResult<void, Error, string>;
  mergeAccounts: UseMutationResult<void, Error, { fromIds: string[]; intoId: string }>;
}

export function useAccountMutations(): AccountMutations;
```

### Patrón repetido para cada entidad (Transactions, FixedItems, Goals, GoalFolders, Debts)

```typescript
// Cada mutations hook retorna una interfaz con:
// - add<Entidad>: UseMutationResult<void, Error, Omit<Entidad, 'id'>>
// - update<Entidad>: UseMutationResult<void, Error, { id: string; patch: Partial<Entidad> }>
// - remove<Entidad>: UseMutationResult<void, Error, string>
// Más mutations específicas según la entidad (ej: toggleFixed, contributeGoal, addDebtPayment)
```

### `src/hooks/useFinanceData.ts` — Tipo de retorno refactorizado

```typescript
// Estado de servidor (fuente: React Query cuando isSupabaseEnabled && session)
// Estado UI (fuente: Zustand siempre)
// Mutations (fuente: useMutation hooks — ejecutan en Supabase Y actualizan Zustand local)

interface UseFinanceDataReturn {
  // --- Datos de servidor (React Query como source of truth) ---
  accounts: Account[];
  transactions: Transaction[];
  fixedItems: FixedItem[];
  goals: Goal[];
  goalFolders: GoalFolder[];
  debts: Debt[];

  // --- Estado de carga del servidor ---
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetchAll: () => void;

  // --- Mutations de red (React Query useMutation) ---
  // accounts
  addAccount: (a: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, patch: Partial<Account>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  mergeAccounts: (fromIds: string[], intoId: string) => Promise<void>;
  // ... (todas las mutations por entidad)

  // --- Estado de UI (Zustand — NO tocar la red) ---
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  activeYear: number;
  activeMonth: number;
  setActive: (year: number, month: number) => void;
  resetToToday: () => void;
  syncFiltersToURL: boolean;
  setSyncFiltersToURL: (v: boolean) => void;
  changeLog: ChangeLogEntry[];
  clearChangeLog: () => void;
  appSettings: AppSettings;
  setAccentColor: (color: AccentColor) => void;
  setCompactMode: (compact: boolean) => void;
  setGlassEffect: (glass: boolean) => void;

  // --- Operaciones de datos locales (Zustand) ---
  ensureScheduledTransactions: () => void;
  exportData: (scopes?: ExportScopes) => string;
  importData: (json: string, scopes?: ExportScopes) => Promise<{ ok: boolean; error?: string; warnings?: string[] }>;
  resetAll: () => void;
  migrateReceiptsInPlace: () => Promise<void>;
  cleanupOrphanReceipts: (deleteFiles?: boolean) => Promise<{ orphans: string[]; freedBytes: number }>;
}
```

### `src/store/slices/account-slice.ts` — Interfaz reducida post-refactor

```typescript
// ANTES: addAccount era async y llamaba a supabase
// DESPUÉS: addAccount es síncrono, solo muta el store local

export interface AccountSlice {
  accounts: Account[];
  addAccount: (a: Omit<Account, 'id'>) => void;           // ← sync, no async
  updateAccount: (id: string, p: Partial<Account>) => void; // ← sync
  removeAccount: (id: string) => void;                     // ← sync
  mergeAccounts: (fromIds: string[], intoId: string) => void;
}
```

> **Nota para el Constructor:** Mismo patrón aplica para `DebtSlice`, `FixedSlice`, `GoalSlice`, `TransactionSlice`. Cambiar todos los `async` a `void`/sync. Eliminar `await supabase.*` y `queueMutation(...)`.

### Flujo de Mutation (con optimistic update)

```
Usuario acción
    ↓
useMutation.mutate(payload)
    ├─→ onMutate: useFinance.getState().add<Entidad>(payload)  ← Optimistic update local inmediato
    ├─→ mutationFn: insert<Entidad>(userId, payload)           ← Llamada a Supabase (servicio)
    ├─→ onSuccess: queryClient.invalidateQueries(financeKeys.<entidad>())  ← Refresca caché
    └─→ onError: queryClient.invalidateQueries(...)            ← Rollback refresca con datos reales
```

---

## Plan de Acción Paso a Paso

### FASE 1 — Infraestructura base (sin romper nada)

#### Paso 1.1 — Crear `src/lib/queryKeys.ts`
- Extraer el objeto `financeKeys` de `useSupabaseQueries.ts`.
- Añadir `userSettings` como nueva clave.
- Exportar tipo `FinanceQueryKey`.

#### Paso 1.2 — Crear `src/lib/queryClient.ts`
- Mover la instanciación de `QueryClient` desde `App.tsx`.
- Exportar como singleton `queryClient`.
- `App.tsx` debe importar: `import { queryClient } from '@/lib/queryClient'`.

### FASE 2 — Capa de servicios (acceso puro a Supabase)

#### Paso 2.1 — Crear `src/services/accounts.service.ts`
- Mover `fetchAccounts` y `mapAccountFromDb` desde `useSupabaseQueries.ts`.
- Añadir funciones: `insertAccount(userId, account)`, `updateAccount(id, patch)`, `deleteAccount(id)`.
- Lógica interna: construir payload DB (snake_case), llamar a `supabase.from('accounts').*`.
- Manejar errores con `AppError(ErrorCodes.DB_QUERY_FAILED, ...)`.
- **NO importar React. NO importar hooks. NO importar Zustand.**

#### Paso 2.2 — Crear `src/services/transactions.service.ts`
- Mover `fetchTransactions` y `mapTransactionFromDb`.
- Añadir: `insertTransaction`, `updateTransaction`, `deleteTransaction`.

#### Paso 2.3 — Crear `src/services/fixedItems.service.ts`
- Mover `fetchFixedItems` y `mapFixedItemFromDb`.
- Añadir: `insertFixedItem`, `updateFixedItem`, `deleteFixedItem`, `toggleFixedItemActive`.

#### Paso 2.4 — Crear `src/services/goals.service.ts`
- Mover `fetchGoals` y `mapGoalFromDb`.
- Añadir: `insertGoal`, `updateGoal`, `deleteGoal`, `addGoalContribution`.

#### Paso 2.5 — Crear `src/services/goalFolders.service.ts`
- Mover `fetchGoalFolders` y `mapGoalFolderFromDb`.
- Añadir: `insertGoalFolder`, `updateGoalFolder`, `deleteGoalFolder`, `reorderGoalFolders`.

#### Paso 2.6 — Crear `src/services/debts.service.ts`
- Mover `fetchDebts` y `mapDebtFromDb`.
- Añadir: `insertDebt`, `updateDebt`, `deleteDebt`, `insertDebtPayment`, `deleteDebtPayment`.

#### Paso 2.7 — Crear `src/services/settings.service.ts`
- Funciones: `fetchUserSettings(userId)`, `upsertUserSettings(userId, settings)`.
- Tabla Supabase: `user_settings` con campos `theme`, `profile`, `accent_color`, `compact_mode`, `glass_effect`.

### FASE 3 — Hooks de Query (solo lectura, React Query)

> **Regla:** Cada hook exporta UNA función. Usa `useQuery`. Llama al servicio correspondiente. Usa `financeKeys` de `queryKeys.ts`. Habilita solo si `isSupabaseEnabled && !loading && !!session`.

#### Paso 3.1 — Crear `src/hooks/queries/useAccountsQuery.ts`
```
queryKey: financeKeys.accounts()
queryFn: () => fetchAccounts(session.user.id)
staleTime: 1000 * 60 * 30  // 30 min (cuentas cambian poco)
```

#### Paso 3.2 — Crear `src/hooks/queries/useTransactionsQuery.ts`
```
queryKey: financeKeys.transactions()
queryFn: () => fetchTransactions(session.user.id)
staleTime: 1000 * 60 * 5   // 5 min (alta frecuencia de cambio)
```

#### Paso 3.3 — Crear `src/hooks/queries/useFixedItemsQuery.ts`
```
queryKey: financeKeys.fixedItems()
staleTime: 1000 * 60 * 15  // 15 min
```

#### Paso 3.4 — Crear `src/hooks/queries/useGoalsQuery.ts`
```
queryKey: financeKeys.goals()
staleTime: 1000 * 60 * 15  // 15 min
```

#### Paso 3.5 — Crear `src/hooks/queries/useGoalFoldersQuery.ts`
```
queryKey: financeKeys.goalFolders()
staleTime: 1000 * 60 * 15  // 15 min
```

#### Paso 3.6 — Crear `src/hooks/queries/useDebtsQuery.ts`
```
queryKey: financeKeys.debts()
staleTime: 1000 * 60 * 15  // 15 min
```

### FASE 4 — Hooks de Mutation (escritura, React Query + Zustand local)

> **Regla:** Cada useMutation debe:
> 1. `onMutate`: llamar al action de Zustand para actualización optimista inmediata en UI.
> 2. `mutationFn`: llamar a la función del servicio correspondiente.
> 3. `onSuccess`: `queryClient.invalidateQueries(financeKeys.<entidad>())`.
> 4. `onError`: `queryClient.invalidateQueries(...)` para hacer rollback con datos reales del servidor.
> 5. Si `!isSupabaseEnabled` o usuario offline: solo ejecutar Zustand action, encolar en `useSyncStore` si aplica.

#### Paso 4.1 — Crear `src/hooks/mutations/useAccountMutations.ts`
- Mutations: `addAccount`, `updateAccount`, `removeAccount`, `mergeAccounts`.

#### Paso 4.2 — Crear `src/hooks/mutations/useTransactionMutations.ts`
- Mutations: `addTransaction`, `updateTransaction`, `removeTransaction`.

#### Paso 4.3 — Crear `src/hooks/mutations/useFixedItemMutations.ts`
- Mutations: `addFixedItem`, `updateFixedItem`, `removeFixedItem`, `toggleFixedItem`.

#### Paso 4.4 — Crear `src/hooks/mutations/useGoalMutations.ts`
- Mutations: `addGoal`, `updateGoal`, `removeGoal`, `contributeToGoal`.

#### Paso 4.5 — Crear `src/hooks/mutations/useGoalFolderMutations.ts`
- Mutations: `addGoalFolder`, `updateGoalFolder`, `removeGoalFolder`, `reorderGoalFolders`.

#### Paso 4.6 — Crear `src/hooks/mutations/useDebtMutations.ts`
- Mutations: `addDebt`, `updateDebt`, `removeDebt`, `addDebtPayment`, `removeDebtPayment`.

### FASE 5 — Limpiar los Slices de Zustand

> **Regla:** Los slices SOLO gestionan estado en memoria. PROHIBIDO llamar a Supabase. PROHIBIDO `await`. Todas las funciones deben ser síncronas (`() => void`).

#### Paso 5.1 — Refactorizar `src/store/slices/account-slice.ts`
- Eliminar imports: `supabase`, `isSupabaseEnabled`, `useSyncStore`.
- Convertir `addAccount`, `updateAccount`, `removeAccount` a funciones síncronas.
- Eliminar todo bloque `if (isSupabaseEnabled) { ... }`.

#### Paso 5.2 — Refactorizar `src/store/slices/transaction-slice.ts`
- Ídem Paso 5.1.

#### Paso 5.3 — Refactorizar `src/store/slices/fixed-slice.ts`
- Ídem Paso 5.1.

#### Paso 5.4 — Refactorizar `src/store/slices/goal-slice.ts`
- Ídem Paso 5.1. `contributeGoal` también se vuelve síncrono (solo actualiza estado local).

#### Paso 5.5 — Refactorizar `src/store/slices/debt-slice.ts`
- Ídem Paso 5.1.

#### Paso 5.6 — Refactorizar `src/store/slices/settings-slice.ts`
- En `setTheme`: eliminar el bloque `if (isSupabaseEnabled) { supabase.from('user_settings').upsert... }`. Solo `set({ theme: t })`.
- En `setProfile`: ídem. Solo `set((s) => ({ profile: { ...s.profile, ...p } }))`.
- La sincronización de settings a la nube se gestionará externamente via `settings.service.ts` llamado desde un `useMutation` en el hook de mutations de settings (o directamente desde `useFinanceData`).

### FASE 6 — Refactorizar `useFinanceData.ts` (hook fachada)

#### Paso 6.1
- Importar todos los hooks de `hooks/queries/*` y `hooks/mutations/*`.
- Para los datos: si `isSupabaseEnabled && session && query.data`, usar datos del query. Sino, usar datos de Zustand.
- Para las mutations: exponer directamente las funciones de los mutation hooks.
- Para el estado UI: acceder a Zustand via `useShallow` para: `theme`, `profile`, `activeYear`, `activeMonth`, `syncFiltersToURL`, `changeLog`, `appSettings`.
- Para operaciones locales: acceder a Zustand para: `exportData`, `importData`, `resetAll`, `ensureScheduledTransactions`, `migrateReceiptsInPlace`, `cleanupOrphanReceipts`.

### FASE 7 — Deprecar y eliminar hooks obsoletos

#### Paso 7.1 — Deprecar `src/hooks/useSupabaseQueries.ts`
- Al finalizar Fases 2 y 3, verificar que nadie más importe de este archivo.
- Buscar en todo el proyecto: `from '@/hooks/useSupabaseQueries'`.
- Cuando 0 importaciones, eliminar el archivo.

#### Paso 7.2 — Eliminar `src/hooks/useHybridData.ts`
- Verificar que nadie importe de este archivo.
- Buscar: `from '@/hooks/useHybridData'`.
- Cuando 0 importaciones, eliminar el archivo.

### FASE 8 — Sincronización de Settings a la nube (settings-mutations)

> Dado que `settings-slice.ts` ya no hará llamadas a Supabase, se necesita un mecanismo externo para sincronizar `theme` y `profile` cuando cambien.

#### Paso 8.1 — Opción A (recomendada): `useEffect` reactivo en `useFinanceData.ts`
- Observar `theme` y `profile` del store de Zustand.
- Cuando cambien Y `isSupabaseEnabled && session`, llamar a `upsertUserSettings(userId, { theme, profile })` del `settings.service.ts`.
- Usar `useMutation` o llamada directa fire-and-forget con manejo silencioso de errores.

#### Paso 8.2 — Actualizar `useFinanceData.ts` para cargar settings al login
- Al detectar `session` por primera vez, hacer `fetchUserSettings(userId)` y aplicar al store Zustand con `setTheme` y `setProfile`.

---

## Criterios de Aceptación

### Funcionales

- [ ] **CA-01:** Al crear/editar/eliminar una cuenta, la operación se escribe en Supabase vía `accounts.service.ts` y el caché de React Query se invalida automáticamente.
- [ ] **CA-02:** Al crear/editar/eliminar una transacción, el caché de `['transactions']` se invalida automáticamente y la UI refleja los cambios sin recargar la página.
- [ ] **CA-03:** En modo offline (`!navigator.onLine`), las mutations solo actualizan Zustand localmente y encolan en `sync-store.ts`. No intentan llamar a Supabase.
- [ ] **CA-04:** Cuando `isSupabaseEnabled` es `false`, toda la app funciona en modo local-only con Zustand sin errores de red.
- [ ] **CA-05:** El `theme` y `profile` del usuario se sincronizan a la tabla `user_settings` cuando el usuario está autenticado y cambia estas preferencias.
- [ ] **CA-06:** Al hacer login, el `theme` y `profile` guardados en la nube se cargan y aplican al store Zustand.
- [ ] **CA-07:** `useHybridData.ts` puede ser eliminado sin romper ningún componente ni página.
- [ ] **CA-08:** La función de optimistic update funciona correctamente: la UI responde instantáneamente antes de que Supabase confirme la operación.

### Arquitecturales

- [ ] **CA-09:** Ningún slice de Zustand (`account-slice.ts`, `transaction-slice.ts`, etc.) contiene importaciones de `supabase` ni llamadas de red.
- [ ] **CA-10:** Ninguna función en `src/services/` importa React, hooks de React, ni Zustand.
- [ ] **CA-11:** Ningún hook en `src/hooks/queries/` contiene lógica de mutación (INSERT/UPDATE/DELETE).
- [ ] **CA-12:** Ningún hook en `src/hooks/mutations/` hace `useQuery`.
- [ ] **CA-13:** `useFinanceData.ts` es el único punto de entrada para los componentes. Las páginas y componentes NO importan directamente de `hooks/queries/*` ni `hooks/mutations/*`.
- [ ] **CA-14:** `queryClient` se instancia en un único lugar (`src/lib/queryClient.ts`) y se importa donde se necesite.
- [ ] **CA-15:** `financeKeys` se define en un único lugar (`src/lib/queryKeys.ts`).

### Calidad y Tests

- [ ] **CA-16:** El build de TypeScript (`tsc --noEmit`) pasa sin errores con tipado estricto en todos los archivos nuevos.
- [ ] **CA-17:** Los tests existentes en `src/test/` continúan pasando sin modificación.
- [ ] **CA-18:** No existe uso de `any` explícito en los archivos nuevos. Los mappers usan tipos intermedios (ej. `AccountRow`).

---

## Notas para el Constructor (OpenCode)

1. **Orden de implementación es estricto:** Respetar las Fases 1→8. Cambiar los slices (Fase 5) ANTES de actualizar `useFinanceData.ts` (Fase 6) para evitar regresiones.

2. **Optimistic update en mutations:** El patrón `onMutate → mutationFn → onSuccess/onError` debe implementarse en TODAS las mutations. No simplificar a solo `mutationFn + onSuccess`.

3. **Rollback:** Si `mutationFn` falla, `onError` debe llamar a `queryClient.invalidateQueries(...)` para refrescar el estado del servidor y revertir el estado optimista.

4. **Offline detection:** En cada `mutationFn`, verificar `navigator.onLine`. Si offline, lanzar un error controlado que el `onError` capturará para encolar en `sync-store.ts`.

5. **`useHybridData.ts` tiene código de deuda técnica:** La función `wrappedAddDebtPayment` accede directamente a `useFinance.getState()` con lógica de negocio compleja. Al migrar a `useDebtMutations.ts`, esta lógica debe ser simplificada o marcada con `// TODO: Implementar lógica core` si es demasiado compleja.

6. **Compatibilidad:** `useFinanceData.ts` refactorizado debe exponer exactamente las mismas propiedades que la versión actual (mismos nombres, mismos tipos de retorno) para no romper ningún componente consumidor.