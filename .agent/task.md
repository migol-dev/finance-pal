# Diagnóstico: Abono rápido a Meta — Transacción no se persiste en Supabase

> **Estado:** 🔴 BUG CONFIRMADO — arquitectura incompleta identificada
> **Archivos involucrados:**
> - [`src/pages/Metas.tsx`](../src/pages/Metas.tsx) — UI del botón de abono
> - [`src/hooks/useFinanceData.ts`](../src/hooks/useFinanceData.ts) — Fachada de datos
> - [`src/hooks/mutations/useGoalMutations.ts`](../src/hooks/mutations/useGoalMutations.ts) — **Raíz del bug**
> - [`src/store/slices/goal-slice.ts`](../src/store/slices/goal-slice.ts) — Zustand local
> - [`src/services/goals.service.ts`](../src/services/goals.service.ts) — Capa Supabase de metas
> - [`src/services/transactions.service.ts`](../src/services/transactions.service.ts) — Capa Supabase de transacciones

---

## 1. Mapa del flujo actual (rastreo completo)

```
GoalCompactCard (Metas.tsx:476)
  └─► handleQuickAdd(amount)
      └─► setConfirmOpen({ amount })
          └─► ElegantConfirm.onConfirm()
              └─► onContribute(amount, undefined, defaultAccountId)   [Metas.tsx:530]
                  │
                  │  onContribute viene de:
                  │  GoalCompactCard prop ← Metas.tsx:435
                  │  (amt, date, acc) => contributeGoal(g.id, amt, date, acc)
                  ▼
useFinanceData.contributeGoal (useFinanceData.ts:285-286)
  └─► goalM.contributeToGoal.mutateAsync({ id, amount, date, accountId })
      │
      │  goalM = useGoalMutations()
      ▼
useGoalMutations.contributeToGoal (useGoalMutations.ts:102-134)
  ├─► onMutate:  useFinance.getState().contributeGoal(...)     ← Zustand local ✅
  └─► mutationFn: addGoalContributionService(userId, goalId, input)  ← Supabase
      │
      ▼
goals.service.addGoalContribution (goals.service.ts:157-198)
  ├─► SELECT saved, contributions FROM goals WHERE id=goalId
  ├─► UPDATE goals SET saved=..., contributions=[...newContrib]
  └─► ❌ NO llama a insertTransaction()
      ❌ NO toca la tabla 'transactions'
```

---

## 2. Diagnóstico preciso: ¿Qué falla exactamente?

### Bug primario — `goals.service.addGoalContribution` no inserta la transacción

**Archivo:** [`src/services/goals.service.ts`](../src/services/goals.service.ts) — líneas 157–198

La función `addGoalContribution` en Supabase solo actualiza la tabla `goals`:
```ts
// SOLO actualiza goals — NUNCA toca transactions
const { error: updateError } = await supabase
  .from('goals')
  .update({ saved: newSaved, contributions: [...currentContributions, newContribution] })
  .eq('id', goalId);
```

No existe ninguna llamada a `insertTransaction()` ni a la tabla `transactions`.

---

### Bug secundario — `goal-slice.contributeGoal` crea la transacción solo en Zustand local

**Archivo:** [`src/store/slices/goal-slice.ts`](../src/store/slices/goal-slice.ts) — líneas 89–131

El slice de Zustand SÍ construye la transacción y la añade al array local:
```ts
contributeGoal: (idv, amount, date, accountId) =>
  set((s) => {
    const txId = generateSecureId();
    return {
      goals: [...], // actualiza meta ✅
      transactions: [
        {
          id: txId,
          type: amount >= 0 ? 'saving' : 'income',
          category: 'Meta',
          concept: `Aporte ${g?.name}`,
          amount: Math.abs(amount),
          date: when,
          accountId,
          paymentMethod: method,
        },
        ...s.transactions,
      ],  // ← SOLO EN ZUSTAND, nunca llega a Supabase ❌
    };
  }),
```

Esta transacción existe en memoria durante la sesión pero:
- ❌ No se llama a `insertTransaction()` en Supabase
- ❌ No pasa por `useTransactionMutations` ni `txM.addTransaction`
- ❌ No pasa por React Query → no se invalida `financeKeys.transactions()`
- ❌ Al recargar la página, la transacción desaparece porque React Query re-fetcha desde Supabase

---

### Bug terciario — Invalidación de cache insuficiente en `onSuccess`

