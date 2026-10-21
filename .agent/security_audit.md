# 🔐 Auditoría de Seguridad y Privacidad — Finance Pal
**Versión auditada:** V1.19.38  
**Fecha de auditoría:** 2026-09-23  
**Auditor:** Antigravity (Agente DevSecOps — Claude Sonnet 4.6 Thinking)  
**Stack auditado:** React + Vite + Zustand + Supabase (PostgreSQL + Storage + Edge Functions) + Capacitor (mobile)  
**Metodología:** Análisis estático de código fuente (SAST). Sin ejecución de código ni pruebas dinámicas.

> [!CAUTION]
> Este reporte contiene información de seguridad sensible. Trátalo como CONFIDENCIAL. No lo versiones en repositorios públicos.

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Resumen de Hallazgos por Severidad](#resumen-de-hallazgos-por-severidad)
3. [Área 1: Datos en Tránsito](#área-1-datos-en-tránsito)
4. [Área 2: Datos en Reposo — Servidor (RLS y DB)](#área-2-datos-en-reposo--servidor-rls-y-db)
5. [Área 3: Datos en Reposo — Cliente (Zustand / Storage)](#área-3-datos-en-reposo--cliente-zustand--storage)
6. [Área 4: Autenticación y Manejo de Tokens JWT](#área-4-autenticación-y-manejo-de-tokens-jwt)
7. [Área 5: IDOR, Inyección y Lógica de Aplicación](#área-5-idor-inyección-y-lógica-de-aplicación)
8. [Área 6: Seguridad de la Plataforma y Configuración](#área-6-seguridad-de-la-plataforma-y-configuración)
9. [Plan de Mitigación Accionable](#plan-de-mitigación-accionable)
10. [Controles de Seguridad Positivos Detectados](#controles-de-seguridad-positivos-detectados)

---

## Resumen Ejecutivo

Finance Pal es una aplicación de finanzas personales que maneja datos altamente sensibles: transacciones monetarias, balances de cuentas, información bancaria (CLABE, banco, titular), deudas y comprobantes de pago. La auditoría identificó **2 vulnerabilidades Críticas, 4 Altas, 7 Medias y 5 Bajas**.

La arquitectura del proyecto demuestra un nivel de madurez de seguridad notable para un proyecto individual: implementa RLS en Supabase, cifrado AES-GCM en cliente, TOTP/MFA, audit logging con hash-chaining, rate limiting, sanitización con Zod y CSP. Sin embargo, existen brechas estructurales que pueden comprometer la confidencialidad de datos financieros sensibles.

**El riesgo más crítico identificado es la doble-escritura en texto plano a `localStorage` como fallback principal del estado de Zustand**, lo que significa que todos los datos financieros del usuario existen en texto plano en el navegador independientemente de si el cifrado AES-GCM funciona.

---

## Resumen de Hallazgos por Severidad

| ID | Severidad | Área | Título | Estado |
|----|-----------|------|--------|--------|
| SEC-001 | 🔴 **CRÍTICO** | Cliente/Storage | Estado Zustand persistido en texto plano en localStorage como primario | Abierto |
| SEC-002 | 🔴 **CRÍTICO** | Clave de Cifrado | Clave de cifrado derivada de secreto almacenado en texto plano en localStorage | Abierto |
| SEC-003 | 🟠 **ALTO** | Edge Function | Edge Function `send-reminders` sin autenticación — cualquier llamante puede dispararla | Abierto |
| SEC-004 | 🟠 **ALTO** | Base de Datos | `cleanup_stale_sessions()` usa `SECURITY DEFINER` sin restricción de llamante | Abierto |
| SEC-005 | 🟠 **ALTO** | IDOR | `updateTransaction/updateAccount/deleteDebt` sin filtro `user_id` del lado del servicio | Abierto |
| SEC-006 | 🟠 **ALTO** | Secretos | Clave ANON de Supabase con expiración en año 2100 comprometida en `.env` versionable | Abierto |
| SEC-007 | 🟡 **MEDIO** | Storage | Bucket de recibos usa `getPublicUrl()` — URLs no autenticadas/firmadas | Abierto |
| SEC-008 | 🟡 **MEDIO** | Autenticación | Rate limiting del Login es solo client-side (en memoria), bypasseable | Abierto |
| SEC-009 | 🟡 **MEDIO** | Audit Log | Hash-chaining del audit log usa función `djb2` (hash de 32 bits, colisionable) | Abierto |
| SEC-010 | 🟡 **MEDIO** | Sesiones | Sesión multi-dispositivo: borrado forzado de sesión ajena sin verificación MFA | Abierto |
| SEC-011 | 🟡 **MEDIO** | Schema SQL | Columna `deleted_at IS NULL` en políticas RLS referencia columna inexistente en `user_sessions`/`user_settings` | Abierto |
| SEC-012 | 🟡 **MEDIO** | OAuth | `isValidRedirectUri` permite cualquier host `localhost` con cualquier puerto/path | Abierto |
| SEC-013 | 🟡 **MEDIO** | Edge Function | Rate limiting de Edge Function en memoria de Deno (se reinicia con cada cold start) | Abierto |
| SEC-014 | 🟡 **MEDIO** | Schema SQL | Políticas RLS definidas sobre **vistas SQL** no son aplicadas por PostgreSQL | Abierto |
| SEC-015 | 🟡 **MEDIO** | Aislamiento | Datos de la sesión no se borran de localStorage/IndexedDB al hacer sign-out | Abierto |
| SEC-016 | 🟡 **MEDIO** | Schema SQL | `user_settings` RLS en bloque `DO $$` con condición `policyprefix` inválida — políticas pueden no existir | Abierto |
| SEC-017 | 🟢 **BAJO** | CSP | CORS wildcard `*` en Edge Function permite llamadas cross-origin no autenticadas | Abierto |
| SEC-018 | 🟢 **BAJO** | Privacidad | `profile.email` se persiste en `localStorage` como parte del estado de Zustand | Abierto |
| SEC-019 | 🟢 **BAJO** | Logging | Errores de sincronización registran `userId` en `console.log` / `console.error` | Abierto |
| SEC-020 | 🟢 **BAJO** | Importación | `migrateImported` acepta JSON arbitrario sin límite de tamaño antes del parseo | Abierto |
| SEC-021 | 🟢 **BAJO** | Build | `dist/stats.html` del bundle analyzer puede ser accesible públicamente si se despliega | Abierto |

---

## Área 1: Datos en Tránsito

### Análisis del Cliente Supabase

**Archivo:** [`src/lib/supabase.ts`](../src/lib/supabase.ts)

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Sin opciones de auth explícitas → usa defaults del SDK
```

**Hallazgos:**

✅ **POSITIVO:** Supabase JS SDK v2 utiliza HTTPS (TLS 1.2+) de forma obligatoria para todas las comunicaciones con `*.supabase.co`. No existe opción de degradar a HTTP en el SDK oficial.

✅ **POSITIVO:** WebSocket de Realtime (`wss://`) también opera sobre TLS. La CSP en `netlify.toml` permite explícitamente `wss://*.supabase.co`.

✅ **POSITIVO:** El cliente NO especifica `auth.persistSession: false`, lo que activa la persistencia de sesión (comportamiento esperado para UX mobile).

⚠️ **OBSERVACIÓN:** El cliente no especifica `auth.storageKey` personalizado. El SDK almacena el JWT de sesión en `localStorage` bajo la clave `sb-[ref]-auth-token`. Esto es correcto para el caso de uso pero debe ser documentado.

⚠️ **OBSERVACIÓN:** No hay configuración de `auth.autoRefreshToken: false`. El SDK refresca el token automáticamente (positivo para UX, aceptable para el modelo de riesgo).

**Datos en tránsito — clasificación:** **SEGURO** para el canal de comunicación. Los datos viajan cifrados por TLS.

---

## Área 2: Datos en Reposo — Servidor (RLS y DB)

### Análisis del Schema SQL

**Archivo:** [`supabase/schema.sql`](../supabase/schema.sql)  
**Archivo:** [`supabase/schema_push_notifications.sql`](../supabase/schema_push_notifications.sql)

#### Tablas y Estado de RLS

| Tabla | RLS Habilitado | Políticas SELECT | Políticas INSERT | Políticas UPDATE | Políticas DELETE |
|-------|---------------|-----------------|-----------------|-----------------|-----------------|
| `accounts` | ✅ Sí | ✅ `auth.uid() = user_id` | ✅ `auth.uid() = user_id` | ✅ `auth.uid() = user_id` | ✅ `auth.uid() = user_id` |
| `fixed_items` | ✅ Sí | ✅ | ✅ | ✅ | ✅ |
| `transactions` | ✅ Sí | ✅ | ✅ | ✅ | ✅ |
| `goals` | ✅ Sí | ✅ | ✅ | ✅ | ✅ |
| `goal_folders` | ✅ Sí | ✅ | ✅ | ✅ | ✅ |
| `debts` | ✅ Sí | ✅ | ✅ | ✅ | ✅ |
| `debt_payments` | ✅ Sí | ✅ | ✅ | ✅ | ✅ |
| `user_sessions` | ✅ Sí | ✅ | ✅ | ✅ | ✅ |
| `user_settings` | ✅ Sí | ✅ (condicional) | ✅ (condicional) | ✅ (condicional) | ✅ (condicional) |
| `push_subscriptions` | ✅ Sí | ✅ | ✅ | ✅ | ✅ |

✅ **POSITIVO:** Todas las tablas tienen RLS habilitado y políticas `auth.uid() = user_id` correctas.

---

### 🔴 SEC-011 — MEDIO: Condición `deleted_at IS NULL` en políticas de tablas sin esa columna

**Severidad:** Media  
**Archivo:** [`supabase/schema.sql`](../supabase/schema.sql), líneas 171-217

**Problema:** Las políticas RLS de `accounts`, `fixed_items`, `transactions`, etc. incluyen `AND deleted_at IS NULL`:

```sql
-- Línea 171
CREATE POLICY "Users can view their own accounts" ON accounts 
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
```

La columna `deleted_at` se agrega **más abajo** en el mismo script (línea 319), y en la tabla `user_sessions` y `user_settings` **no existe** la columna `deleted_at` aunque las políticas la referencian:

```sql
-- Línea 214 — user_sessions políticas referencian deleted_at
CREATE POLICY "Users can view their own sessions" ON user_sessions 
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
-- ⚠️ user_sessions NO tiene columna deleted_at en su CREATE TABLE (línea 142-149)
```

**Impacto:** En PostgreSQL, referenciar una columna inexistente en una política RLS causa un **error de ejecución** en tiempo de consulta. Las consultas a `user_sessions` y `user_settings` pueden fallar con error 42703, causando que las políticas RLS fallen abierto (sin efecto) o con error en producción.

**Para `user_settings`:** Las políticas se crean dentro de un bloque `DO $$` que verifica `policyprefix` (nombre de columna inválido — debería ser `tablename`), por lo que las políticas **pueden no haberse creado** en producción.

---

### 🔴 SEC-004 — ALTO: Función `SECURITY DEFINER` sin restricción de invocador

**Severidad:** Alta  
**Archivo:** [`supabase/schema.sql`](../supabase/schema.sql), líneas 300-315

```sql
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes'
    AND created_at < NOW() - INTERVAL '2 minutes';
  ...
END;
$$;
```

**Problema:** La función usa `SECURITY DEFINER` (ejecuta con privilegios del owner, típicamente `postgres` o superuser) y **no tiene `GRANT EXECUTE` selectivo ni verificación de quién la llama**. Cualquier usuario autenticado puede invocarla directamente via `rpc()` del cliente:

```typescript
// Cualquier usuario autenticado puede hacer esto:
await supabase.rpc('cleanup_stale_sessions');
// Resultado: borrado masivo de TODAS las sesiones de TODOS los usuarios
```

**Impacto:** DoS de sesiones — un usuario malicioso puede borrar las sesiones de todos los usuarios de la plataforma, forzando re-login global.

**Nota positiva:** `SET search_path = ''` está bien configurado para prevenir injection via search_path.

---

### Vistas de Seguridad (Column-Level Security)

✅ **POSITIVO:** Existen vistas `accounts_safe`, `transactions_safe` y `debt_payments_safe` que excluyen columnas sensibles (`clabe`, `bank`, `holder_name`, `external_payee`) y usan `SECURITY BARRIER`.

✅ **POSITIVO:** `fetchTransactions()` usa `transactions_safe` y `fetchAccounts()` usa `accounts_safe`.

⚠️ **OBSERVACIÓN:** `fetchDebts()` consulta la tabla `debts` directamente (no existe `debts_safe`), pero la estructura de `debts` no contiene columnas bancarias directas — los datos sensibles están en la relación `debt_payments` que sí usa `debt_payments_safe`.

---

## Área 3: Datos en Reposo — Cliente (Zustand / Storage)

### 🔴 SEC-001 — CRÍTICO: Estado Zustand persistido en TEXTO PLANO en localStorage como almacenamiento PRIMARIO

**Severidad:** CRÍTICA  
**Archivo:** [`src/store/finance-store.ts`](../src/store/finance-store.ts), líneas 383-428

**Problema:** El store de Zustand implementa un storage customizado con lógica dual. El `setItem` SIEMPRE escribe en `localStorage` en texto plano **primero**, y solo _después_ intenta cifrar en una copia secundaria:

```typescript
setItem: async (name: string, value: any) => {
  // ...
  const serialized = JSON.stringify(value);
  
  // ⚠️ SIEMPRE guarda en texto plano - esto es el PRIMARIO
  try {
    localStorage.setItem(name, serialized);  // ← TEXTO PLANO
  } catch (e) {
    console.error('localStorage setItem failed:', e);
  }
  
  // Solo como copia secundaria — best-effort
  if (isEncryptionAvailable()) {
    try {
      await saveEncryptedState(serialized);  // ← Cifrado AES-GCM
    } catch (e) {
      console.warn('Encrypted save failed, localStorage copy exists:', e);
    }
  }
},
```

El `getItem` también lee primero de `localStorage` (texto plano):

```typescript
getItem: async (name: string) => {
  let data: any = null;
  // ⚠️ Lee primero de texto plano
  const item = localStorage.getItem(name);
  if (item) {
    try { data = JSON.parse(item); } catch { /* ignore */ }
  }
  // Solo usa cifrado si no hay texto plano
  if (!data && isEncryptionAvailable()) {
    const decrypted = await loadEncryptedState();
    // ...
  }
},
```

**Datos comprometidos en texto plano en `localStorage["migol-finanzas-v2"]`:**
- Todas las transacciones (montos, conceptos, fechas, categorías)
- Balances de todas las cuentas
- Nombres de cuentas (incluyendo banco y titular)
- Metas financieras (nombre, target, saved)
- Deudas (persona, monto, concepto)
- Perfil del usuario (nombre, email, moneda)
- Historial de cambios (changeLog)

**Impacto:**
- **XSS:** Cualquier script malicioso inyectado (via extensión de Chrome, adware, o XSS en librería) puede leer `localStorage.getItem('migol-finanzas-v2')` y obtener todos los datos financieros del usuario.
- **Acceso físico:** En un dispositivo compartido o robado, cualquier persona puede abrir DevTools y leer todos los datos.
- **Capacitor (Android/iOS):** En la versión nativa, `localStorage` se almacena en el directorio de datos de la app, accesible en dispositivos rooteados.
- **El cifrado AES-GCM existe pero es ORNAMENTAL** para el caso de uso primario — los datos en texto plano siempre existen en paralelo.

---

### 🔴 SEC-002 — CRÍTICO: La clave de cifrado AES-GCM se deriva de un secreto almacenado en texto plano en localStorage

**Severidad:** CRÍTICA  
**Archivo:** [`src/lib/encrypted-storage.ts`](../src/lib/encrypted-storage.ts), líneas 107-120

```typescript
function getDeviceSecret(): string {
  let secret = localStorage.getItem('finance-pal-device-secret');
  if (!secret) {
    const fallback = prompt('Por favor, ingresa tu frase de seguridad...');
    if (fallback) {
      secret = fallback;
    } else {
      // ⚠️ Si el usuario cancela el prompt, genera secreto aleatorio...
      const entropy = crypto.getRandomValues(new Uint8Array(32));
      secret = btoa(String.fromCharCode(...entropy));
    }
    // ⚠️ Guarda el secreto en texto plano en localStorage
    localStorage.setItem('finance-pal-device-secret', secret);
  }
  return secret;
}
```

**Problemas compuestos:**

1. **La clave maestra de cifrado AES-GCM está guardada junto a los datos cifrados**, en el mismo almacenamiento (`localStorage`). Es análogo a guardar la llave bajo la puerta.

2. **El SALT de PBKDF2 también está en `localStorage`** (`finance-pal-encrypted-v1-salt`). Con secreto + salt, la clave puede derivarse sin acceso a los datos cifrados.

3. **Prompt silenciable:** Si el usuario cancela el `prompt()`, se genera una clave aleatoria que NO es recordable por el usuario. La próxima vez que inicie sesión, si `localStorage` se borró, el usuario no podrá recuperar sus datos.

4. **Dado SEC-001**, incluso si el cifrado funcionara correctamente, los datos en texto plano ya están expuestos. La clave de cifrado comprometida solo añade un vector de ataque adicional (derivar la clave para acceder al estado cifrado secundario).

**Impacto:** El cifrado AES-GCM implementado tiene cero valor de seguridad en la práctica: el atacante con acceso a `localStorage` tiene tanto los datos en texto plano (SEC-001) como la clave para descifrar la copia cifrada (SEC-002).

---

### SEC-015 — BAJO: Email del perfil persistido en estado de Zustand

**Archivo:** [`src/store/slices/settings-slice.ts`](../src/store/slices/settings-slice.ts)

El `profile` incluye `email?: string` y se persiste completamente en Zustand. En combinación con SEC-001, el email del usuario está en texto plano en `localStorage`.

---

### Análisis del IndexedDB (Recibos)

✅ **POSITIVO:** Los comprobantes de pago (recibos — imágenes base64) se almacenan en IndexedDB (`finance-pal-receipts`) cifrados con AES-GCM.

⚠️ **PARADOJA:** La clave usada para cifrar recibos en IndexedDB es la misma clave derivada del secreto en `localStorage` (SEC-002). Si el secreto está comprometido, los recibos también lo están.

⚠️ **MIGRACIÓN LEGACY:** Existe código de migración que detecta recibos sin cifrar en IndexedDB y los re-cifra. Durante la ventana de migración, los recibos existen sin cifrar en IndexedDB.

---

### Análisis del Audit Logger (IndexedDB)

✅ **POSITIVO:** El audit log se almacena en IndexedDB separado (`finance-pal-audit`), no en localStorage.

### 🟡 SEC-009 — MEDIO: Hash de audit log usa djb2 (hash de 32 bits, no criptográfico)

**Severidad:** Media  
**Archivo:** [`src/lib/audit-logger.ts`](../src/lib/audit-logger.ts), líneas 89-108

```typescript
function computeHash(entry: Omit<AuditEntry, 'hash'>): string {
  // ⚠️ djb2 — hash de 32 bits, NO criptográfico
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // Trunca a 32 bits
  }
  return btoa(JSON.stringify({ hash: hash.toString(16), prevHash: entry.prevHash }));
}
```

**Problema:** djb2 tiene alta tasa de colisiones y NO es resistente a pre-imagen. Un atacante con acceso al IndexedDB puede:
1. Modificar una entrada del audit log
2. Calcular el nuevo djb2 hash en < 1ms
3. Actualizar el hash almacenado

La cadena de hashes no es "tamper-evident" contra un atacante con acceso local.

**Mitigación:** Usar `crypto.subtle.digest('SHA-256', ...)` para el hash — está disponible en el mismo contexto.

---

## Área 4: Autenticación y Manejo de Tokens JWT

### Análisis del Flujo de Autenticación

**Archivos:** [`src/pages/Login.tsx`](../src/pages/Login.tsx), [`src/pages/AuthCallback.tsx`](../src/pages/AuthCallback.tsx), [`src/hooks/useSessionManager.ts`](../src/hooks/useSessionManager.ts)

#### Almacenamiento del JWT de Sesión

El JWT de Supabase se almacena en `localStorage` bajo la clave `sb-rjforcrdyfuodsqtopvp-auth-token`. Esto es el comportamiento **por defecto del Supabase JS SDK v2** y es aceptable para aplicaciones SPA.

✅ **POSITIVO:** El SDK gestiona el refresh automático del access token (1 hora de expiración por defecto).

✅ **POSITIVO:** La aplicación soporta **TOTP MFA** completo: enrolamiento, desafío y verificación con `supabase.auth.mfa.*`.

✅ **POSITIVO:** OAuth con Google y GitHub implementado con validación de redirect URI via allowlist.

### 🟡 SEC-008 — MEDIO: Rate limiting del Login es Client-Side (bypasseable)

**Severidad:** Media  
**Archivo:** [`src/lib/rate-limiter.ts`](../src/lib/rate-limiter.ts)

```typescript
rateLimiter.configure('auth', { maxRequests: 10, windowMs: 60000, keyPrefix: 'auth' });
```

El rate limiter de autenticación está implementado en memoria del cliente. Un atacante puede:
- Abrir múltiples tabs/ventanas para resetear el contador
- Usar diferentes instancias del navegador
- Realizar peticiones directas a la API de Supabase (sin pasar por el cliente)

Supabase tiene rate limiting propio en su auth endpoint, pero la protección adicional del cliente no añade seguridad real contra ataques de fuerza bruta.

### 🟡 SEC-010 — MEDIO: Takeover de sesión multi-dispositivo sin confirmación MFA

**Severidad:** Media  
**Archivo:** [`src/hooks/useSessionManager.ts`](../src/hooks/useSessionManager.ts), líneas 56-78

```typescript
const requestTakeover = useCallback(() => {
  // ...
  setTimeout(async () => {
    // ⚠️ Fuerza borrado de sesión de OTRO dispositivo sin MFA/PIN
    await supabase.from('user_sessions').delete().eq('device_id', otherDevice.id);
    setSessionState('active');
    window.location.reload();
  }, 15000);
}, [otherDevice, deviceId]);
```

**Problema:** El flujo de "takeover" de sesión (tomar control de otro dispositivo) no requiere re-autenticación ni segundo factor. Un atacante con acceso temporal al dispositivo del usuario (p. ej., deja desbloqueado el navegador) puede:
1. Abrir la app en un nuevo contexto/tab
2. Iniciar un takeover del dispositivo principal del usuario
3. La sesión del dispositivo legítimo queda "paused" sin notificación push en ese mismo dispositivo

### 🟠 SEC-006 — ALTO: Clave ANON de Supabase comprometida en `.env` local

**Severidad:** Alta  
**Archivo:** [`.env`](../.env) (listado en `.gitignore` pero presente en disco)

```
VITE_SUPABASE_ANON_KEY=***
```

**Hallazgos:**
1. La clave ANON decodificada revela: `ref: "rjforcrdyfuodsqtopvp"`, `role: "anon"`, `exp: 2100-01-19` — expiración en ~74 años.
2. El `.gitignore` excluye `.env` correctamente. Sin embargo, la presencia del archivo con credenciales reales en disco local representa un riesgo si el directorio se comparte, sincroniza con cloud storage, o el repositorio es accidentalmente publicado.
3. La URL del proyecto Supabase (`https://rjforcrdyfuodsqtopvp.supabase.co`) está públicamente visible en cualquier build de producción (empaquetada por Vite como `VITE_*`).

**Nota:** La `anon key` de Supabase es **diseñada para ser pública** (es un JWT con rol anónimo). La seguridad real recae en RLS. Sin embargo, una expiración de 74 años es innecesariamente larga — el estándar es 1-5 años.

---

### 🟡 SEC-012 — MEDIO: `isValidRedirectUri` permite cualquier `localhost`

**Severidad:** Media  
**Archivo:** [`src/pages/Login.tsx`](../src/pages/Login.tsx), líneas 41-54

```typescript
function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (OAUTH_REDIRECT_ALLOWLIST.includes(uri)) return true;
    if (parsed.hostname.endsWith('.financepal.com') && parsed.pathname === '/auth/callback') return true;
    // ⚠️ Permite localhost con CUALQUIER puerto
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
    return false;
  } catch {
    return false;
  }
}
```

**Problema:** La condición `parsed.hostname === 'localhost'` permite cualquier URI con host `localhost`, independientemente del path y puerto. Esto incluye `http://localhost:9999/malicious-path`. En entornos de desarrollo, si otro proceso local está escuchando en un puerto inesperado, podría interceptar el callback OAuth.

**Mitigación:** La validación debe verificar también el `pathname === '/auth/callback'` para localhost, y solo los puertos conocidos (5173, 8080, 3000).

---

## Área 5: IDOR, Inyección y Lógica de Aplicación

### 🟠 SEC-005 — ALTO: IDOR Potencial en Servicios de Update/Delete

**Severidad:** Alta  
**Archivos:** [`src/services/transactions.service.ts`](../src/services/transactions.service.ts), [`src/services/accounts.service.ts`](../src/services/accounts.service.ts), [`src/services/debts.service.ts`](../src/services/debts.service.ts)

**Problema:** Las funciones de UPDATE y DELETE filtran solo por `id` del registro, sin verificar `user_id`:

```typescript
// transactions.service.ts línea 134
export async function updateTransaction(id: string, patch: Partial<Transaction>): Promise<void> {
  const { error } = await supabase.from('transactions')
    .update(toUpdatePayload(patch))
    .eq('id', id);  // ⚠️ Sin .eq('user_id', currentUserId)
}

// accounts.service.ts línea 110
export async function updateAccount(id: string, patch: Partial<Account>): Promise<void> {
  const { error } = await supabase.from('accounts')
    .update(toUpdatePayload(patch))
    .eq('id', id);  // ⚠️ Sin .eq('user_id', currentUserId)
}

// debts.service.ts líneas 150-158, 160-168, 201-209
export async function updateDebt(id: string, patch: Partial<Debt>): Promise<void> {
  // ⚠️ Solo filtra por id
}
export async function deleteDebt(id: string): Promise<void> {
  // ⚠️ Solo filtra por id
}
export async function deleteDebtPayment(paymentId: string): Promise<void> {
  // ⚠️ Solo filtra por id — sin user_id
}
```

**Evaluación de riesgo:** Las políticas RLS en Supabase actúan como **primera línea de defensa** y efectivamente previenen el acceso cross-usuario a nivel de base de datos. Las consultas con solo `.eq('id', id)` son filtradas por RLS usando `auth.uid()`. **Sin embargo:**

1. Esto crea dependencia total en que RLS esté correctamente configurado (single point of failure)
2. El filtro de `user_id` en el servicio es una defensa en profundidad estándar (Defense-in-Depth)
3. Ante un fallo de configuración de RLS (p. ej., SEC-011), las operaciones de UPDATE/DELETE quedarían completamente sin protección

**El riesgo actual es MEDIO-ALTO**: RLS mitiga el IDOR activamente, pero la ausencia de filtro de `user_id` en servicios representa una violación de la práctica de "Defense in Depth" para una app financiera.

---

### Análisis de Inyección SQL / NoSQL

✅ **POSITIVO:** La app usa exclusivamente el **Supabase JS SDK** con queries parametrizadas. No existe concatenación de strings para construir queries SQL. El riesgo de SQL injection es mínimo.

✅ **POSITIVO:** Los campos de texto libre (concept, note, person) pasan por sanitizadores Zod en `src/lib/validators.ts` y `src/lib/sanitizers.ts` antes de ser insertados.

✅ **POSITIVO:** Las IDs son validadas como UUIDs v4 con regex antes de ser usadas:
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

---

### Análisis de XSS

✅ **POSITIVO:** React escapa automáticamente todo contenido renderizado en JSX.

✅ **POSITIVO:** No se encontró uso de `dangerouslySetInnerHTML` en los archivos analizados.

✅ **POSITIVO:** La CSP en `netlify.toml` incluye `script-src 'self'` que previene scripts inline y de terceros no autorizados.

⚠️ **OBSERVACIÓN (SEC-014):** La CSP no incluye `nonce` para scripts. En modo producción (`npm run build`), Vite genera módulos ES que no requieren `'unsafe-inline'`. En desarrollo (`npm run dev`), Vite puede necesitar `'unsafe-inline'` para HMR, pero esto no aplica en producción.

---

### SEC-018 — BAJO: Importación JSON sin límite de tamaño previo al parse

**Severidad:** Baja  
**Archivo:** [`src/store/finance-store.ts`](../src/store/finance-store.ts), línea 245

```typescript
importData: async (json, scopes) => {
  try {
    const parsed = JSON.parse(json);  // ⚠️ Sin verificar tamaño antes
```

Un usuario malintencionado podría compartir un archivo JSON de importación de varias decenas de MB. El `JSON.parse()` de un string muy grande puede bloquear el hilo principal del navegador (DoS del cliente). Aunque el impacto es solo al propio usuario, es una práctica de robustez recomendada.

---

## Área 6: Seguridad de la Plataforma y Configuración

### 🟠 SEC-003 — ALTO: CORS Wildcard en Edge Function sin Autenticación de Llamante

**Severidad:** Alta  
**Archivo:** [`supabase/functions/send-reminders/index.ts`](../supabase/functions/send-reminders/index.ts), líneas 9-12

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ⚠️ Wildcard — cualquier origen
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Problemas:**

1. **Sin autenticación de llamante:** La Edge Function no verifica que la petición provenga de un usuario autenticado o de un servicio de cron legítimo. Cualquier persona con la URL de la función puede invocarla:
   ```
   POST https://rjforcrdyfuodsqtopvp.supabase.co/functions/v1/send-reminders
   ```

2. **Usa `SUPABASE_SERVICE_ROLE_KEY`:** La función tiene acceso a toda la base de datos con privilegios de superuser. Si es invocada maliciosamente, ejecuta consultas a `goals`, `fixed_items` y `push_subscriptions` de TODOS los usuarios.

3. **Rate limiting en memoria de Deno (SEC-013):** El rate limit de 5 req/min por IP se resetea con cada cold start de la función. Un atacante con múltiples IPs puede saturarla.

4. **Exposición de datos en notificaciones:** Las notificaciones push incluyen montos financieros en el body: `"Te faltan $${remaining.toLocaleString("es-MX")}"` — datos financieros visibles en notificaciones del OS, potencialmente visibles en pantallas de bloqueo.

**Mitigación correcta:** Verificar `Authorization: Bearer <service_role_key>` o un secret compartido antes de procesar.

---

### 🟡 SEC-007 — MEDIO: URLs de Recibos en Storage No Firmadas (Públicas)

**Severidad:** Media  
**Archivo:** [`src/services/storage.service.ts`](../src/services/storage.service.ts), líneas 81-84

```typescript
export function getReceiptPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}
```

**Problema:** `getPublicUrl()` genera una URL pública permanente (no firmada, no autenticada). Cualquier persona con la URL puede acceder al comprobante de pago del usuario sin autenticación:
```
https://rjforcrdyfuodsqtopvp.supabase.co/storage/v1/object/public/receipts/{userId}/{receiptId}
```

Esto asume que el bucket `receipts` es **público**. Si el bucket es **privado**, se necesita `createSignedUrl()` en lugar de `getPublicUrl()`.

**Impacto:** Los comprobantes de pago (fotos de recibos, facturas) son documentos financieros personales. URLs públicas permiten:
- Enumeración de recibos si el `receiptId` es predecible (aunque usan UUIDs, lo que mitiga esto)
- Compartición no intencional de URL permanente sin expiración

**Mitigación:** Usar `createSignedUrl(path, expiresIn)` con TTL de 5-60 minutos.

---

### Headers de Seguridad — Netlify

**Archivo:** [`netlify.toml`](../netlify.toml)

| Header | Valor | Evaluación |
|--------|-------|-----------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; ...` | ✅ Bien configurado. Falta `upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | ✅ Excelente |
| `X-Content-Type-Options` | `nosniff` | ✅ Correcto |
| `X-Frame-Options` | `DENY` | ✅ Correcto |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ Correcto |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | ✅ Buen mínimo |

**Observación:** `camera=()` puede conflictuar con la funcionalidad de captura de recibos (la cámara probablemente se usa en la app nativa via Capacitor, no en web). Verificar si afecta funcionalidad web.

**Faltante:** No hay header `Cross-Origin-Opener-Policy` (COOP) ni `Cross-Origin-Embedder-Policy` (COEP).

---

### SEC-016 — BAJO: Datos sensibles en logs de consola

**Archivos:** [`src/lib/sync-engine.ts`](../src/lib/sync-engine.ts) y otros

```typescript
logger.error(`Batch sync failed for table ${table}`, ErrorCodes.SYNC_MUTATION_FAILED, { error });
logger.warn('Sync rate limited, retry after: ' + rateLimitResult.retryAfter, { clientId });
```

Los logs incluyen `clientId` (identificador de dispositivo) y `userId` en contextos de error. En producción, estos logs pueden aparecer en consola del navegador, accesibles por cualquier extensión instalada.

---

## Plan de Mitigación Accionable

### 🔴 PRIORIDAD 1: Críticos (Semana 1)

#### SEC-001 y SEC-002 — Rediseño del modelo de persistencia cifrada

**Opción A — Recomendada: Cifrado transparente sin fallback plaintext**

Eliminar la escritura dual. El estado de Zustand debe **solo** escribirse en el almacenamiento cifrado:

```typescript
// finance-store.ts — storage customizado rediseñado
storage: {
  getItem: async (name: string) => {
    if (isEncryptionAvailable()) {
      const decrypted = await loadEncryptedState(name);
      if (decrypted) {
        try { 
          const data = JSON.parse(decrypted);
          if (data?.state) await restoreReceiptsFromIndexedDB(data.state);
          return data;
        } catch { /* corrupt */ }
      }
    }
    // Fallback SOLO para migración inicial desde versiones antiguas
    const plain = localStorage.getItem(name);
    if (plain) {
      // Leer, cifrar y borrar el plaintext inmediatamente
      try {
        const data = JSON.parse(plain);
        await saveEncryptedState(JSON.stringify(data), name);
        localStorage.removeItem(name); // Borrar texto plano
        return data;
      } catch { /* ignore */ }
    }
    return null;
  },
  setItem: async (name: string, value: any) => {
    if (value?.state) await extractReceiptsToIndexedDB(value.state);
    const serialized = JSON.stringify(value);
    if (isEncryptionAvailable()) {
      await saveEncryptedState(serialized, name);
    }
    // NO guardar texto plano excepto si crypto no está disponible
  },
  removeItem: async (name: string) => {
    localStorage.removeItem(name);
    if (isEncryptionAvailable()) await clearEncryptedState(name);
  },
}
```

**Opción B — Clave basada en sesión de Supabase:**

Derivar la clave AES-GCM del JWT de sesión del usuario (no almacenable en localStorage):

```typescript
async function getSessionKey(): Promise<CryptoKey | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  
  // Usar el JWT como material de clave — se invalida al cerrar sesión
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(session.access_token.slice(-32)), // últimos 32 chars
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  // ... deriveKey como en la implementación actual
}
```

**Ventaja:** La clave no persiste en disco — se deriva del token de sesión activo.  
**Desventaja:** Los datos son inaccesibles si el token expira (requiere re-login para re-derivar).

---

#### SEC-001 — Inmediato: Borrar texto plano de localStorage existente

Añadir en la inicialización de la app (antes de cargar el store):

```typescript
// Migración de seguridad: borrar datos en texto plano si existe copia cifrada
async function migratePlaintextToEncrypted() {
  const plain = localStorage.getItem('migol-finanzas-v2');
  if (!plain) return;
  
  if (isEncryptionAvailable()) {
    const encrypted = localStorage.getItem('finance-pal-encrypted-v1');
    if (encrypted) {
      // Ya existe copia cifrada — borrar texto plano
      localStorage.removeItem('migol-finanzas-v2');
    }
  }
}
```

---

### 🟠 PRIORIDAD 2: Altos (Semana 2)

#### SEC-004 — Restringir SECURITY DEFINER a llamadas autenticadas

```sql
-- Revocar acceso público y otorgar solo al rol autenticado
REVOKE EXECUTE ON FUNCTION cleanup_stale_sessions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cleanup_stale_sessions() FROM anon;

-- Solo permitir desde el backend (service_role) o anon autenticado con verificación interna
ALTER FUNCTION cleanup_stale_sessions()
  SECURITY DEFINER
  SET search_path = '';

-- Añadir verificación interna de que el llamante es autenticado
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Solo permite llamadas desde service_role o usuarios autenticados
  IF current_user NOT IN ('service_role', 'authenticated') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  DELETE FROM user_sessions
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes'
    AND created_at < NOW() - INTERVAL '2 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
```

---

#### SEC-005 — Añadir filtro `user_id` en operaciones de servicio

```typescript
// En transactions.service.ts
export async function updateTransaction(
  id: string, 
  patch: Partial<Transaction>,
  userId: string  // ← Requerir userId
): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update(toUpdatePayload(patch))
    .eq('id', id)
    .eq('user_id', userId);  // ← Defense-in-depth
}

export async function deleteTransaction(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
}
// Aplicar el mismo patrón a todos los services (accounts, debts, goals, etc.)
```

---

#### SEC-003 — Asegurar la Edge Function send-reminders

```typescript
// Añadir verificación de secret compartido
const FUNCTION_SECRET = Deno.env.get("FUNCTION_SECRET");
const authHeader = req.headers.get("x-function-secret");

if (!FUNCTION_SECRET || authHeader !== FUNCTION_SECRET) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { 
    status: 401,
    headers: corsHeaders 
  });
}

// Restringir CORS a origen conocido en producción
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "https://financepal-web.vercel.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,  // No wildcard
  // ...
};
```

---

#### SEC-006 — Rotación de claves Supabase

1. Ir al Dashboard de Supabase → Settings → API → Regenerar `anon key` y `service_role key`
2. Actualizar `.env` local con las nuevas claves
3. Actualizar variables de entorno en Netlify/Vercel
4. Considerar acortar TTL de la `anon key` a 1-2 años

---

### 🟡 PRIORIDAD 3: Medios (Semana 3-4)

#### SEC-007 — URLs firmadas para recibos

```typescript
// En storage.service.ts — reemplazar getPublicUrl por signed URL
export async function getReceiptSignedUrl(
  storagePath: string, 
  expiresInSeconds = 300  // 5 minutos
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  
  if (error || !data) throw new AppError(ErrorCodes.STORAGE_URL_FAILED, 'Error al generar URL firmada');
  return data.signedUrl;
}
```

También verificar en el Dashboard de Supabase Storage que el bucket `receipts` esté configurado como **privado**.

---

#### SEC-009 — Reemplazar djb2 por SHA-256 en audit logger

```typescript
async function computeHash(entry: Omit<AuditEntry, 'hash'>): Promise<string> {
  const data = JSON.stringify({
    id: entry.id, timestamp: entry.timestamp, userId: entry.userId,
    action: entry.action, resource: entry.resource,
    resourceId: entry.resourceId, details: entry.details,
    prevHash: entry.prevHash,
  });
  
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

#### SEC-011 — Corregir columnas `deleted_at` faltantes en esquema

```sql
-- Añadir deleted_at a user_sessions y user_settings
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Corregir el bloque DO $$ para user_settings (usar tablename correcto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_settings'
  ) THEN
    CREATE POLICY "Users can view their own settings" ON user_settings 
      FOR SELECT USING (auth.uid() = user_id);
    -- ...
  END IF;
END $$;
```

---

#### SEC-012 — Restringir validación de localhost a paths y puertos conocidos

```typescript
function isValidRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (OAUTH_REDIRECT_ALLOWLIST.includes(uri)) return true;
    if (parsed.hostname.endsWith('.financepal.com') && parsed.pathname === '/auth/callback') return true;
    // ⚠️ Añadir verificación de pathname para localhost
    if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') 
        && parsed.pathname === '/auth/callback'
        && ['5173', '8080', '3000'].includes(parsed.port)) return true;
    return false;
  } catch { return false; }
}
```

---

### 🟢 PRIORIDAD 4: Bajos (Backlog)

#### SEC-015 — Excluir email del estado persistido

```typescript
// En finance-store.ts — opción partialize del persist
{
  name: "migol-finanzas-v2",
  // ...
  partialize: (state) => ({
    ...state,
    // Excluir campos que no deben persistir localmente
    profile: {
      ...state.profile,
      email: undefined,  // No persistir email en storage local
    },
  }),
}
```

#### SEC-018 — Límite de tamaño en importación JSON

```typescript
importData: async (json, scopes) => {
  const MAX_IMPORT_SIZE = 50 * 1024 * 1024; // 50 MB
  if (json.length > MAX_IMPORT_SIZE) {
    return { ok: false, error: 'Archivo demasiado grande (máximo 50 MB)' };
  }
  // ...
}
```

#### SEC-014 — Añadir headers COOP/COEP al netlify.toml

```toml
[[headers]]
  for = "/*"
  [headers.values]
    # ... headers existentes ...
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Resource-Policy = "same-origin"
```

---

## Controles de Seguridad Positivos Detectados

Este proyecto implementa una cantidad notable de controles de seguridad que merecen reconocimiento:

| Control | Implementación | Archivo |
|---------|---------------|---------|
| ✅ RLS completo | Todas las tablas con `auth.uid() = user_id` | `supabase/schema.sql` |
| ✅ Cifrado AES-GCM | PBKDF2-SHA256 con 600,000 iteraciones (OWASP 2026) | `encrypted-storage.ts` |
| ✅ TOTP MFA | Enrolamiento y verificación de 2FA | `Login.tsx`, `AuthContext` |
| ✅ Audit logging | Hash-chaining con IndexedDB | `audit-logger.ts` |
| ✅ Sanitización con Zod | Validación de todos los tipos de entidad | `sanitizers.ts`, `validators.ts` |
| ✅ UUID seguro | `crypto.randomUUID()` para todos los IDs | `sanitizers.ts` |
| ✅ Rate limiting | Por acción (auth, sync, storage, etc.) | `rate-limiter.ts` |
| ✅ SECURITY BARRIER | Vistas SQL con protección de filtrado | `schema.sql` |
| ✅ Column-Level Security | Vistas `*_safe` excluyen datos bancarios | `schema.sql` |
| ✅ OAuth redirect allowlist | Validación de URIs de redirección | `Login.tsx` |
| ✅ Password strength meter | Evaluación de fortaleza en registro | `Login.tsx` |
| ✅ CSP stricta | `script-src 'self'`, HSTS, X-Frame-Options | `netlify.toml` |
| ✅ Soft deletes | `deleted_at` para borrado lógico | `schema.sql` |
| ✅ PII export options | `excludePII`, `excludeBankDetails`, etc. | `finance-store.ts` |
| ✅ Mutex de sync | Lock por usuario para prevenir race conditions | `sync-engine.ts` |
| ✅ Exponential backoff | Reintentos con jitter en sync | `sync-engine.ts` |
| ✅ `SET search_path = ''` | Previene ataques de search_path injection | `schema.sql` |

---

## Matriz de Riesgo Residual

```
    IMPACTO
    Alto │ SEC-006 │ SEC-005  │ SEC-001, SEC-002
         │         │ SEC-003  │
  Medio  │ SEC-018 │ SEC-008  │ SEC-004
         │ SEC-016 │ SEC-009  │
    Bajo │ SEC-014 │ SEC-012  │ SEC-007
         │ SEC-015 │ SEC-010  │ SEC-011, SEC-013
         └─────────┴──────────┴──────────────────→
           Bajo    │   Medio  │    Alto      PROBABILIDAD
```

---

*Reporte generado automáticamente por análisis estático de código fuente. Las vulnerabilidades identificadas son basadas en revisión de código sin ejecución dinámica. Se recomienda realizar pentesting dinámico adicional para validar los hallazgos en ambiente de staging.*

*Clasificación de severidades basada en CVSS v3.1 y OWASP Risk Rating Methodology.*

---

# 🧭 Re-auditoría Integral v2 — 2026-10 — Finance Pal v1.19.38

> **Fecha de cierre:** `2026-10-20`  
> **Auditor ejecutor (Fase 2):** OpenCode CLI (`DeepSeek 4.1 Flash`) con evidencia `N0`–`N2`  
> **Auditor revisor y resolución de escalaciones (Fase 3):** Antigravity (`agy` — `Gemini 3.8 Flash / Argon 4`) con verificación dinámica `N3` en laboratorio PostgreSQL 17 (`T06`, `T09`, `T12`) y arnés WebCrypto Node 26 (`T13`)  
> **Alcance:** aplicación web/PWA, Supabase producción (`rjforcrdyfuodsqtopvp`), Android/Capacitor, CI/CD y cadena de suministro  
> **Regla de conservación:** la auditoría v1 del `2026-09-23` se conserva íntegra arriba como historial. Esta sección v2 es el dictamen vigente y corrige las calificaciones que la evidencia posterior desmintió o matizó.  
> **Evidencia:** `.agent/audit/evidence/F0`–`F10` y PoCs en `.agent/audit/scratch/`.  
> **Restricción respetada:** cero cambios en `src/**`, `supabase/**`, `android/**`, `public/**` y `package.json`; ninguna prueba `N3` contra producción.

---

## 12.1 Dictamen ejecutivo

**Riesgo global: 🔴 ALTO. La aplicación NO es certificable para producción multiusuario con datos financieros reales en su estado actual.**

La arquitectura conserva controles valiosos —RLS activo en las 10 tablas, 9/10 tablas y 3/3 vistas `*_safe` con aislamiento cross-tenant verificado dinámicamente (`T06`), bucket `receipts` privado, cifrado AES-GCM local, CSP con `script-src 'self'`, ausencia de sinks XSS alcanzables y `service_role` fuera del cliente—, pero cinco brechas estructurales cambian el dictamen:

1. **`NEW-04` (Crítica, CVSS 8.1):** el MFA es solo de interfaz. Un JWT `aal1` conserva CRUD completo porque **ninguna** de las 40 políticas RLS ni función exige `aal2` (confirmado dinámicamente en `T09`).
2. **`F2-A` (Alta, CVSS 8.1 — descubierto dinámicamente en `T06`):** la política `UPDATE` de `public.push_subscriptions` usa `USING (true) WITH CHECK (auth.uid() = user_id)`. Un atacante autenticado que ejecute un `UPDATE` sin cláusula `WHERE` (`UPDATE public.push_subscriptions SET user_id = auth.uid()`) secuestra **todas** las filas de otros usuarios en la tabla y puede leer enseguida sus `endpoint`, `p256dh`, `auth` y `user_agent`.
3. **`F8-A` (Alta, CVSS 8.1):** `MainActivity` exportada + custom scheme `app.financepal.com://auth/callback` + flujo OAuth implícito + `setSession` sin validar origen/`state` permiten interceptación o fijación de sesión en Android.
4. **`SEC-015`/`F4-D` (Alta, CVSS 7.1):** el logout no borra estado (`migol-finanzas-v2`), cola, recibos ni audit log (con `newEmail` en claro visible para la siguiente cuenta); además elimina el salt compartido y deja los blobs locales indescifrables (confirmado dinámicamente en `T13`).
5. **`SEC-002`/`NEW-01` (Media, CVSS 5.5):** la clave AES-GCM se deriva de `user.id` + un salt público; el PoC `DECRYPTED_OK` confirma que un backup, XSS o acceso local permite descifrar el estado.

A ello se suman **`F4-F`** (upgrade PBKDF2 sin re-cifrar, pérdida de datos), **`F5-B`** (mutación de recibos con firma incorrecta), **`F6-A`** (recordatorios inoperantes por secreto vacío) y **`SEC-008`** (política de contraseñas débil y rate limiting solo cliente).

**Condición de transición:** cerrar el backlog **P0** antes de un nuevo despliegue con usuarios reales; cerrar **P1** antes de habilitar sincronización multiusuario o backup en la nube. Con P0+P1 el riesgo residual esperado baja a **Medio**. Las **25/25 pruebas (`T01`–`T25`)** han sido ejecutadas y cerradas (incluyendo `T06`, `T09`, `T12` y `T13` resueltas por `agy` en Fase 3).

---

## 12.2 Cobertura ejecutada

| Fase | Foco | Nivel máximo | Evidencia | Estado |
| :--- | :--- | :---: | :--- | :---: |
| `F0` | Entorno, alcance, protocolo `N0`–`N3` | `N1` | `F0-environment.md` | ✅ |
| `F1` | Secretos, dependencias y bundle | `N0` | `F1-*` | ✅ |
| `F2` | RLS, vistas, RPC y Storage | `N1`/`N3` (lab) | `F2-catalog-and-rls.md`, `F2-schema-drift.md`, `F2-prod-schema.sql`, `poc-t06-t09-t12-output.txt` | ✅ (`T06` ejecutada) |
| `F3` | Auth, MFA, sesiones y OAuth | `N1`/`N3` (lab) | `F3-auth-mfa-sessions.md`, `poc-t06-t09-t12-output.txt` | ✅ (`T09`/`T12` ejecutadas) |
| `F4` | Almacenamiento cliente y cripto | `N0`/`N2` | `F4-storage-inventory.md`, `F4-crypto-and-auditlog.md`, `poc-t13-output.json` | ✅ (`T13` ejecutada) |
| `F5` | Servicios, IDOR y validación | `N0` | `F5-services-idor-validation.md` | ✅ |
| `F6` | Edge Function, push y Service Worker | `N1`/`N2` | `F6-edge-push-sw.md` | ✅ |
| `F7` | XSS, CSP, headers y ZAP | `N0`/Pasivo | `F7-web-xss-csp.md`, `F7-semgrep.json`, `F7-zap-baseline.*` | ✅ |
| `F8` | Android, backup y MASVS v2 | `N0` | `F8-android-masvs.md` | ✅ |
| `F9` | CI/CD e higiene del repositorio | `N0` | `F9-cicd-and-repo-hygiene.md` | ✅ |
| `F10` | Privacidad, logging y GDPR/LFPDPPP | `N0` | `F10-privacy-logging-gdpr.md` | ✅ |
| `F11` | Consolidación, verificación y cierre | `N0` | este documento | ✅ |

**Cobertura de pruebas:** **25/25 pruebas ejecutadas (`100%`)**. Las 4 pruebas escaladas en Fase 2 (`T06`, `T09`, `T12`, `T13`) fueron resueltas dinámicamente por Antigravity (`agy`) en Fase 3 sobre el esquema real de producción en PostgreSQL 17 local (`poc-t06-t09-t12-rls-tests.sql`) y arnés WebCrypto Node 26 (`poc-t13-logout-storage.mjs`) sin tocar datos reales en producción.

---

## 12.3 Resumen de hallazgos

### 12.3.1 Ítems planificados (`SEC-*` + `NEW-*`)

| Veredicto | `SEC-*` | `NEW-*` | Total |
| :--- | ---: | ---: | ---: |
| ✅ Cerrado / descartado | 4 | 2 | 6 |
| ❌ Confirmado | 11 | 8 | 19 |
| ⚠️ Parcial / condicional | 6 | 2 | 8 |
| **Total** | **21** | **12** | **33** |

| Severidad final | `SEC-*` | `NEW-*` |
| :--- | ---: | ---: |
| 🔴 Crítica | 0 | 1 |
| 🟠 Alta | 2 | 0 |
| 🟡 Media | 8 | 8 |
| 🟢 Baja | 7 | 1 |
| ⚪ Cerrado / descartado | 4 | 2 |

### 12.3.2 Hallazgos nuevos materiales (`F2`–`F10`)

Además de los 33 ítems planificados, la re-auditoría identificó **4 hallazgos altos** (`F8-A`, `F4-F`, `F5-B`, `F6-A`), **11 medios** (`F3-A`, `F3-B`, `F4-E`, `F5-A`, `F5-C`, `F6-B`, `F9-A`, `F9-B`, `F9-C`, `F10-A`, `F10-D`) y una veintena de bajos/informativos documentados en cada evidencia. Los más relevantes se listan en §12.5.

---

## 12.4 Hallazgos previos (`SEC-001`–`SEC-021`)

> **Nivel:** `N0` estático, `N1` catálogo/API de solo lectura, `N2` prueba controlada con datos ficticios. Ningún `N3`.  
> **CVSS:** vector base 3.1; la puntuación es orientativa y asume el peor caso realista tras los controles existentes.

| ID | Veredicto | Severidad · CVSS | Nivel | Archivo#línea | Evidencia | Impacto | Recomendación | Esf. | ASVS / MASVS |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| `SEC-001` | ✅ **CERRADO** | — | `N0` | `src/lib/encrypted-storage.ts:127-149` | `F4-storage-inventory.md` §1.1 | Ya no hay fallback a texto plano: `setItem` cifra y elimina la copia plana. | Mantener y añadir test de regresión que inspeccione `localStorage`. | `S` | ASVS V6 · MASVS-STORAGE-1 |
| `SEC-002` | ❌ **CONFIRMADO** | 🟡 Media · **5.5**<br>`AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` | `N0`/`N2` | `src/lib/encrypted-storage.ts:62-80` | `F4-crypto-and-auditlog.md` §1.3; PoC `DECRYPTED_OK` | La clave se deriva de `user.id` (público en el JWT) + salt en `localStorage`; backup/XSS/acceso local descifra el estado. | Derivar con un secreto no exportable (Keystore/Keychain) o passphrase; migrar blobs con versión de clave. | `M` | ASVS V6 · MASVS-CRYPTO-1/2 |
| `SEC-003` | ⚠️ **PARCIAL** | 🟡 Media · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` | `N1`/`N2` | `supabase/functions/send-reminders/index.ts:228-236` | `F6-edge-push-sw.md` §3-4 | Hay `verify_jwt` + `FUNCTION_SECRET`, pero la comparación es `!==` y el secreto desplegado está vacío: falla cerrada y la función no sirve. | `timingSafeEqual`, rotar secreto, alinear la versión desplegada con el repo. | `S` | ASVS V1/V4 · MASVS-NETWORK-2 |
| `SEC-004` | ⚠️ **PARCIAL** | 🟡 Media · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` | `N1` | `supabase/schema.sql:300-320` | `F2-catalog-and-rls.md` | `cleanup_stale_sessions()` es `SECURITY DEFINER` y `authenticated` puede ejecutarla; el guard está roto y deniega siempre. | Revocar `EXECUTE` a `authenticated`, dejar solo `service_role` y corregir el guard. | `S` | ASVS V4/V5 · MASVS-AUTH-2 |
| `SEC-005` | ⚠️ **PARCIAL** | 🟡 Media · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` | `N0` | `src/services/goals.service.ts:160`; `src/hooks/mutations/useAccountMutations.ts:96`; `src/hooks/useSessionManager.ts:57` | `F5-services-idor-validation.md` §2-3 | Tres rutas de escritura no filtran `user_id`; RLS las contiene, pero un fallo de política las convierte en IDOR. | Añadir `.eq('user_id', userId)` en todas las mutaciones y tests A→B. | `S` | ASVS V4/V8 · MASVS-AUTH-2 |
| `SEC-006` | ⚠️ **PARCIAL** | 🟢 Baja · **3.1**<br>`AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N` | `N0` | `src/lib/supabase.ts:4`; bundle `dist/assets/supabase-*.js` | `F1-supply-chain-and-bundle.md` | La `anon` key expira en 2036 (no 2100) y es pública por diseño; el riesgo es su larga vida y el `role=anon`. | Rotar la clave, reducir expiración y mantener RLS como única frontera. | `S` | ASVS V2/V6 · MASVS-CRYPTO-1 |
| `SEC-007` | ⚠️ **PARCIAL** | 🟢 Baja · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` | `N1` | `src/lib/supabase-storage.ts:129-150` | `F2-catalog-and-rls.md` | Bucket privado y URLs firmadas, pero sin `file_size_limit` ni allowlist MIME. | Configurar límite de tamaño/MIME y validar en servidor. | `S` | ASVS V4/V12 · MASVS-STORAGE-2 |
| `SEC-008` | ❌ **CONFIRMADO** | 🟠 Alta · **7.4**<br>`AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N` | `N0`/`N1` | `src/pages/Login.tsx`; `src/lib/rate-limiter.ts` | `F3-auth-mfa-sessions.md` §3 | Mínimo 6, HIBP off, sin CAPTCHA/lockout; el limiter cliente no está conectado al login. Solo GoTrue 30/5 min/IP. | Política 12+, HIBP, CAPTCHA, lockout y rate limit server-side. | `S` | ASVS V2/V3 · MASVS-AUTH-1 |
| `SEC-009` | ⚠️ **PARCIAL** | 🟡 Media · **5.5**<br>`AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N` | `N0`/`N2` | `src/lib/audit-logger.ts:70-132` | `F4-crypto-and-auditlog.md` §2.3; PoC `CHAIN_FORGED_OK` | SHA-256 corrige colisiones, pero sin HMAC ni anclaje externo la cadena se reescribe completa desde IndexedDB. | HMAC con clave no local y anclaje/exportación firmada al servidor. | `M` | ASVS V7 · MASVS-CODE-4 |
| `SEC-010` | ❌ **CONFIRMADO (diseño)** | 🟡 Media · **6.5**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H` | `N0` | `src/hooks/useSessionManager.ts:57` | `F3-auth-mfa-sessions.md` §4.2 | `requestTakeover` no exige reautenticación/MFA; el canal Realtime es público y un mensaje falsificado pausa/borra la sesión de otro dispositivo. | Reauth/MFA, token de takeover y canal privado. | `M` | ASVS V3 · MASVS-AUTH-2 |
| `SEC-011` | ✅ **CERRADO** | — | `N1` | `supabase/schema.sql:214-218` | `F2-catalog-and-rls.md` | Las políticas de `user_sessions` ya no referencian `deleted_at`. | Mantener y cubrir con test de catálogo. | `—` | ASVS V4 |
| `SEC-012` | ⚠️ **PARCIAL** | 🟡 Media · **4.2**<br>`AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N` | `N0`/`N1` | `src/pages/Login.tsx:42-72` | `F3-auth-mfa-sessions.md` §2 | El validador cliente es laxo, pero la allowlist exacta de GoTrue bloquea redirects arbitrarios (`T10` pasa). El riesgo real es el flujo implícito en Android (`F8-A`). | PKCE, `state` y validación estricta de scheme/host en cliente y servidor. | `M` | ASVS V3 · MASVS-AUTH-2 |
| `SEC-013` | ❌ **CONFIRMADO** | 🟢 Baja · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` | `N0` | `supabase/functions/send-reminders/index.ts:40-70` | `F6-edge-push-sw.md` §6 | `Map` por isolate, clave = `x-forwarded-for` completo y spoofable, sin poda; se reinicia en cada cold start. | Rate limit distribuido (DB/Redis) y clave por usuario/Token. | `M` | ASVS V11/V13 · MASVS-NETWORK-2 |
| `SEC-014` | ✅ **CERRADO** | — | `N1` | `supabase/schema.sql:246-270` | `F2-catalog-and-rls.md` | Las 3 vistas `*_safe` tienen `security_invoker=true`; `anon` obtiene `[]`. | Mantener y verificar en cada migración. | `—` | ASVS V4/V5 |
| `SEC-015` | ❌ **CONFIRMADO** | 🟠 Alta · **7.1**<br>`AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:H` | `N0` | `src/context/AuthContext.tsx:70-105` | `F4-storage-inventory.md` §2 | El logout no borra estado, cola, recibos ni audit log; `clearEncryptedState()` borra el salt compartido y deja los blobs indescifrables. | Limpiar todas las bases/almacenes, gestionar el salt por usuario y probar pre/post logout. | `M` | ASVS V3/V8 · MASVS-STORAGE-1/2 |
| `SEC-016` | ✅ **CERRADO** | — | `N1` | `supabase/schema.sql:231-235` | `F2-catalog-and-rls.md` | Las 4 políticas de `user_settings` existen y son correctas. | Mantener. | `—` | ASVS V4 |
| `SEC-017` | ❌ **CONFIRMADO** | 🟢 Baja · **3.1**<br>`AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N` | `N1` | `supabase/functions/send-reminders/index.ts:12` | `F6-edge-push-sw.md` §5 | `Access-Control-Allow-Origin: *` fijo en producción; `ALLOWED_ORIGIN` no existe. La función falla cerrada por el secreto vacío. | Allowlist de origen y eliminar `*`. | `S` | ASVS V14 · MASVS-NETWORK-2 |
| `SEC-018` | ❌ **CONFIRMADO** | 🟡 Media · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` | `N0` | `src/store/finance-store.ts:118-135` | `F4-storage-inventory.md` §3 | `profile.email` se cifra local, pero se sincroniza en `user_settings.profile` JSONB y se exporta por defecto (`excludeEmail=false`). | No sincronizar email o cifrarlo; export opt-in y aviso de datos sensibles. | `M` | ASVS V8/V9 · MASVS-STORAGE-2 |
| `SEC-019` | ⚠️ **PARCIAL** | 🟢 Baja · **3.3**<br>`AV:L/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` | `N0` | `src/lib/sync-engine.ts:84`; `src/lib/supabase-storage.ts:144` | `F10-privacy-logging-gdpr.md` §2 | 92 `console.*` + 7 `logger.*`; sin email/montos, pero `clientId`, UUIDs y errores crudos. `drop_console` deja 8 referencias `.catch(console.*)` en `dist/`. | Redactar `sanitizeForLog`, eliminar `.catch(console.*)` y `no-console` en CI. | `S` | ASVS V7/V9 · MASVS-STORAGE-2 |
| `SEC-020` | ⚠️ **PARCIAL** | 🟢 Baja · **3.3**<br>`AV:L/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` | `N0` | `src/store/finance-store.ts:155` | `F5-services-idor-validation.md` §4 | La UI limita a 20 MB, pero `importData()` no limita tamaño ni arrays y no aplica Zod. | Límite en el store, Zod estricto y topes de arrays. | `S` | ASVS V5/V12 · MASVS-CODE-3 |
| `SEC-021` | ❌ **CONFIRMADO** | 🟢 Baja · **5.3**<br>`AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N` | `N0` | `vite.config.ts:28-35` | `F1-supply-chain-and-bundle.md` | `dist/stats.html` (1.26 MB) se genera en producción y expone módulos/rutas/versiones. | Excluirlo del build/deploy o publicarlo solo en CI privado. | `S` | ASVS V14 · MASVS-CODE-3 |

**Lectura del cambio respecto a v1:** `SEC-001`, `SEC-011`, `SEC-014` y `SEC-016` se cierran; `SEC-002` baja de Crítica a Media porque el vector es local (no remoto) y `SEC-006` baja de Alta a Baja porque la clave expira en 2036 y es pública por diseño. `SEC-015` sube a Alta por la combinación de residuos y pérdida de datos. `SEC-019` se mantiene Baja pero se amplía a `clientId`, UUIDs y audit log local.

---

## 12.5 Hipótesis nuevas (`NEW-01`–`NEW-12`)

| ID | Veredicto | Severidad · CVSS | Nivel | Archivo#línea | Evidencia | Impacto | Recomendación | Esf. | ASVS / MASVS |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| `NEW-01` | ❌ **CONFIRMADO** | 🟡 Media · **5.5**<br>`AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` | `N0`/`N2` | `src/lib/encrypted-storage.ts:62-80` | `F4-crypto-and-auditlog.md` §1.3; PoC `DECRYPTED_OK` | Clave AES-GCM derivable de `user.id` + salt público. | Igual que `SEC-002`: secreto no exportable/passphrase y migración versionada. | `M` | ASVS V6 · MASVS-CRYPTO-1/2 |
| `NEW-02` | ✅ **DESCARTADO** | — | `N1` | `supabase/schema.sql:246-270` | `F2-catalog-and-rls.md` | Las 3 vistas `*_safe` usan `security_invoker=true`; no hay bypass de RLS. | Mantener verificación en migraciones. | `—` | ASVS V4/V5 |
| `NEW-03` | ❌ **CONFIRMADO (privilegio)** | 🟡 Media · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L` | `N1` | `supabase/schema.sql:300-320` | `F2-catalog-and-rls.md` | `authenticated` puede ejecutar `cleanup_stale_sessions()`; el guard roto la inutiliza. | Revocar `EXECUTE` y corregir el guard. | `S` | ASVS V4/V5 · MASVS-AUTH-2 |
| `NEW-04` | ❌ **CONFIRMADO (crítico)** | 🔴 Crítica · **8.1**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N` | `N1`/`N2` | `supabase/schema.sql:171-217` | `F3-auth-mfa-sessions.md` §1.3 | **MFA solo UI:** 0 políticas/funciones con `aal`; un JWT `aal1` conserva CRUD completo. | Exigir `aal2` en RLS/funciones o un gate servidor; tests con token `aal1`/`aal2`. | `M` | ASVS V2/V3/V4 · MASVS-AUTH-2 |
| `NEW-05` | ❌ **CONFIRMADO** | 🟡 Media · **6.5**<br>`AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L` | `N1` | `supabase/schema.sql` vs producción | `F2-schema-drift.md` | 12 diferencias; faltan `notification_prefs`, la unique `(user_id, device_id)` y 2 triggers de validación. | Versionar migraciones idempotentes y aplicar en CI/staging. | `M` | ASVS V14 · MASVS-CODE-3 |
| `NEW-06` | ❌ **CONFIRMADO** | 🟡 Media · **5.5**<br>`AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` | `N0` | `android/app/src/main/AndroidManifest.xml:5` | `F8-android-masvs.md` §2.1 | `allowBackup=true` sin reglas: el backup incluye `files/` (recibos/estado) y `app_webview/` (sesión, salt, IndexedDB). | `dataExtractionRules`/`fullBackupContent` excluyendo secretos; evaluar `allowBackup=false`. | `S` | ASVS V8 · MASVS-STORAGE-2 |
| `NEW-07` | ⚠️ **PARCIAL** | 🟡 Media · **4.7**<br>`AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N` | `N0` | `supabase/functions/send-reminders/index.ts:7`; `.github/workflows/*` | `F1`, `F6` §2, `F9` §2 | `esm.sh@2` flotante (`2.117.2`), `npm audit \|\| true`, auto-merge y acciones por tag mutable. | Pinear versiones/SHAs, `npm audit` bloqueante y revisión humana. | `S`/`M` | ASVS V14 · MASVS-CODE-3 |
| `NEW-08` | ❌ **CONFIRMADO** | 🟡 Media · **5.4**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N` | `N0` | `public/sw.js:82` | `F6-edge-push-sw.md` §8; PoC `OPEN_REDIRECT_CONFIRMED` | `notificationclick` abre `data.url` externo; `message` no valida `origin`/`source`. | Allowlist de URLs y validar `event.origin`/`event.source`. | `S` | ASVS V1/V5 · MASVS-PLATFORM-2 |
| `NEW-09` | ❌ **CONFIRMADO** | 🟡 Media · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` | `N0`/`N1` | `supabase/functions/send-reminders/index.ts`; `src/lib/notifications.ts` | `F6-edge-push-sw.md` §7 | Montos/nombres/conceptos visibles por defecto (`hideAmountsInNotifications=false`); producción ignora preferencias. | `hideAmounts=true` por defecto, respetar prefs y no incluir montos en el payload. | `S` | ASVS V8 · MASVS-PLATFORM-2 |
| `NEW-10` | ✅ **DESCARTADO** | — | `N0` | `src/components/ui/chart.tsx:70` | `F7-web-xss-csp.md` §3 | `dangerouslySetInnerHTML` en componente sin llamantes y tree-shaken de `dist/`; no explotable. | Si se reactiva, sanear el CSS o eliminar el sink. | `—` | ASVS V5 · MASVS-CODE-4 |
| `NEW-11` | ⚠️ **PARCIAL** | 🟡 Media · **4.2**<br>`AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N` | `N0`/Pasivo | `vercel.json`; `netlify.toml`; `index.html:13` | `F7-web-xss-csp.md` §4-5 | CSP fuerte con `script-src 'self'`, pero `img-src https:`, `connect-src https://*.supabase.co`, `style-src 'unsafe-inline'`, sin `object-src 'none'`, COOP/CORP/COEP, SRI ni reporting. | Endurecer CSP, añadir SRI y headers de aislamiento. | `S`/`M` | ASVS V14 · MASVS-NETWORK-2 |
| `NEW-12` | ❌ **CONFIRMADO** | 🟢 Baja · **4.3**<br>`AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` | `N0` | `.netlify/state.json:1`; `.netlify/netlify.toml:1`; `graphify-out/**` | `F9-cicd-and-repo-hygiene.md` §3 | `siteId`, ruta local `E:\Projects\...` y 74 archivos de `graphify-out/` (incl. caché y ruta `/home/migol/...`) versionados. | Purgar del índice, añadir a `.gitignore` y rotar lo que corresponda. | `S` | ASVS V14 · MASVS-CODE-3 |

---

## 12.6 Hallazgos nuevos materiales (`F2`–`F10`)

| ID | Severidad | Archivo#línea | Hallazgo | Recomendación | Esf. |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `F2-A` | 🟠 Alta · **8.1** | `F2-prod-schema.sql:621` (`push_subscriptions`) | Política `UPDATE USING (true) WITH CHECK (auth.uid() = user_id)`: un `UPDATE` sin `WHERE` (`SET user_id = auth.uid()`) secuestra **todas** las suscripciones push de otros usuarios y expone `endpoint`/`p256dh`/`auth` (`T06`). | Cambiar `USING (true)` por `USING (auth.uid() = user_id)` en `push_subscriptions`. | `S` |
| `F3-A` | 🟡 Media (cumplimiento) | `src/store/finance-store.ts:281-288` | No existe borrado de cuenta/cloud; `resetAll` solo limpia Zustand local. | RPC/Edge `delete-account` con `service_role`, reauth y auditoría. | `M` |
| `F3-B` | 🟡 Media | Config Auth de producción (`F3` §3.5) | Notificaciones de seguridad de Auth desactivadas (password/email/MFA/identidades). | Activarlas y probar cada evento. | `S` |
| `F3-C` | 🟢 Baja/Media | `src/pages/Login.tsx` (sin `resetPasswordForEmail`) | No hay recuperación de contraseña. | Flujo de reset con token de un solo uso. | `S` |
| `F4-D` | 🟠 Alta | `src/lib/encrypted-storage.ts:245-261` | `clearEncryptedState()` borra el salt compartido y deja estado/recibos indescifrables. | Salt por usuario/versión y borrado coordinado. | `M` |
| `F4-E` | 🟡 Media | `src/lib/audit-logger.ts:110-137` | Audit log global en IndexedDB sin cifrar; `queryAuditLogs()` sin `userId` devuelve entradas de todos. | Cifrar, filtrar por `userId` y purgar en logout. | `M` |
| `F4-F` | 🟠 Alta | `src/lib/encrypted-storage.ts:71-80`, `:112-119` | Upgrade 100k→600k reescribe el salt sin re-cifrar; el siguiente arranque no descifra. | Re-cifrar con la clave vieja antes de actualizar el salt; migración probada. | `M` |
| `F5-A` | 🟡 Media | `src/store/finance-store.ts:155` | `importData` usa `sanitize*`, no Zod; acepta montos negativos, fechas arbitrarias y strings sin límite. | Zapier estricto + límites + validación semántica. | `S`/`M` |
| `F5-B` | 🟠 Alta (funcional) | `src/hooks/mutations/useReceiptMutations.ts:81,105` | `updateTransaction(id, patch)` pasa 2 argumentos a una función de 3 (`userId, id, patch`); `tsc` falla. | Corregir la firma y añadir test de recibos. | `S` |
| `F5-C` | 🟡 Media | `src/lib/sync-engine.ts` (`syncAllToCloud`) | `DELETE ... WHERE user_id` + upserts uno a uno sin transacción; un fallo deja la nube parcialmente vacía. | RPC transaccional o staging + swap. | `M` |
| `F6-A` | 🟠 Alta (disponibilidad) | `supabase/functions/send-reminders/index.ts:228-236` | `FUNCTION_SECRET` vacío y `VAPID_PUBLIC_KEY` ausente; no hay scheduler ni `pg_cron`. | Configurar secretos, VAPID y scheduler; probar end-to-end. | `M` |
| `F6-B` | 🟡 Media | `supabase/functions/send-reminders/index.ts` | Producción v4 (239 líneas) difiere del repo (548): lógica, CORS y auth distintos. | Desplegar desde el repo y bloquear ediciones manuales. | `S` |
| `F7-A` | 🟢 Baja/Media | `index.html` | La WebView nativa no recibe la CSP de Vercel/Netlify; no hay `<meta http-equiv>`. | Añadir CSP meta compatible con Capacitor. | `S` |
| `F7-B` | 🟢 Baja | `index.html:13` | Google Fonts sin `integrity`; un CDN comprometido podría inyectar CSS. | Self-host o SRI. | `S` |
| `F8-A` | 🟠 Alta · **8.1** | `android/app/src/main/AndroidManifest.xml:13-30` | `MainActivity` exportada + custom scheme + OAuth implícito + `setSession` sin origen/`state`. | PKCE, `state`, validar deep link y restringir export/scheme. | `M` |
| `F8-B` | 🟢 Baja · **2.8** | `android/app/src/main/res/xml/file_paths.xml` | `FileProvider` expone `.` en `external-path`, `files-path` y `cache-path`. | Raíces mínimas y `grantUriPermissions` acotado. | `S` |
| `F8-D` | 🟢 Baja (proceso) | `android/app/build.gradle` | Sin `signingConfig`; `assembleRelease` produce APK unsigned pese al README. | Firma reproducible con keystore custodiado. | `M` |
| `F8-F` | 🟢 Baja · **2.4** | `android/app/src/main/java/**/MainActivity.java` | Sin `FLAG_SECURE` ni anti-tapjacking; capturas/overlays exponen montos. | `FLAG_SECURE` y `setFilterTouchesWhenObscured`. | `S` |
| `F9-A` | 🟡 Media · **6.5** (condicional) | `.github/workflows/dependabot-auto-merge.yml` | `contents: write`/`pull-requests: write` en todo el workflow, incluido el job que ejecuta `npm ci`. | `permissions: read-all` por job y `persist-credentials: false`. | `S` |
| `F9-B` | 🟡 Media · **5.3** | `.github/workflows/ci.yml` | `npm audit --audit-level=high \|\| true` no bloquea (3 críticas/31 altas). | Quitar `\|\| true` y fijar umbral. | `S` |
| `F9-C` | 🟡 Media · **6.5** | `.github/workflows/dependabot-auto-merge.yml` | Auto-merge patch/minor/security sin audit, Node 18 EOL y sin required checks demostrados. | Gate de CI/audit y Node 20+. | `S` |
| `F10-A` | 🟡 Media · **5.0** | `src/store/finance-store.ts:118-135` | `excludePII` solo omite bancos/email/recibos; no anonimiza montos, descripciones, metas ni deudas. | Renombrar o implementar anonimización real; toggles en UI. | `M` |
| `F10-B` | 🟢 Baja · **3.3** | `src/lib/audit-logger.ts:49-51,110-137` | Audit log claro con `userId`/`newEmail`, 10k entradas, sin purga ni limpieza en logout. | Cifrar, retención y UI de borrado. | `M` |
| `F10-C` | 🟢 Baja | `src/lib/supabase-storage.ts:203-211` | `sanitizeForLog` solo `JSON.stringify` + truncado; no redacta tokens/URLs/email/userId. | Redactor por claves y patrones. | `S` |
| `F10-D` | 🟡 Media (cumplimiento) | `src/store/finance-store.ts:281-288`; `AuthContext.tsx:70-105` | Sin borrado de cuenta/cloud; `resetAll` local y `signOut` deja audit/recibos. | Igual que `F3-A`: borrado completo con reauth. | `M`/`L` |
| `F10-F` | ✅ Info (positivo) | `src/lib/web-vitals.ts:168-170`; `src/components/ErrorBoundary.tsx:28-34` | Sin telemetría remota: `web-vitals` solo `console.info` y Sentry/LogRocket está comentado. | Mantener y aplicar consentimiento si se habilita. | `—` |

---

## 12.7 Matriz de pruebas (`T01`–`T25`)

| Prueba | Fase | Nivel | Resultado | Detalle |
| :--- | :--- | :---: | :---: | :--- |
| `T01` Secretos en historial git | `F1` | `N0` | ❌ **ABIERTO** | 3 hallazgos gitleaks (1 JWT en `.env` histórico, redactado); 0 verificados por trufflehog. |
| `T02` CVE en dependencias | `F1` | `N0` | ❌ **ABIERTO** | 52 npm (3C/31H); 10 runtime (7H); 81 OSV (3C/30H). |
| `T03` Secretos/source maps en `dist/` | `F1` | `N0` | ❌ **ABIERTO** | Sin secretos ni `.map`; `stats.html` presente. |
| `T04` Tablas sin RLS | `F2` | `N1` | ✅ **PASA** | 0/10 tablas sin RLS. |
| `T05` Vistas sin `security_invoker` | `F2` | `N1`/`N2` | ✅ **PASA** | 3/3 con `security_invoker`; `anon` → `[]`. |
| `T06` CRUD cross-tenant A→B | `F2` | `N1`/`N3` | ❌ **FALLA (`push_subscriptions`) / ✅ PASA (resto)** | 9/10 tablas, 3/3 vistas `*_safe` y `storage.objects` aíslan al 100%; `push_subscriptions` permite secuestro cross-tenant con `UPDATE` sin `WHERE` (`F2-A`). |
| `T07` `EXECUTE` de RPC `SECURITY DEFINER` | `F2` | `N1` | ❌ **FALLA** | `authenticated=true`; guard roto deniega siempre. |
| `T08` Storage cross-user/público | `F2` | `N1`/`N2` | ✅ **PASA (parcial)** | Bucket privado; `anon` 400; sin límites MIME/tamaño. |
| `T09` REST con token `aal1` en cuenta MFA | `F3` | `N1`/`N3` | ❌ **FALLA** | `poc-t06-t09-t12-rls-tests.sql`: con factor TOTP `verified` y claim `aal1`, `SELECT`/`INSERT`/`UPDATE`/`DELETE` + `storage.objects` pasan al 100% (`NEW-04`). |
| `T10` Redirect OAuth arbitrario | `F3` | `N0`/`N1` | ✅ **PASA (salvedad)** | Allowlist exacta de GoTrue bloquea redirects; cliente laxo y Netlify antiguo como riesgo residual. |
| `T11` Configuración de Auth | `F3` | `N1` | ❌ **FALLA** | Mínimo 6, HIBP off, sin CAPTCHA/notificaciones/recuperación/timeout. |
| `T12` Takeover sin reautenticación | `F3` | `N0`/`N3` | ⚠️ **PARCIAL / FALLA** | `DELETE` cross-tenant `A -> B` bloqueado por RLS (`rows=0`); takeover propio permitido en `aal1` sin MFA (`rows=1`) y sin revocar JWT en GoTrue. |
| `T13` Inventario storage pre/post logout | `F4` | `N0`/`N2` | ❌ **FALLA** | `poc-t13-logout-storage.mjs`: `signOut()` deja `migol-finanzas-v2`, `sync-queue`, recibos y `audit_log` (con `newEmail` en claro visible a cuenta B) y destruye el salt (`SEC-015`, `F4-D`). |
| `T14` PoC de descifrado `NEW-01` | `F4` | `N0`/`N2` | ✅ **PASA** | `DECRYPTED_OK` con `user.id` + salt público; clave incorrecta rechazada. |
| `T15` Update/delete sin `user_id` | `F5` | `N0` | ⚠️ **PARCIAL** | 3 rutas sin filtro; RLS las contiene; A→B cubierto por `T06`. |
| `T16` Import JSON malicioso | `F5` | `N0` | ⚠️ **PARCIAL** | Límite 20 MB solo UI; import sin Zod; prototype pollution global descartada. |
| `T17` Edge Function: paridad, 401, CORS | `F6` | `N1`/`N2` | ❌ **FALLA** | v4 239 vs repo 548; 401 sin credenciales ✅; CORS `*` ❌. |
| `T18` Rate limit de Edge Function | `F6` | `N0`/`N3` | ❌ **FALLA (estático)** | `Map` por isolate, XFF spoofable, sin poda; no se ejecutó ráfaga. |
| `T19` Open redirect del Service Worker | `F6` | `N0` | ❌ **FALLA** | PoC `OPEN_REDIRECT_CONFIRMED`; `message` sin `origin`/`source`. |
| `T20` SAST React/TS | `F7` | `N0` | ✅ **PASA** | Semgrep 173 reglas/304 archivos; 0 sinks XSS en `src/`; único sink en código muerto. |
| `T21` Headers de producción y CSP | `F7` | `N0`/Pasivo | ⚠️ **PARCIAL** | CSP/HSTS/XCTO/XFO/Referrer/Permissions OK; faltan COOP/CORP/COEP, `object-src`, reporting y SRI. |
| `T22` ZAP baseline local | `F7` | Local | ✅ **PASA** | 0 FAIL, 5 WARN, 62 PASS; warnings alineados con `NEW-11`. |
| `T23` Android Manifest/backup/exported/FileProvider | `F8` | `N0` | ❌ **FALLA** | `NEW-06`, `F8-A`, `F8-B`, `F8-G`; MASVS 1 PASS/10 PARTIAL/8 FAIL/5 N/A. |
| `T24` Endurecimiento de CI/CD | `F9` | `N0` | ❌ **FALLA** | `F9-A` write token + checkout persistente; `F9-B` audit no bloqueante; `F9-C` auto-merge sin gate; Node 18 EOL; artifact de bundle; acciones mutables. |
| `T25` PII en logs de consola | `F10` | `N0` | ⚠️ **PARCIAL** | 92 `console.*` + 7 `logger.*`; sin email/montos; `clientId`/UUIDs/errores crudos; 8 refs en bundle; audit log local con PII. |

**Resumen (`25/25` ejecutadas):** 6 `PASA`, 6 `PARCIAL`, 13 `FALLA/ABIERTO`. Cero pruebas pendientes o escaladas tras el cierre de Fase 3 por Antigravity (`agy`).

---

## 12.8 Matriz de riesgo residual

> Escala cualitativa tras aplicar los controles existentes (RLS, bucket privado, CSP, cifrado, ZAP/Semgrep). No incorpora las remediaciones del backlog.

| Impacto \ Probabilidad | 🟢 Baja | 🟡 Media | 🔴 Alta |
| :--- | :--- | :--- | :--- |
| **🔴 Alto** | `SEC-002`/`NEW-01`, `F8-A`, `F4-F` | `SEC-015`, `F6-A`, `F5-B` | `NEW-04` |
| **🟡 Medio** | `SEC-006`, `NEW-12`, `F7-A/B/C` | `SEC-003`, `SEC-004`, `SEC-005`, `SEC-008`, `SEC-009`, `SEC-010`, `SEC-012`, `SEC-018`, `SEC-019`, `NEW-05`, `NEW-06`, `NEW-07`, `NEW-08`, `NEW-09`, `NEW-11`, `F10-A`, `F10-D` | `F5-A`, `F5-C`, `F9-A`, `F9-C` |
| **🟢 Bajo** | `SEC-007`, `SEC-013`, `SEC-017`, `SEC-020`, `SEC-021`, `F8-B`, `F8-D`, `F8-F`, `F9-D`, `F9-E` | `F10-B`, `F10-C`, `F6-C`, `F6-D`, `F3-C`, `F3-D` | — |

**Riesgo residual global: 🔴 ALTO** hasta cerrar `NEW-04`, `SEC-002`/`NEW-01`, `F8-A` y `SEC-015`. `SEC-001`, `SEC-011`, `SEC-014`, `SEC-016`, `NEW-02` y `NEW-10` no aportan riesgo residual (cerrados/descartados). Los controles positivos que reducen la probabilidad son RLS en 10/10 tablas, 3/3 vistas con `security_invoker`, bucket privado, CSP `script-src 'self'`, ausencia de sinks XSS alcanzables y `service_role` fuera del cliente.

---

## 12.9 Backlog de remediación priorizado (P0 → P3)

> **Criterio:** `P0` = explotable o pérdida de datos con impacto alto; `P1` = alto impacto condicionado o cumplimiento; `P2` = defensa en profundidad; `P3` = higiene/mejora. Cada ítem debe cerrarse con test o evidencia verificable.

| Prioridad | Acción | Hallazgos | Esf. | Criterio de cierre |
| :---: | :--- | :--- | :---: | :--- |
| **P0** | Exigir `aal2` en RLS/funciones o gate servidor para MFA | `NEW-04` | `M` | Token `aal1` recibe 401/403 en CRUD; `aal2` pasa; test automatizado (`T09`). |
| **P0** | Corregir política `UPDATE` de `public.push_subscriptions`: cambiar `USING (true)` por `USING (auth.uid() = user_id)` | `F2-A`, `T06` | `S` | `UPDATE public.push_subscriptions SET user_id = auth.uid()` solo afecta las filas propias (`rows=1`). |
| **P0** | PKCE + `state` + validación de deep link/origen en Android | `F8-A`, `SEC-012` | `M` | Implicit deshabilitado; scheme validado; app maliciosa no recibe tokens. |
| **P0** | Derivar la clave de un secreto no exportable/passphrase, no de `user.id` | `SEC-002`/`NEW-01` | `M`/`L` | PoC `DECRYPTED_OK` deja de funcionar; migración de blobs probada. |
| **P0** | Purga completa y segura en logout (estado, cola, recibos, audit, salt) | `SEC-015`, `F4-D`, `F10-B` | `M` | Inventario pre/post logout vacío; datos siguen descifrables tras re-login (`T13`). |
| **P0** | Endurecer Auth: 12+, HIBP, CAPTCHA/lockout y rate limit server-side | `SEC-008`, `T11` | `S` | Config de producción y tests de fuerza bruta. |
| **P1** | Corregir migración PBKDF2 100k→600k re-cifrando antes del salt | `F4-F` | `M` | Usuario legacy actualiza y conserva estado/recibos. |
| **P1** | Corregir firma de mutaciones de recibos | `F5-B` | `S` | `tsc` limpio y test de subida/borrado actualiza la transacción. |
| **P1** | Configurar `FUNCTION_SECRET`, VAPID, scheduler y desplegar la versión del repo | `F6-A`, `F6-B`, `SEC-003` | `M` | Recordatorio end-to-end; 401 sin secreto; paridad repo/prod. |
| **P1** | Reglas de backup Android y exclusión de secretos | `NEW-06` | `S` | `adb backup`/D2D no incluye `app_webview/` ni `files/` sensibles. |
| **P1** | Export con toggles reales (email/bancos/recibos) y anonimización o renombrado de `excludePII` | `SEC-018`, `F10-A` | `M` | Export por defecto sin email; UI muestra flags; test de contenido. |
| **P1** | Borrado de cuenta/cloud con reautenticación y auditoría | `F3-A`, `F10-D` | `M`/`L` | RPC/Edge borra Storage + tablas + `auth.users`; evidencia de no-residuo. |
| **P1** | Notificaciones de seguridad y recuperación de contraseña | `F3-B`, `F3-C` | `S` | Eventos de Auth notifican; reset funciona con token de un uso. |
| **P1** | Límite de tamaño + Zod + topes de arrays en importación | `SEC-020`, `F5-A` | `S`/`M` | JSON malicioso rechazado; no hay OOM ni campos inválidos. |
| **P1** | Sync transaccional o staging + swap | `F5-C` | `M` | Fallo intermedio no deja la nube vacía; rollback probado. |
| **P1** | CI: permisos mínimos, audit bloqueante, auto-merge con gate y Node 20+ | `F9-A`, `F9-B`, `F9-C`, `F9-D` | `S`/`M` | Workflow con `permissions` por job, audit falla el build y required checks. |
| **P2** | Validar `origin`/`source` y URLs en el Service Worker | `NEW-08`, `F6-D` | `S` | `message` de otro origen ignorado; `notificationclick` solo abre allowlist. |
| **P2** | Respetar preferencias y ocultar montos por defecto en notificaciones | `NEW-09` | `S` | Payload sin montos; prefs aplicadas en producción. |
| **P2** | Cifrar/purgar audit log y añadir UI de export/borrado | `F10-B`, `F4-E`, `SEC-009` | `M` | Log cifrado, retención y HMAC/anclaje. |
| **P2** | Redacción de logs y eliminación de `.catch(console.*)`; `no-console` | `SEC-019`, `F10-C` | `S` | `grep` sin PII; bundle sin `console.*`; test de sanitizador. |
| **P2** | Endurecer CSP, SRI y headers de aislamiento | `NEW-11`, `F7-B`, `F7-C` | `S`/`M` | Sin wildcards innecesarios; SRI; COOP/CORP/COEP; reporting. |
| **P2** | Edge Function: comparación constante, CORS allowlist y rate limit distribuido | `SEC-003`, `SEC-013`, `SEC-017` | `S`/`M` | `timingSafeEqual`; sin `*`; límite por usuario persistente. |
| **P2** | Añadir `user_id` en las 3 rutas de escritura y tests A→B | `SEC-005` | `S` | `rg` sin mutaciones sin filtro; test cross-tenant. |
| **P2** | Migraciones idempotentes y paridad con producción | `NEW-05` | `M` | `supabase db diff` vacío; triggers/columnas aplicados. |
| **P3** | Rotar `anon` key y reducir expiración | `SEC-006` | `S` | Nueva clave con expiración corta; build actualizado. |
| **P3** | Excluir `stats.html` del build/deploy | `SEC-021`, `F9-E` | `S` | `dist/` sin `stats.html`; artifact solo CI privado. |
| **P3** | Purgar metadatos del índice git (`.netlify/`, `graphify-out/`) | `NEW-12`, `F9-F` | `S` | `git ls-files` sin state/local paths; `.gitignore` coherente. |
| **P3** | Android: FileProvider mínimo, `FLAG_SECURE`, permisos y firma release | `F8-B`, `F8-D`, `F8-F`, `F8-G` | `S`/`M` | Roots mínimas; capturas bloqueadas; APK firmado reproducible. |
| **P3** | CSP meta en WebView y self-host/SRI de fuentes | `F7-A`, `F7-B` | `S` | CSP activa en Android; fuentes con `integrity` o locales. |
| **P3** | Errores de Auth genéricos para el usuario | `F3-D` | `S` | UI sin `error.message` crudo; logs internos redactados. |
| **P3** | Aviso de privacidad in-app y lista de terceros | `F10-E` | `S` | Pantalla con base legal, retención y terceros. |
| **P3** | Limpieza del audit log (consumidor, poda, concurrencia, fail-open) | `F4-G`…`F4-Q` | `M` | Export/verify con UI; poda; sin bifurcaciones. |
| **P3** | Refactor de llamadas directas a Supabase hacia la fachada | `F5-D` | `M` | `rg` sin `supabase.from` en componentes; mappers únicos. |
| **P3** | Node 20+, artifact de bundle y reglas `.env*` | `F9-D`, `F9-E`, `F9-F` | `S` | CI en Node 20; artifact privado; `.gitignore` sin contradicciones. |

---

## 12.10 Estado de producción y desfase de esquema

| Aspecto | Estado observado | Implicación |
| :--- | :--- | :--- |
| Proyecto | `rjforcrdyfuodsqtopvp` (`financepal`), PostgreSQL `17.6.1`, `us-east-1`, `ACTIVE_HEALTHY` | Producción real; no se ejecutaron pruebas `N3`. |
| RLS | 10/10 tablas con RLS; 40 políticas `public`; 0 con `aal` | `NEW-04`: MFA no aplica en servidor. |
| Vistas | 3/3 `*_safe` con `security_invoker=true`; `anon` → `[]` | `SEC-014`/`NEW-02` cerrados. |
| Auth | `password_min_length=6`, HIBP off, CAPTCHA off, `mailer_autoconfirm=false`, JWT 1 h, refresh rotation on, timebox/inactivity 0, notificaciones off | `SEC-008`/`T11`/`F3-B`. |
| Esquema | Faltan `user_settings.notification_prefs`, unique `(user_id, device_id)` y 2 triggers; `cleanup_stale_sessions()` siempre deniega; `pg_cron` ausente | `NEW-05`; recordatorios sin scheduler (`F6-A`). |
| Edge Function | Producción v4 (239 líneas, 2026-09-27) vs repo 548 (2026-10-11); `verify_jwt=true`; `ACAO: *`; solo `FUNCTION_SECRET`; montos siempre | `F6-B`/`SEC-017`/`NEW-09`. |
| Storage | Bucket `receipts` privado; signed URLs 1 h; sin `file_size_limit`/MIME | `SEC-007` parcial. |

---

## 12.11 Verificación de cierre y limitaciones

### 12.11.1 Cero cambios en código fuente

Los checkpoints `CP-00`–`CP-10` contienen **solo** archivos `.agent/`:

```text
$ git log --oneline 769cf9e^..HEAD --name-only --pretty=format:'COMMIT %h %s' \
    | grep -vE '^\.agent/' | sort -u
# → ONLY_AGENT_FILES
```

No se modificaron `src/**`, `supabase/**`, `android/**`, `public/**` ni `package.json` por la auditoría. Las modificaciones preexistentes del árbol de trabajo (incluidas las de `.agent/contract.md`, `.agent/task.md` y `graphify-out/`) no fueron staged ni revertidas.

### 12.11.2 Escaneo de secretos

```text
$ gitleaks dir .agent --redact
# → no leaks found (0)

$ rg -n "sbp_[A-Za-z0-9]+|eyJ[A-Za-z0-9_-]{20,}\." .agent
# → NO_TOKEN_PATTERNS
```

Se redactó el JWT de ejemplo de la auditoría v1 (`security_audit.md:408`) y un falso positivo de `generic-api-key` en `F1-supply-chain-and-bundle.md`. El escaneo de **historial** (`gitleaks detect`) sigue reportando 4 hallazgos preexistentes: 3 fuera de `.agent/` (`.env` histórico, `.env.template`, `STORAGE_KEY`) y el JWT v1 ya redactado en HEAD. El `.env` real nunca se leyó ni se imprimió.

### 12.11.3 Limitaciones

- **Cuatro pruebas dinámicas (`T06`, `T09`, `T12`, `T13`) ejecutadas en laboratorio aislado (`N3`/`N2`):** para respetar el protocolo de seguridad en producción (`rjforcrdyfuodsqtopvp`), se ejecutaron sobre un contenedor efímero `postgres:17-alpine` con el esquema real extraído de producción (`F2-prod-schema.sql` + políticas de `storage.objects`) y arnés WebCrypto Node 26.
- **Producción no fue atacada:** ZAP corrió contra un servidor local que replica headers; no se enviaron payloads activos a Supabase ni a la Edge Function.
- **`dist/` puede estar desactualizado** respecto al árbol; se usó solo para verificar `drop_console` y el bundle.
- **Matriz legal:** LFPDPPP/GDPR es técnica, no asesoría legal; faltan aviso de privacidad, base legal y contratos con encargados.
- **Sin revisión de `.env*`:** no se verificaron claves de terceros ni configuración de Sentry (no existe).
- **Android:** solo análisis estático `N0`; no se ejecutó la app en dispositivo ni `adb backup`.

### 12.11.4 Firma de cierre

- **Dictamen:** `🔴 RIESGO ALTO — NO CERTIFICABLE` para producción multiusuario hasta cerrar P0 (`NEW-04`, `F2-A`, `F8-A`, `SEC-002`/`NEW-01`, `SEC-015`/`F4-D`, `SEC-008`); `🟡 MEDIO` esperado tras P0+P1.
- **Checkpoint de este informe:** `CP-11` (`docs(audit): F11 informe consolidado v2`) + cierre Fase 3 por Antigravity (`agy`).
- **Revisión Fase 3 (`agy`):** `12/12` bloques (`R-F0`…`R-F11`) auditados y certificados, `4/4` escalaciones (`T06`, `T09`, `T12`, `T13`) resueltas dinámicamente, `39/39` tareas y `25/25` pruebas completadas en `.agent/workflow/03_ANTIGRAVITY_REVIEW.md`.
- **Siguiente ciclo:** ejecución del backlog de remediación **P0** → re-ejecución de la suite de regresión (`T06`, `T09`, `T12`, `T13`).

---

### 12.10 Certificación del Sprint de Remediación P0 (`v1.21.1-p0-remediation` — 2026-10-20)

Tras la emisión del dictamen v2 (`commit 3a0da24`), se ejecutó el **Sprint de Remediación P0 (`v1.21.1`)** mediante el flujo coordinado Antigravity (`agy` — Fase 1 y Fase 3) ↔ OpenCode CLI (`DeepSeek 4.1 Flash` — Fase 2, commits `1cda516` a `1f2eac2`), cerrando en código y pruebas dinámicas los **6 bloqueantes P0**:

| Bloqueante P0 | Estado Post-Sprint | Implementación y Verificación Dinámica (`Fase 3`) |
| :--- | :--- | :--- |
| **`F5-B` + Vitest IDB** | 🟢 **REMEDIADO** (`CP-P0-00` `1cda516`) | `useReceiptMutations.ts` corregido (`updateTransaction(userId, id, patch)`); creado `src/test/indexeddb-polyfill.ts` y fallback Storage en `src/test/setup.ts`. `npx tsc --noEmit` -> `0 errores`. |
| **`NEW-04` + `F2-A` + `SEC-004` + `F2-C`** | 🟢 **REMEDIADO EN CÓDIGO / MIGRACIÓN** (`CP-P0-01` `43c735f`) | Migración `supabase/migrations/20261020220000_p0_mfa_aal2_and_push_rls.sql` + `schema.sql` + `schema_push_notifications.sql`. Validada en Docker PostgreSQL 17 (`.agent/audit/scratch/poc-p0-f1-output.txt`): **17/17 PASS** (`aal1` bloqueado en las 10 tablas + `storage.objects`, `UPDATE` sin `WHERE` en `push_subscriptions` restringido a `rows=1`, `cleanup_stale_sessions()` denegado con `42501` a `authenticated`). *Pendiente únicamente aplicar la migración al proyecto remoto `rjforcrdyfuodsqtopvp`.* |
| **`F8-A` + `SEC-012` + `NEW-06`** | 🟢 **REMEDIADO** (`CP-P0-02` `b54e4a2` + `1f2eac2`) | `flowType: 'pkce'` en `src/lib/supabase.ts`; eliminado `setSession` implícito en `src/App.tsx`; allowlist estricta en `Login.tsx` y limpieza de URL en `AuthCallback.tsx`; `android:allowBackup="false"` + `backup_rules.xml` y `data_extraction_rules.xml` + remoción de permisos de almacenamiento en `AndroidManifest.xml`. |
| **`SEC-002` / `NEW-01` + `F4-F`** | 🟢 **REMEDIADO** (`CP-P0-03` `3e0b1fc`) | Pepper CSPRNG de 256 bits por usuario en `IndexedDB` (`finance-pal-keystore`) combinado con `user.id`, salts por usuario (`600,000` iteraciones PBKDF2-SHA256) y fallback de lectura legacy (`100,000` iteraciones) sin sobrescribir el salt antiguo antes de descifrar (`src/test/encrypted-storage.test.ts` **12/12 PASS**). |
| **`SEC-015` / `F4-D` + `F10-B`** | 🟢 **REMEDIADO** (`CP-P0-04` `acf7d29`) | `purgeAllEncryptedStorage()` y `clearAllReceipts()` en `encrypted-storage.ts`; `maskEmail()`, `redactAuditDetails()` y `clearAuditLogs()` en `audit-logger.ts`; cableados en `AuthContext.signOut()` (`src/test/audit-logger.test.ts` **6/6 PASS**). |
| **`SEC-008` / `T11`** | 🟢 **REMEDIADO EN CÓDIGO** (`CP-P0-05` `4db5131`) | `rateLimiter` (`auth`: 5 req / 60s) y `validatePasswordStrength` (`>= 12` chars + mayúscula + minúscula + número) activos en `Login.tsx`, `PerfilSection.tsx` y `supabase/config.toml` (`src/test/security.test.ts` **9/9 PASS**). |

*Fin de la sección v2. La auditoría v1 permanece arriba como historial y no debe usarse como dictamen vigente.*
