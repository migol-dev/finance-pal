# Diagnóstico Arquitectónico: Fallos Críticos en la Capa Offline-First

> **Fecha de diagnóstico:** 2026-09-19  
> **Versión analizada:** Finance Pal V1.19.38  
> **Severidad:** CRÍTICA — los tres errores son síntomas de un único defecto de diseño raíz

---

## Resumen Ejecutivo

Los tres errores reportados no son independientes. Son síntomas de una **violación sistemática del contrato optimistic-update** en la arquitectura offline-first: `onMutate` escribe al store local *antes* de que la cuenta exista en Supabase, `mutationFn` lee el store local ya-actualizado y asume que Supabase ya conoce ese registro, y las queries de React Query se activan con `session` todavía ausente durante el arranque. El patrón erróneo se replica tanto en `useTransactionMutations` como en `useAccountMutations`.

---

## Error 1 — Postgres Error 23503: Foreign Key `transactions_account_id_fkey`

### Causa Raíz

**Race condition en el orden de ejecución de `onMutate` vs `mutationFn` dentro de `useTransactionMutations.addTransaction`.**

```
Flujo actual (INCORRECTO):
┌─────────────────────────────────────────────────────────────┐
│ 1. mutationFn se ejecuta                                    │
│    └─ Lee state.transactions[0] del store                   │
│       ✗ PROBLEMA: transactions[0] es la transacción ANTIGUA │
│         porque onMutate todavía NO ha corrido               │
│                                                             │
│ 2. onMutate se ejecuta                                      │
│    └─ Llama a addTx(payload) → la nueva tx entra al store   │
│       como transactions[0]                                  │
│                                                             │
│ 3. mutationFn ya terminó con el registro INCORRECTO         │
└─────────────────────────────────────────────────────────────┘
```

