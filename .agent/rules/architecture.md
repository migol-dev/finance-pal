# Arquitectura de Finance Pal

Este documento describe la arquitectura de software, patrones de diseño y estructura de carpetas de **Finance Pal**, para que los agentes y desarrolladores entiendan rápidamente el flujo de datos y dónde encontrar (o colocar) cada pieza de código.

## 1. Patrón Arquitectónico Principal (Local-First + Sincronización en la Nube)

Finance Pal utiliza un enfoque **"Local-First"**. Esto significa que la aplicación siempre es funcional y rápida leyendo de la memoria local y escribiendo optimísticamente. Cuando hay sesión en Supabase y conexión a internet, la aplicación sincroniza los datos hacia la nube.

La arquitectura se divide en 3 capas principales:

1. **Capa de Interfaz / Vistas (React Components & Pages):** Consumen única y exclusivamente el hook fachada `useFinanceData`. No deben interactuar directamente con Zustand ni React Query ni Supabase.
2. **Capa de Estado y Sincronización (Facade + Zustand + React Query):**
   * **Zustand (`src/store`):** Mantiene el estado en memoria para que la UI sea ultra rápida y funcione offline (persistido con `localStorage` o `IndexedDB`).
   * **React Query (`src/hooks/queries` y `src/hooks/mutations`):** Se encarga de hacer el fetching, invalidación de caché y optimistic updates hacia Supabase.
   * **Facade (`src/hooks/useFinanceData.ts`):** Unifica Zustand y React Query. Si el usuario está offline o sin sesión, devuelve datos de Zustand. Si está online con sesión, devuelve datos de React Query y despacha mutaciones.
3. **Capa de Acceso a Datos (`src/services`):** Funciones puras (sin hooks ni estado global) que ejecutan el SDK de Supabase para leer o escribir en la base de datos remota (`insert`, `update`, `delete`, `select`).

---

## 2. Estructura de Directorios Detallada

- **`src/`**
  - **`assets/`**: Imágenes, logos, íconos estáticos.
  - **`components/`**
    - **`app/`**: Componentes específicos del dominio de la aplicación (ej. `Header`, `ElegantConfirm`, `IconPicker`).
    - **`ui/`**: Componentes genéricos de UI y sistema de diseño (Shadcn UI, Radix), ej. `Button`, `Dialog`, `Input`.
  - **`context/`**: Contextos de React (ej. `AuthContext.tsx` para manejar la sesión global de Supabase).
  - **`hooks/`**
    - **`useFinanceData.ts`**: **EL ARCHIVO MÁS IMPORTANTE PARA LA UI.** Es el único lugar desde el que las páginas consumen datos. Combina React Query y Zustand.
    - **`queries/`**: Hooks de React Query (`useQuery`) para recuperar datos desde Supabase (ej. `useTransactionsQuery.ts`).
    - **`mutations/`**: Hooks de React Query (`useMutation`) para alterar datos en Supabase y sincronizar con Zustand (ej. `useGoalMutations.ts`). Manejan la lógica de qué pasa si estamos offline (encolar mutación).
    - *(Otros hooks útiles)*: `useNetwork` (estado de red), `useSessionManager` (gestión de expiración).
  - **`lib/`**: Utilidades puras, constantes y configuración.
    - `finance.ts`: Tipos, interfaces (`Transaction`, `Account`, etc.), cálculo de balances, diccionarios de categorías y emojis.
    - `supabase.ts`: Instancia del cliente de Supabase.
    - `sanitizers.ts`: Generación de IDs (seguros offline) y validación.
  - **`pages/`**: Vistas principales de React (rutas). 
    - `Dashboard.tsx`: Resumen principal.
    - `Movimientos.tsx`: Lista de transacciones e inyección dinámica de "abonos virtuales" a deudas.
    - `Metas.tsx`, `Cuentas.tsx`, `Deudas.tsx`, `Ajustes.tsx`, etc.
  - **`services/`**: Repositorios de datos contra Supabase.
    - `transactions.service.ts`, `goals.service.ts`, `debts.service.ts`, etc. Extraen, mapean e insertan rows en la DB.
  - **`store/`**: Estado local (Zustand).
    - `finance-store.ts`: Store principal que combina todos los slices y maneja la persistencia local.
    - `sync-store.ts`: Motor de sincronización offline (encola mutaciones fallidas o hechas sin internet para subirlas después).
    - **`slices/`**: Archivos separados que manejan fragmentos del estado global local (ej. `transaction-slice.ts`, `goal-slice.ts`). Aquí se ejecutan funciones sincrónicas (agregar un item al array en memoria).

---

## 3. Flujo Completo de una Acción (Ej: Crear Transacción)

Para que entiendas cómo modificar o agregar flujos, aquí está la secuencia exacta de qué pasa cuando el usuario crea un movimiento:

1. **`Movimientos.tsx` (UI):** Llama a `addTx(tx)` que extrae del hook `useFinanceData`.
2. **`useFinanceData.ts` (Facade):** Ejecuta la mutación asíncrona proveniente de `useTransactionMutations.ts`.
3. **`useTransactionMutations.ts` (React Query Mutation):**
   - **`onMutate`:** Actualiza el estado local de Zustand (para actualización optimista instantánea).
   - **`mutationFn`:** Si estamos offline, encola en `sync-store.ts` un `INSERT`. Si estamos online, llama a `insertTransaction()` en `transactions.service.ts`.
   - **`onSuccess / onError`:** Invalida la query (`financeKeys.transactions()`) para asegurar consistencia final con la nube.
4. **`transactions.service.ts` (Service):** Construye el payload en `snake_case` y lo inserta usando el cliente de `supabase`.

> **⚠️ REGLA DE ORO:** Las actualizaciones de estado local y de base de datos *deben* mantenerse sincronizadas. Si agregas un nuevo campo a una tabla, debes mapearlo tanto en el Store de Zustand, como en el payload del Service (`camelCase` a `snake_case`).

---

## 4. Notas Especiales y Quirks

- **Abonos a Deudas (Virtual Transactions):** 
  Los abonos y préstamos (debts) tienen sus propias tablas. Sin embargo, para que aparezcan en el historial `Movimientos.tsx`, se renderizan como "transacciones virtuales" al vuelo usando `useMemo` iterando sobre el array de `debts`. No existen dentro de la tabla `transactions`. 
- **Cálculo de Balances:**
  Los saldos de las cuentas se calculan "al vuelo" en `lib/finance.ts` (`computeBalances`). Este reduce itera sobre todas las transacciones (y sobre los abonos a deudas, restando/sumando a la cuenta correspondiente `accountId`).
- **Nombres de Archivos:**
  Se utilizan convenciones kebab-case para slices y snake_case para exportaciones o utilidades, mientras que componentes y páginas usan PascalCase.

---

## Resumen para Agentes 🤖

Cuando te pidan hacer un cambio:
- Si afecta la **UI**: ve a `src/pages/` o `src/components/`. Recuerda usar `useFinanceData`.
- Si necesitas **guardar nuevos datos**: modifica las interfaces en `src/lib/finance.ts`, modifica Zustand en `src/store/slices/`, modifica los payloads en `src/services/` y ajusta el hook de mutación en `src/hooks/mutations/`.
- **NUNCA** mezcles lógica de red dentro de los slices de Zustand, ni lógica global de estado dentro de los services. Cada capa tiene su responsabilidad estricta.