**Archivo:** [`src/hooks/mutations/useGoalMutations.ts`](../src/hooks/mutations/useGoalMutations.ts) — líneas 126–128

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
  queryClient.invalidateQueries({ queryKey: financeKeys.transactions() }); // ← invalidada pero vacía
},
```

Aunque `onSuccess` invalida `financeKeys.transactions()`, esto solo provoca que React Query re-fetchee desde Supabase, lo que **sobreescribe** la transacción local (de Zustand) con los datos reales de Supabase — donde la transacción no existe. La UI parece correcta brevemente gracias al optimistic update de Zustand, pero al recargar desaparece.

---

## 3. Confirmación de la hipótesis

**La hipótesis es correcta y se puede especificar con precisión:**

> La arquitectura actual tiene una **brecha de sincronización de dos capas**:
> 1. `goal-slice.contributeGoal` (Zustand) crea la transacción **en memoria** ✅
> 2. `addGoalContributionService` (Supabase) actualiza la meta en la BD ✅  
> 3. **FALTA:** Nadie llama a `insertTransaction(userId, tx)` en Supabase ❌

El `goal-slice` fue diseñado antes de la capa React Query y asumía que el sync a Supabase lo haría el sync engine posterior. Con la arquitectura actual de mutations por entidad, esa responsabilidad debe estar en `contributeToGoal.mutationFn`.

---

## 4. Tabla de responsabilidades: estado actual vs esperado

| Responsabilidad | Estado actual | Estado esperado |
|---|---|---|
| Actualizar `goal.saved` en Zustand | ✅ `goal-slice.contributeGoal` | ✅ igual |
| Añadir transacción a `ui.transactions` en Zustand | ✅ `goal-slice.contributeGoal` | ✅ igual |
| Actualizar `goal.saved` en Supabase | ✅ `addGoalContributionService` | ✅ igual |
| Añadir transacción en Supabase | ❌ **NO existe** | ❌ **FALTA** |
| Invalidar caché de transacciones | ✅ `onSuccess` (pero inútil) | ✅ igual |

---

## 5. Análisis de impacto en ambos modos (Supabase ON/OFF)

### Modo offline (`isOffline() === true`)

```ts
// useGoalMutations.ts línea 104-115
if (!isSupabaseEnabled || isOffline()) {
  const state = useFinance.getState();
  const updatedGoal = state.goals.find(g => g.id === input.id);
  if (updatedGoal) {
    useSyncStore.getState().addMutation({
      table: 'goals',
      action: 'UPDATE',
      recordId: updatedGoal.id,
      payload: { saved: updatedGoal.saved, contributions: updatedGoal.contributions }
    });
  }
  return; // ← No encola la transacción tampoco ❌
}
```

En modo offline TAMBIÉN falta encolar la mutación de transacción en el `useSyncStore`.

### Modo online con Supabase activado

Como se describió: `addGoalContributionService` no llama a `insertTransaction`.

---

## 6. Plan de solución exacto (5 pasos)

### Paso 1 — Añadir `insertTransaction` al servicio de metas

**Archivo:** `src/services/goals.service.ts`

Importar `insertTransaction` al principio:
```ts
import { insertTransaction } from '@/services/transactions.service';
import type { Transaction } from '@/lib/finance';
import { generateSecureId } from '@/lib/sanitizers';
```

Extender la interfaz de input para recibir el `userId` que necesita `insertTransaction`:
```ts
export interface GoalContributionInput {
  amount: number;
  date?: string;
  accountId?: string;
  // Añadir para construir la transacción:
  goalName?: string;  // para el campo "concept"
}
```

Al final de `addGoalContribution`, después del `UPDATE` exitoso, insertar la transacción:
```ts
// --- Después del UPDATE de goal exitoso ---
const method: Transaction['paymentMethod'] =
  input.accountId
    ? (input.amount >= 0 ? 'transfer' : 'cash') // simplificado; el slice tiene la lógica
    : 'cash';

const tx: Transaction = {
  id: crypto.randomUUID(),
  type: input.amount >= 0 ? 'saving' : 'income',
  category: 'Meta',
  concept: `${input.amount >= 0 ? 'Aporte' : 'Retiro'} ${input.goalName ?? 'Meta'}`,
  amount: Math.abs(input.amount),
  date: input.date ?? new Date().toISOString(),
  accountId: input.accountId,
  paymentMethod: method,
};

