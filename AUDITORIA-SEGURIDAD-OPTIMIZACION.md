# 🔒 AUDITORÍA DE SEGURIDAD Y OPTIMIZACIÓN - Finance Pal

**Fecha:** 2026-07-20  
**Versión:** 1.17.8 (rama `feature/supabase-migration`)  
**Commit:** c29fff6

---

## 📋 RESUMEN EJECUTIVO

| Categoría | Estado | Hallazgos Críticos |
|-----------|--------|-------------------|
| **Seguridad (Auth/RBAC)** | ✅ **SEGURO** | 0 críticos |
| **Seguridad (Datos)** | ⚠️ **REVISAR** | 2 medios |
| **Optimización DB** | ⚠️ **PENDIENTE** | 4 mejoras |
| **Optimización Frontend** | ⚠️ **PENDIENTE** | 5 mejoras |
| **Sync/Offline** | ⚠️ **RIESGOS** | 3 riesgos |
| **Dependencias** | ✅ **LIMPIO** | 0 vulnerabilidades |

---

## 🔴 HALLAZGOS DE SEGURIDAD CRÍTICOS/MEDIOS

### 1. **MEDIO: Placeholder Supabase URL en código** (`src/lib/supabase.ts:3-4`)
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';
```
**Riesgo:** Si `.env` falla o no carga, la app intentaría conectar a un proyecto placeholder público.  
**Fix:** Lanzar error explícito si no están definidas:
```typescript
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials - check .env file');
}
```

### 2. **MEDIO: Validación solo en cliente** (`finance-store.ts`)
Todas las validaciones (`sanitizeFixed`, `sanitizeTx`, etc.) ocurren en el cliente. Un atacante podría bypassearlas llamando a Supabase directamente.  
**Fix:** Agregar **RLS policies + Check constraints** en PostgreSQL:
```sql
-- Ejemplo: Validar que amount > 0
ALTER TABLE transactions ADD CONSTRAINT positive_amount CHECK (amount > 0);
-- Validar type enum
ALTER TABLE transactions ADD CONSTRAINT valid_type CHECK (type IN ('income','expense','saving','transfer'));
```

### 3. **MEDIO: Falta Rate Limiting en Auth** (`AuthContext.tsx`, `Login.tsx`)
No hay protección contra brute-force en login/registro.  
**Fix:** Configurar en Supabase Dashboard → Auth → Rate Limiting, o usar Edge Functions.

### 4. **BAJO: Secrets en localStorage** (`App.tsx:34-35`)
```typescript
const persister = createSyncStoragePersister({ storage: window.localStorage });
```
React Query persiste cache en localStorage (incluyendo datos de usuario).  
**Mitigación:** Los datos ya están protegidos por RLS, pero considerar `createAsyncStoragePersister` con encriptación para datos sensibles.

---

## 🟡 RIESGOS EN SYNC OFFLINE (Paso 3)

### 5. **ALTO: Race condition en `processSyncQueue`** (`sync-engine.ts:16-40`)
- `isProcessing` flag es `let` (no atómico)
- Múltiples eventos `online` + store subscription pueden disparar ejecuciones paralelas
- **Fix:** Usar mutex/lock o `p-limit` cola serializada

### 6. **ALTO: Sin reintentos ni backoff** (`sync-engine.ts:28-35`)
```typescript
for (const mutation of syncQueue) {
  try {
    await applyMutation(mutation);
    removeMutation(mutation.id);
  } catch (error) {
    console.error(...); break; // ¡Se detiene toda la cola!
  }
}
```
- Un fallo temporal (red, timeout) detiene TODA la sincronización
- **Fix:** Implementar retry exponencial + dead-letter queue para fallos permanentes

### 7. **MEDIO: Sin resolución de conflictos** 
Al sincronizar, si el usuario editó el mismo dato en dos dispositivos, **gana el último en escribir** (last-write-wins).  
**Fix:** Agregar `updated_at` comparison o usar `supabase.realtime` para detectar conflictos.

---

## 🟢 OPTIMIZACIONES BASE DE DATOS (PostgreSQL/Supabase)

### 8. **FALTA: Índices compuestos para queries frecuentes**
```sql
-- Dashboard: transactions por user_id + date + accountId
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_account ON transactions(user_id, account_id);

-- Fixed items por usuario + active + date range
CREATE INDEX idx_fixed_items_user_active ON fixed_items(user_id, active) 
  WHERE active = true;

-- Goals con deadline próximo
CREATE INDEX idx_goals_user_deadline ON goals(user_id, deadline) WHERE deadline IS NOT NULL;
```

### 9. **FALTA: Paginación en queries React Query** (`useSupabaseQueries.ts`)
```typescript
// Actual: .select('*') - trae TODO
// Recomendado:
.select('*').range(0, 49) // Primera página
// O cursor-based pagination para feeds infinitos
```

### 10. **FALTA: Partial selects para listas** (`useSupabaseQueries.ts`)
En listas (ej. Dashboard) no necesitas todos los campos:
```typescript
// Dashboard solo necesita: id, concept, amount, date, type, accountId
.select('id,concept,amount,date,type,account_id')
```

### 11. **MEJORA: Materialized Views para estadísticas**
```sql
-- Vista materializada para monthly stats (refrescar cada 5 min)
CREATE MATERIALIZED VIEW mv_monthly_stats AS
SELECT user_id, date_trunc('month', date) as month,
  SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