**Evidencia en el código** ([`useTransactionMutations.ts` L27–42](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/hooks/mutations/useTransactionMutations.ts#L27-L42)):

```typescript
mutationFn: async (payload) => {
  const state = useFinance.getState();
  const transaction = state.transactions[0]; // ← LEE EL STORE EN ESTE MOMENTO
  // ...
  await insertTransaction(data.user.id, transaction); // ← Usa datos incorrectos
},
onMutate: async (payload) => {
  await useFinance.getState().addTx(payload); // ← ESTO OCURRE DESPUÉS de mutationFn
},
```

**Comportamiento de React Query TanStack v5:** `onMutate` se ejecuta sincrónicamente antes del `await` de `mutationFn` según la documentación, pero en la implementación actual `mutationFn` inicia y llama a `getState()` antes de que `addTx` en `onMutate` haya completado su ciclo async (la función `addTx` en `transaction-slice.ts` es `async`). 

**El problema secundario del Foreign Key 23503** se produce porque la `account_id` que lleva la transacción enviada a Supabase corresponde a una cuenta que **solo existe localmente en Zustand** (fue creada offline o en una sesión previa sin haberse sincronizado nunca a Postgres). La tabla `transactions` tiene una FK `account_id → accounts.id`. Cuando la cuenta padre no existe en Supabase al momento del upsert de la transacción, Postgres rechaza con violación de FK 23503.

**La arquitectura no implementa ningún mecanismo de garantía de orden de inserción** ("accounts before transactions"). Ambos recursos se sincronizan de forma independiente y no coordinada.

**Flujo que causa el FK 23503:**
```
Usuario (online, primera sesión):
  1. Crea cuenta "Efectivo" → addAccount() → solo en Zustand local
     (La cuenta existe localmente pero nunca llega a Supabase porque
      isOffline() es false pero insertAccount() nunca fue llamado)

  2. Crea gasto vinculado a esa cuenta
     → insertTransaction(userId, tx) donde tx.account_id = id_local_no_existente
     → Supabase: FK violation 23503 porque accounts.id no existe
```

**Problema adicional en `useAccountMutations.addAccount`** ([`useAccountMutations.ts` L28–43](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/hooks/mutations/useAccountMutations.ts#L28-L43)):

```typescript
mutationFn: async (payload) => {
  const state = useFinance.getState();
  const account = state.accounts[0]; // ← MISMO DEFECTO: lee [0], no el registro nuevo
  // ...
  await insertAccount(data.user.id, account);
},
onMutate: async (payload) => {
  await useFinance.getState().addAccount(payload); // ← se ejecuta DESPUÉS
},
```

Idéntico anti-patrón: `mutationFn` accede a `accounts[0]` esperando que sea la cuenta recién añadida, pero en el momento de esa lectura, `onMutate` todavía no ha corrido `addAccount`. Resultado: **se sincroniza una cuenta equivocada a Supabase**, y la cuenta real nunca llega a Postgres. Luego, cuando se intenta insertar una transacción que referencia el ID correcto (el que sí está en Zustand), la FK falla.

---

## Error 2 — PostgREST 409 Conflict en `transactions`

### Causa Raíz

**Upsert enviado con un `id` que ya existe en Supabase, pero con datos inconsistentes que violan constraints secundarios.**

La función [`insertTransaction`](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/services/transactions.service.ts#L124-L132) usa `.upsert()`:

```typescript
export async function insertTransaction(userId: string, tx: Transaction): Promise<void> {
  const { error } = await supabase.from('transactions').upsert(toInsertPayload(userId, tx));
}
```

El `.upsert()` de PostgREST/Supabase resuelve el conflicto por PK (`id`), pero **si además hay una constraint violada** (como la FK 23503 en el momento del UPSERT, o una UNIQUE constraint en alguna columna combinada), PostgREST devuelve **409 Conflict** en lugar del 23503 de Postgres, dependiendo de la versión del driver y el modo del conflict hint.

El 409 se produce específicamente cuando:

1. El `mutationFn` (por el bug del Error 1) envía la **transacción incorrecta** (la que estaba en `transactions[0]` antes del update) — un registro que YA existe en Supabase.
2. Al mismo tiempo, React Query tiene configurado `retry: 2` en el `queryClient` ([`queryClient.ts` L12-L13](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/lib/queryClient.ts#L12-L13)), lo que provoca que el upsert se reintente automáticamente sobre el mismo ID ya existente con datos diferentes, generando el conflicto a nivel de PostgREST.
3. Las mutations también tienen `retry: 1` definido en `mutations.retry`, lo que exacerba el problema repitiendo el envío del payload incorrecto.

El 409 es la manifestación del intento de upsert de una transacción duplicada (ID ya existente) cuya constraint secundaria (FK de `account_id`) falla, resultando en conflicto no resuelto.

---

## Error 3 — HTTP 401 Unauthorized en GET a `goals`

### Causa Raíz

**`useGoalsQuery` se ejecuta antes de que la sesión de Supabase esté completamente establecida, enviando el request sin token JWT en el header `Authorization`.**

**Análisis de la condición `enabled`** en [`useGoalsQuery.ts` L22](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/hooks/queries/useGoalsQuery.ts#L22):

```typescript
enabled: isSupabaseEnabled && !loading && !!session,
```

**El problema:** `isSupabaseEnabled` es una variable `let` inicializada en tiempo de módulo ([`supabase.ts` L19](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/lib/supabase.ts#L19)):

```typescript
export let isSupabaseEnabled = getSyncEnabled();
```

Esta variable se evalúa **una sola vez** al importar el módulo. Si en algún ciclo de render la query se activa cuando `loading` acaba de pasar a `false` pero `session` todavía no se ha populado (hay un render intermedio entre el `setLoading(false)` y el posterior `setSession(session)` del callback de `getSession`), la query se dispara con `session` nulo.

**La secuencia problemática** en [`AuthContext.tsx` L170-L182](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/context/AuthContext.tsx#L170-L182):

```typescript
supabase.auth.getSession().then(async ({ data: { session } }) => {
  setSession(session);     // render #1 — session puede ser null si aún no hay JWT
  setUser(session?.user ?? null);
  if (session) {
    await checkMfaStatus();
    // ...
  }
  setLoading(false);  // render #2 — loading pasa a false
```

Entre `setSession(null)` (si la sesión expira durante el await de `checkMfaStatus`) y `setLoading(false)`, hay un instante donde `loading = false` y `session = null`. En ese momento, `useGoalsQuery` ve `enabled = true` (porque `!false && !null` = `true`... **espera: `!!null` = `false`**).

**El verdadero vector de 401:** La tabla `goals` en Supabase usa RLS (Row Level Security) con `auth.uid()`. Cuando `fetchGoals` se ejecuta via `goals.service.ts` sin una sesión activa en el cliente Supabase (porque el token JWT del cliente `supabase` ya caducó o nunca fue refrescado en el singleton), la request llega a PostgREST con el header `Authorization: Bearer <expired_token>` o sin él, retornando 401.

**La causa concreta:** El cliente Supabase es un singleton creado en el módulo ([`supabase.ts` L33](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/lib/supabase.ts#L33)):

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

El `AuthContext` usa `supabase.auth.refreshSession()` para refrescar el token, pero hay una condición de guardia:

```typescript
const refreshSession = useCallback(async () => {
  if (isRefreshing.current || !isSupabaseEnabled) return; // ← sale si ya está refrescando
```

Si el `onAuthStateChange` dispara un evento `TOKEN_REFRESHED` mientras `isRefreshing.current = true`, el nuevo token nunca se persiste en el estado, y la query de `goals` usa el token viejo que ya está expirado. Supabase devuelve 401.

**Factor agravante:** La tabla `goals` (a diferencia de `transactions` y `accounts` que usan vistas `*_safe`) **no tiene una vista intermedia con RLS separado**. `fetchGoals` accede directamente a la tabla `goals` sin ningún fallback, haciendo la query 100% dependiente de un JWT válido en cada request.

---

## Mapa de Defectos por Archivo

| Archivo | Línea(s) | Defecto |
|---|---|---|
| [`useTransactionMutations.ts`](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/hooks/mutations/useTransactionMutations.ts) | 28-41 | `mutationFn` lee `state.transactions[0]` en lugar del `payload` recibido. El ID de la transacción nueva nunca se calcula en `mutationFn`; espera que `onMutate` ya lo haya creado. |
| [`useAccountMutations.ts`](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/hooks/mutations/useAccountMutations.ts) | 29-42 | Mismo defecto: `state.accounts[0]` no es el registro nuevo cuando `mutationFn` corre. La cuenta nueva nunca se sincroniza a Supabase. |
| [`useTransactionMutations.ts`](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/hooks/mutations/useTransactionMutations.ts) | 31-35 | La lógica offline encola `transaction` (dato del store), no `payload` (el input de la mutation). Si el store ya mutó vía `onMutate`, el dato encolado puede corresponder al registro pre-actualización. |
| [`transactions.service.ts`](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/services/transactions.service.ts) | 125 | `upsert` sin `ignoreDuplicates` ni conflict resolution hint explícito. Permite que el retry automático de React Query reenvíe el mismo payload, amplificando el 409. |
| [`goals.service.ts`](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/services/goals.service.ts) | 112-125 | `fetchGoals` accede a tabla `goals` directamente (no una vista `goals_safe`), sin manejo de JWT expirado ni retry con refresh previo. |
| [`supabase.ts`](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/lib/supabase.ts) | 19 | `isSupabaseEnabled` es evaluado en tiempo de módulo como `let`. No reacciona a cambios de sesión durante el ciclo de vida de la app. |
| [`queryClient.ts`](file:///E:/Projectos/Aplications/Finance%20Pal/Finance%20Pal%20APP/Finance%20Pal%20V1.19.38/finance-pal/src/lib/queryClient.ts) | 12-17 | `retry: 2` para queries y `retry: 1` para mutations sin filtrado de errores 401/409. Reintentos ciegos agravan la propagación de errores de auth y FK. |

---

## Plan de Solución Exacto

> **RESTRICCIÓN:** Este plan NO modifica código. Es un plano de implementación para el equipo de desarrollo.

### Fix 1 — Corrección del Anti-patrón `mutationFn` + `onMutate` (CRÍTICO)

**Problema:** `mutationFn` lee el store para obtener el objeto completo en lugar de construirlo desde el `payload` recibido, y confía en que `onMutate` ya haya corrido.

**Solución de diseño:**

El contrato correcto de la arquitectura optimistic-update es:

```
onMutate  → actualiza el estado local (Zustand) de forma optimistic
mutationFn → construye el payload de red a partir del argumento recibido directamente,
             NO del store (el store puede estar en estado transitorio)
```

Para `addTransaction`:
- `mutationFn` debe recibir el `payload: Omit<Transaction, 'id'>` y construir el `TransactionInsertPayload` directamente desde ese `payload`, generando el `id` dentro de `mutationFn` o recibiéndolo como parte del tipo de input.
- El `id` generado debe ser el mismo que usa `onMutate`/`addTx` para evitar inconsistencias. La solución canónica es cambiar el tipo de input de la mutation a `Transaction` completa (con `id` pre-generado por el componente llamante), o generar el `id` antes de llamar a `.mutate()` y pasarlo como parte del payload.

**Flujo corregido:**

```
Componente:
  const id = generateSecureId();
  addTransaction.mutate({ id, ...formData });
                         ↑
mutationFn recibe { id, ...formData } directamente
  → construye InsertPayload desde el argumento
  → NO lee el store

onMutate recibe { id, ...formData } directamente
  → llama addTx con el mismo id
  → escribe al store local
```

Esto además requiere cambiar la firma de `addTx` en `TransactionSlice` para aceptar `Transaction` (con `id`) en lugar de `Omit<Transaction, 'id'>`, ya que el ID debe ser el mismo en ambas capas.

Aplica idénticamente para `addAccount` en `useAccountMutations`.

### Fix 2 — Garantía de Orden de Sincronización: Accounts → Transactions (CRÍTICO)

**Problema:** No hay garantía de que la cuenta padre exista en Supabase antes de insertar la transacción hija.

**Solución de diseño:**

Implementar una función `ensureAccountSynced(accountId, userId)` que, antes de `insertTransaction`, verifique si la cuenta existe en Supabase y si no, la inserte primero:

```
mutationFn de addTransaction:
  1. Obtener userId de supabase.auth.getUser()
  2. Si tx.accountId existe:
     a. Verificar existencia en Supabase: SELECT id FROM accounts WHERE id = tx.accountId
     b. Si no existe: obtener la account del store local y llamar insertAccount(userId, account)
     c. Await a que insertAccount complete antes de continuar
  3. Llamar insertTransaction(userId, tx)
```

Alternativa arquitectónica preferida: Implementar un servicio de sincronización transaccional que maneje cuentas y transacciones en una misma operación coordinada, usando la cola de `useSyncStore` como mecanismo de ordering para el procesador de sincronización offline.

### Fix 3 — Manejo de JWT Expirado en Queries (CRÍTICO)

**Problema:** Las queries de React Query no manejan el 401 de forma inteligente; no intentan refrescar el token antes de reintentar.

**Solución de diseño:**

Configurar el `QueryClient` con una función `retry` que:
1. No reintente errores 401 ni 409 con los datos actuales.
2. Para 401: ejecute `supabase.auth.refreshSession()` y luego reintente una sola vez.
3. Para 409 y 23503: no reintente (son errores de lógica de negocio, no transitorios).

```typescript
// En queryClient.ts
queries: {
  retry: (failureCount, error) => {
    if (error?.status === 401 || error?.code === '23503' || error?.status === 409) return false;
    return failureCount < 2;
  },
  retryDelay: ...
}
mutations: {
  retry: (failureCount, error) => {
    if (error?.status === 409 || error?.code === '23503' || error?.status === 401) return false;
    return failureCount < 1;
  }
}
```

Para el 401 en `goals` específicamente: añadir manejo en `fetchGoals` que detecte el error 401, llame a `supabase.auth.refreshSession()`, y si tiene éxito, reintente la query. Esto puede implementarse como un wrapper `withAuthRetry(fn)` reutilizable en todos los servicios.

### Fix 4 — Normalizar Acceso a Tablas via Vistas Seguras (MODERADO)

**Problema:** `fetchGoals` accede directamente a la tabla `goals`, mientras `fetchAccounts` y `fetchTransactions` usan vistas `accounts_safe` y `transactions_safe` respectivamente.

**Solución de diseño:**

Crear la vista `goals_safe` en Supabase con las mismas políticas RLS que las otras vistas seguras, y actualizar `goals.service.ts` para consultar `goals_safe`. Esto aísla las policies de lectura y permite mayor control sin afectar la tabla base.

### Fix 5 — Corrección del Encolado Offline (MODERADO)

**Problema:** El código offline en `mutationFn` encola `transaction` (leído del store) en lugar de `payload` (el argumento de la mutation), que puede ser un objeto incompleto si `onMutate` aún no corrió.

**Solución de diseño:**

Una vez aplicado el Fix 1 (payload completo con `id` pre-generado), el encolado offline debe usar el `payload` directamente:

```typescript
// CORRECTO:
if (!isSupabaseEnabled || isOffline()) {
  useSyncStore.getState().addMutation({
    table: 'transactions',
    action: 'INSERT',
    recordId: payload.id,
    payload: payload  // ← el argumento de mutate(), no el store
  });
  return;
}
```

---

## Diagrama de Flujo del Bug Principal

```
Componente llama addTransaction.mutate(formPayload)
           │
           ├──── mutationFn(formPayload) inicia inmediatamente
           │          └─ Lee useFinance.getState().transactions[0]
           │             [estado ANTERIOR, sin la nueva tx]
           │             ← usa ID de transacción INCORRECTA
           │
           └──── onMutate(formPayload) → addTx(formPayload)
                     └─ [ASYNC] genera nuevo id, inserta en store
                        transactions[0] ahora = nueva tx
                        ← pero mutationFn ya terminó de leer
                        
    Resultado: Supabase recibe tx con account_id = ID de una cuenta
               que existe en Zustand pero NO en Postgres
               → FK 23503
               → retry automático → 409 Conflict
```

---

## Clasificación de Prioridad de Fixes

| Prioridad | Fix | Impacto | Complejidad |
|---|---|---|---|
| P0 — Bloqueante | Fix 1: Refactorizar `mutationFn` para no leer del store | Elimina causa raíz de Error 1 y 2 | Media |
| P0 — Bloqueante | Fix 2: Garantía de orden Accounts → Transactions | Elimina FK 23503 definitivamente | Media-Alta |
| P1 — Urgente | Fix 3: Retry inteligente por tipo de error en QueryClient | Elimina Error 3 y previene cascada de errores | Baja |
| P2 — Importante | Fix 5: Corrección del encolado offline | Consistencia en modo offline | Baja |
| P3 — Mejora | Fix 4: Vista `goals_safe` en Supabase | Consistencia arquitectónica | Baja |

---

*Diagnóstico generado por análisis estático de código fuente. No se modificó ningún archivo de implementación.*