await insertTransaction(userId, tx);
```

> [!IMPORTANT]
> `addGoalContribution` ya recibe `userId` como primer parámetro, por lo que `insertTransaction(userId, tx)` funciona sin cambios adicionales.

---

### Paso 2 — Sincronizar el `txId` entre Zustand y Supabase

**Problema de coherencia:** El `goal-slice` genera su propio `txId = generateSecureId()` en `contributeGoal`, y el servicio generaría otro UUID diferente con `crypto.randomUUID()`. Esto crea dos registros con IDs distintos, uno en Zustand y otro en Supabase.

**Solución:** Propagar el `txId` desde `useGoalMutations.onMutate` al `mutationFn`:

**Archivo:** `src/hooks/mutations/useGoalMutations.ts`

Modificar `ContributeToGoalInput` para incluir el `txId`:
```ts
export interface ContributeToGoalInput {
  id: string;
  amount: number;
  date?: string;
  accountId?: string;
  goalName?: string; // Añadir para pasar al servicio
}
```

En `onMutate`, capturar el `txId` generado por Zustand antes de que se ejecute:

```ts
onMutate: async ({ id, amount, date, accountId }) => {
  // Zustand genera txId internamente en contributeGoal
  // Para sincronizar IDs necesitamos extraer el tx recién creado
  useFinance.getState().contributeGoal(id, amount, date, accountId);
  // Alternativa más limpia: ver Paso 3
},
```

> [!TIP]
> La solución más limpia es que `goal-slice.contributeGoal` **devuelva el txId** generado, o que el `txId` se genere **en `useGoalMutations`** y se pase como parámetro tanto a Zustand como a Supabase. Ver Paso 3.

---

### Paso 3 — Refactorizar la generación de `txId` a `useGoalMutations`

**Archivo:** `src/hooks/mutations/useGoalMutations.ts`

La solución correcta es generar el `txId` en el hook de mutación (que tiene visibilidad de toda la operación) y pasarlo a ambas capas:

```ts
// Añadir txId al input
export interface ContributeToGoalInput {
  id: string;
  amount: number;
  date?: string;
  accountId?: string;
  goalName?: string;
  txId?: string; // ID predeterminado para sincronizar ambas capas
}

const contributeToGoal = useMutation<void, Error, ContributeToGoalInput>({
  mutationFn: async (input) => {
    const { id, amount, date, accountId, goalName, txId } = input;

    if (!isSupabaseEnabled || isOffline()) {
      // Offline: encolar AMBAS mutations
      const state = useFinance.getState();
      const updatedGoal = state.goals.find(g => g.id === id);
      if (updatedGoal) {
        useSyncStore.getState().addMutation({
          table: 'goals',
          action: 'UPDATE',
          recordId: updatedGoal.id,
          payload: { saved: updatedGoal.saved, contributions: updatedGoal.contributions }
        });
      }
      // Encolar también la transacción offline
      const method = accountId ? 'transfer' : 'cash';
      useSyncStore.getState().addMutation({
        table: 'transactions',
        action: 'INSERT',
        recordId: txId ?? crypto.randomUUID(),
        payload: {
          type: amount >= 0 ? 'saving' : 'income',
          category: 'Meta',
          concept: `${amount >= 0 ? 'Aporte' : 'Retiro'} ${goalName ?? 'Meta'}`,
          amount: Math.abs(amount),
          date: date ?? new Date().toISOString(),
          accountId,
          paymentMethod: method,
        }
      });
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('No user');

    // Online: ambas operaciones en Supabase
    await addGoalContributionService(data.user.id, id, { amount, date, accountId, goalName });
    // La transacción se inserta dentro de addGoalContributionService (Paso 1)
    // O se puede hacer aquí para más control:
    // await insertTransactionService(data.user.id, buildTx(txId, input, goalName));
  },

  onMutate: async ({ id, amount, date, accountId }) => {
    // Zustand actualiza optimistamente meta + transacción local
    useFinance.getState().contributeGoal(id, amount, date, accountId);
  },

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
  },
  onError: () => {
    queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
    queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
  },
});
```

---

### Paso 4 — Pasar `goalName` desde el sitio de llamada

**Archivo:** `src/hooks/useFinanceData.ts`

La firma actual de `contributeGoal` en la fachada es:
```ts
// ACTUAL (línea 285-286)
contributeGoal: (id: string, amount: number, date?: string, accountId?: string) =>
  goalM.contributeToGoal.mutateAsync({ id, amount, date, accountId }),
```

Para que el servicio pueda construir el concepto de la transacción necesita el nombre de la meta. La solución más simple es que el hook de mutación lo resuelva internamente desde Zustand:

```ts
// En useGoalMutations.ts — dentro de mutationFn, antes de llamar al servicio
const state = useFinance.getState();
const goal = state.goals.find(g => g.id === input.id);
const goalName = goal?.name ?? 'Meta';
```

Esto evita cambiar la firma pública de `contributeGoal` en `useFinanceData`.

---

### Paso 5 — Verificar el `onSuccess` e invalidación

El `onSuccess` actual ya invalida correctamente ambas queries:
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: financeKeys.goals() });
  queryClient.invalidateQueries({ queryKey: financeKeys.transactions() }); // ✅ ya existe
},
```