FROM transactions GROUP BY user_id, date_trunc('month', date);
CREATE UNIQUE INDEX ON mv_monthly_stats (user_id, month);
```

---

## 🟢 OPTIMIZACIONES FRONTEND (React/Zustand/React Query)

### 12. **MEJORA: `queryKey` factory para invalidación precisa** (`useSupabaseQueries.ts`)
```typescript
// Actual: ['accounts'] - invalida TODO
// Mejor:
const queryKeys = {
  accounts: (userId: string) => ['accounts', userId] as const,
  transactions: (userId: string, filters?: Filters) => ['transactions', userId, filters] as const,
};
// Permite: queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) })
```

### 13. **MEJORA: Optimistic Updates con React Query** 
Actualmente: Zustand actualiza UI → luego Supabase → luego React Query refetch.  
**Mejor:** Usar `useMutation` con `onMutate`/`onError`/`onSettled` para optimistic updates atómicos.

### 14. **MEJORA: Zustand store muy grande** (`finance-store.ts: 1271 líneas`)
- Todo en un solo store → re-renders innecesarios
- **Fix:** Split stores: `useTransactionsStore`, `useAccountsStore`, `useGoalsStore`, etc.
- Usar `shallow` selector: `useFinance(s => s.transactions, shallow)`

### 15. **MEJORA: Persistencia localStorage sin límite** (`finance-store.ts:701-703`)
```typescript
name: "migol-finanzas-v2", // Persiste TODO el estado
```
- `changeLog` guarda 500 entradas
- `transactions` puede crecer indefinidamente
- **Fix:** Implementar TTL o límite de tamaño, o migrar a IndexedDB (Dexie.js)

### 16. **MEJORA: Falta memoización en componentes pesados** (`Dashboard.tsx`)
- `computeBalances` se ejecuta en cada render si cambian `accounts` o `transactions`
- **Fix:** `useMemo` con deps correctas, o mover a Web Worker

---

## 📦 DEPENDENCIAS Y BUILD

| Paquete | Versión Actual | Estado |
|---------|---------------|--------|
| `@supabase/supabase-js` | 2.110.7 | ✅ Latest |
| `@tanstack/react-query` | 5.83.0 | ✅ Latest |
| `vite` | 8.1.5 | ✅ Patched (audit fix) |
| `vitest` | 3.2.6 | ✅ Patched (audit fix) |
| `react-router-dom` | 6.30.1 | ✅ Patched (audit fix) |
| `esbuild` | 0.28.0 | ✅ Patched (audit fix) |

**Bundle size:** ~407 KB JS (gzipped: 119 KB) - Aceptable para PWA

---

## ✅ PLAN DE ACCIÓN RECOMENDADO (Priorizado)

### **Inmediato (Antes de Paso 4)**
1. [ ] Fix placeholder Supabase URL → throw error
2. [ ] Agregar check constraints en DB para validación server-side
3. [ ] Fix race condition en `processSyncQueue` (mutex)
4. [ ] Agregar retry con backoff en sync engine
5. [ ] Configurar Rate Limiting en Supabase Auth

### **Corto Plazo (Durante Paso 4)**
6. [ ] Crear índices DB para queries principales
7. [ ] Implementar paginación en React Query hooks
8. [ ] Split Zustand store por dominio
9. [ ] Agregar optimistic updates con React Query mutations

### **Mediano Plazo (Post-Paso 4)**
10. [ ] Materialized views para dashboard stats
11. [ ] Migrar persistencia a IndexedDB (Dexie.js)
12. [ ] Implementar conflict resolution (vector clocks o updated_at)
13. [ ] Agregar tests de integración para sync offline/online

---

## 🧪 TESTING ACTUAL

| Suite | Tests | Estado |
|-------|-------|--------|
| `computeBalances` | 4 | ✅ Pass |
| `computeBalances.transfer` | 3 | ✅ Pass |
| `importMigration` | 1 | ✅ Pass |
| `receipt.fs` | 2 | ✅ Pass |
| `ensureScheduled` | 3 | ✅ Pass |
| `PillTabs` | 4 | ✅ Pass |
| `calendar` | 8 | ✅ Pass |
| **TOTAL** | **25** | **✅ 25/25 Pass** |

**Cobertura faltante:** 
- Sync engine (unit + integration)
- Offline queue persistence
- Auth flow (login/register/logout)
- RLS policy verification

---

## 📝 NOTAS ADICIONALES

1. **Feature Flag `VITE_ENABLE_SUPABASE=false`** funciona correctamente - app corre 100% local-first sin tocar Supabase.

2. **Schema SQL** (`supabase/schema.sql`) está bien diseñado con RLS estricto. Faltan solo índices y constraints.

3. **Migración local→nube (Paso 5)** necesitará script idempotente que maneje:
   - Deduplicación por `id` (UUIDs locales vs server)
   - Conflictos de `updated_at`
   - Recibos (subir a Supabase Storage)

4. **PWA/Capacitor:** Configuración lista. `android/` existe. Build release probado.

---

**Firmado:** opencode AI Agent  
**Próxima revisión:** Al completar Paso 4 (Migración módulos)