Después de los Pasos 1–4, esta invalidación forzará el re-fetch desde Supabase, que ahora SÍ tendrá la transacción, y la UI quedará consistente.

---

## 7. Diagrama del flujo corregido

```
GoalCompactCard.onContribute(amount, date, accountId)
  └─► useFinanceData.contributeGoal(id, amount, date, accountId)
      └─► goalM.contributeToGoal.mutateAsync({ id, amount, date, accountId })
          │
          ├─► onMutate (optimistic):
          │     useFinance.getState().contributeGoal(...)
          │     → Zustand: goals updated ✅
          │     → Zustand: transactions[] updated (local) ✅
          │
          └─► mutationFn (red):
              ├─► isOffline?
              │     useSyncStore.addMutation('goals', UPDATE) ✅
              │     useSyncStore.addMutation('transactions', INSERT) ✅ [NUEVO]
              └─► online:
                    addGoalContributionService(userId, goalId, input)
                      ├─► UPDATE goals SET saved, contributions ✅
                      └─► insertTransaction(userId, tx) ✅ [NUEVO]
          │
          └─► onSuccess:
                invalidateQueries(goals) ✅
                invalidateQueries(transactions) ✅
                → React Query re-fetcha desde Supabase
                → UI muestra datos reales de BD ✅
```

---

## 8. Riesgos y consideraciones

> [!WARNING]
> **Transaccionalidad parcial:** Si `addGoalContribution` actualiza la meta en Supabase pero falla al insertar la transacción, la meta queda actualizada pero sin transacción. Supabase no tiene transacciones distribuidas en el SDK de JS. Para mitigarlo, insertar la transacción **primero** y luego actualizar la meta; si la meta falla, eliminar la transacción.

> [!WARNING]
> **Modo offline — Zustand sobreescrito por React Query:** Cuando el usuario vuelve online y `onSuccess` invalida el cache, React Query re-fetcha desde Supabase y sobreescribe el Zustand optimista. En modo offline esto está bien porque el sync posterior subirá los datos. Pero si el usuario navega a Movimientos en modo offline y luego vuelve online, la transacción local puede desaparecer brevemente hasta que el sync engine la suba.

> [!NOTE]
> **`goal-slice.contributeGoal` sigue siendo necesario** para el optimistic update local. No eliminarlo; solo asegurar que `mutationFn` también haga la persistencia a Supabase.

> [!IMPORTANT]
> **`generateSecureId` vs `crypto.randomUUID()`:** En `goal-slice.ts` se usa `generateSecureId()` de sanitizers, mientras que `goals.service.ts` usa `crypto.randomUUID()`. Para que Zustand y Supabase tengan el mismo `txId`, generar el ID en `useGoalMutations` y pasarlo como parámetro a ambas capas. La función `generateSecureId` en sanitizers debe ser importada en el hook de mutación.

---

## 9. Archivos a modificar (resumen)

| Archivo | Tipo de cambio | Descripción |
|---|---|---|
| `src/services/goals.service.ts` | **Crítico** | Añadir llamada a `insertTransaction` al final de `addGoalContribution` |
| `src/hooks/mutations/useGoalMutations.ts` | **Crítico** | Encolar transacción en modo offline + pasar `goalName` |
| `src/store/slices/goal-slice.ts` | **Opcional** | No requiere cambios de comportamiento, pero se podría limpiar para no generar `txId` interno |
| `src/hooks/useFinanceData.ts` | **Sin cambios** | La firma pública no necesita cambiar |
| `src/pages/Metas.tsx` | **Sin cambios** | La UI ya pasa los parámetros correctos |
| `src/services/transactions.service.ts` | **Sin cambios** | `insertTransaction` ya existe y funciona |

---

## 10. Checklist de implementación

- [ ] **Paso 1:** En `goals.service.ts`, añadir `await insertTransaction(userId, tx)` al final de `addGoalContribution`
- [ ] **Paso 1b:** Resolver `goalName` en el servicio desde el parámetro de input
- [ ] **Paso 3:** En `useGoalMutations.ts`, en el bloque `isOffline`, encolar también la transacción en `useSyncStore`
- [ ] **Paso 4:** Resolver `goalName` internamente en `mutationFn` desde `useFinance.getState().goals`
- [ ] Verificar que el orden de operaciones en `addGoalContribution` es: INSERT transaction → UPDATE goal (para rollback más limpio si falla)
- [ ] Probar flujo online: meta se actualiza + transacción aparece en Movimientos + persiste tras recarga
- [ ] Probar flujo offline: transacción aparece localmente + sync cuando vuelve online
- [ ] Verificar que invalidaciones de React Query reflejan los datos reales de Supabase tras `onSuccess`