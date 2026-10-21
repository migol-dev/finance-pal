# F4 — Criptografía del Cliente y Audit Log (`T14`, `SEC-002`, `NEW-01`, `SEC-009`)

> **Fase:** `F4` — Prioridad `P0`
> **Fecha:** `2026-10-20`
> **Niveles:** `N0` (revisión de código) + `N2` (PoC aislado con Node WebCrypto)
> **Alcance:** derivación de claves de `src/lib/encrypted-storage.ts`, cifrado AES-GCM/PBKDF2, y hash-chaining de `src/lib/audit-logger.ts`.
> **Evidencia complementaria:** el inventario de almacenes y la limpieza de sesión están en `F4-storage-inventory.md` (`F4.1`, `SEC-001`, `SEC-015`, `SEC-018`).
> **Estado:** `SEC-002`/`NEW-01` confirmados con PoC (`T14` ✅); `SEC-009` parcial (SHA-256 sí, sin HMAC/anclaje → cadena falsificable).

---

## 0. Resumen

| Hallazgo | Severidad | Veredicto |
| :--- | :---: | :--- |
| `SEC-002` / `NEW-01` — Clave AES-GCM derivada de `user.id` + salt público | **Media** | ❌ **CONFIRMADO**: el PoC deriva la clave con material disponible en el propio navegador (`user.id` + `finance-pal-encrypted-v1-salt`) y descifra el estado. `T14` ✅ `DECRYPTED_OK`. |
| `F4-F` (nuevo) — Upgrade de iteraciones PBKDF2 rompe blobs existentes | **Alta** (integridad/disponibilidad) | ❌ **CONFIRMADO (código)**: al leer un salt legacy de 100.000 iteraciones, se deriva la clave con 100k, pero se reescribe el salt como 600k sin re-cifrar; en el siguiente arranque la clave es distinta y los datos quedan indescifrables. |
| `SEC-009` — Hash-chaining SHA-256 sin HMAC | **Media** (valor probatorio) | ⚠️ **PARCIAL**: la migración de `djb2` a SHA-256 es correcta frente a colisiones accidentales, pero al no haber HMAC ni anclaje externo la cadena se puede reescribir por completo desde IndexedDB. PoC `CHAIN_FORGED_OK`. |
| `F4-G` (nuevo) — Audit log sin consumidor ni anclaje | **Baja/Media** | ❌ **CONFIRMADO (diseño)**: `queryAuditLogs`/`verifyAuditIntegrity`/`exportAuditLogs` solo se usan en tests; no hay UI, exportación ni envío al servidor. La cadena no tiene valor forense real. |

---

## 1. `F4.2` — Derivación de la clave y cifrado en reposo

### 1.1 Cadena de llamadas

```
Zustand persist (name = "migol-finanzas-v2")
  └─ storage.setItem(name, value)                 finance-store.ts:326-347
       ├─ localStorage.removeItem(name)           (elimina plaintext legacy)
       └─ saveEncryptedState(serialized, name)    encrypted-storage.ts:212-225
            └─ encryptData(state)                 encrypted-storage.ts:127-149
                 └─ getMasterKey()                encrypted-storage.ts:62-125
                      ├─ salt = localStorage["finance-pal-encrypted-v1-salt"]
                      └─ getDeviceSecret()        encrypted-storage.ts:43-60
                           ├─ supabase.auth.getSession().user.id   (si hay sesión)
                           └─ localStorage["finance-pal-device-secret"] (fallback)
```

El mismo `getMasterKey()` se reutiliza para:

- `migol-finanzas-v2` (estado financiero),
- `finance-pal-sync-queue-encrypted` (cola de sync),
- `finance-pal-encrypted-v1` (caché de React Query; `App.tsx:39-67`),
- `finance-pal-receipts` (recibos cifrados en IndexedDB; `encrypted-storage.ts:299-308`).

### 1.2 Material de la clave

| Elemento | Dónde vive | ¿Es secreto? | Evidencia |
| :--- | :--- | :---: | :--- |
| `user.id` (UUID) | JWT de Supabase y objeto de sesión en `localStorage` (`sb-<ref>-auth-token`) | ❌ No | `encrypted-storage.ts:45-48` |
| `finance-pal-device-secret` | `localStorage`, texto plano (32 bytes aleatorios) | ❌ No (equivalente a la clave) | `encrypted-storage.ts:53-59` |
| Salt PBKDF2 | `localStorage["finance-pal-encrypted-v1-salt"]` | ❌ No (metadato público) | `encrypted-storage.ts:69-88` |
| Iteraciones | 600.000 (100.000 legacy) | ❌ No | `encrypted-storage.ts:24`, `:39`, `:75` |
| Algoritmo | PBKDF2-SHA256 → AES-256-GCM, IV 12 bytes, tag 16 bytes | — | `encrypted-storage.ts:99-110`, `:129-148` |

**Conclusión:** no existe un secreto fuera del navegador. La clave se deriva de un identificador público (`user.id`) o de un valor que también está en `localStorage` (`device-secret`), junto con un salt público. PBKDF2 con 600k iteraciones enlentece un ataque de fuerza bruta, pero **no crea confidencialidad frente a quien pueda leer el almacenamiento del origen**: ese mismo atacante puede leer el `user.id` y el salt, o el `device-secret`, y derivar la clave.

### 1.3 PoC `T14` — `.agent/audit/scratch/poc-new01-pbkdf2.mjs`

El script reproduce exactamente el algoritmo del código (PBKDF2-SHA256, 600.000 iteraciones, AES-256-GCM, IV prefijado) con un fixture sintético, sin red y sin datos reales. Ejecución:

```text
$ node .agent/audit/scratch/poc-new01-pbkdf2.mjs
material público usado:
  user.id  = 11111111-1111-4111-8111-111111111111
  salt     = y3HYBfu3o97k7tqJ0pqReQ== (iterations=600000)
  ciphertext bytes = 187
plaintext descifrado:
{
  "profile": {
    "name": "Audit User",
    "email": "audit@example.test",
    "currency": "MXN"
  },
  "transactions": [
    {
      "id": "tx-audit-1",
      "amount": 123.45,
      "description": "PoC NEW-01"
    }
  ]
}
wrong-user-id -> decrypt rejected (expected)
DECRYPTED_OK
```

**Resultado `T14`: ✅ PASA (vulnerabilidad demostrada).**

- Con `user.id` + salt público se obtiene el JSON completo.
- La prueba negativa con otro `user.id` falla en AES-GCM (autenticación), lo que confirma que la clave depende del UUID y no de un secreto adicional.
- El fixture se generó con el mismo algoritmo; no se usó el proyecto real ni credenciales.

### 1.4 `SEC-002` / `NEW-01` — Veredicto

**❌ CONFIRMADO (Media).** El cifrado en reposo de Finance Pal:

1. **Sí** evita que el estado quede en texto plano en `localStorage` (`SEC-001` cerrado; `finance-store.ts:334` borra el plaintext y no hay fallback).
2. **No** protege contra XSS ni contra un atacante con acceso al perfil del navegador, porque la clave es derivable con material del mismo origen. En un XSS, el atacante ya puede leer `sb-...-auth-token` y llamar a la API; el descifrado local añade los datos aún no sincronizados.
3. **No** protege contra acceso físico/forense al perfil si el atacante puede ejecutar el bundle o replicar PBKDF2: el `device-secret` está en claro y el `user.id` es un UUID v4 (122 bits) que suele aparecer en logs, JWT y filas compartidas.

La severidad se califica **Media** y no Crítica porque el impacto principal (acceso a datos en la nube) ya está cubierto por el token de sesión en texto plano: el cifrado local no es la última barrera. Aun así, la afirmación de "datos cifrados en reposo" no debe presentarse como una garantía frente a XSS o compromiso del dispositivo.

### 1.5 Defectos adicionales del diseño criptográfico

| ID | Defecto | Impacto | Evidencia |
| :--- | :--- | :--- | :--- |
| `F4-F` | **Upgrade de iteraciones sin re-cifrar.** Si el salt almacenado es legacy (base64, 100k), se deriva la clave con 100k; después se reescribe el salt como `{iterations: 600000}`. En el siguiente arranque se deriva con 600k y los ciphertexts viejos ya no descifran. | Pérdida de estado, cola y recibos para usuarios que actualicen desde una versión antigua. | `encrypted-storage.ts:71-80`, `:112-119` |
| `F4-H` | **`rotateEncryptionKey()` es código muerto y está incompleto.** Solo re-cifra la caché de React Query (`STORAGE_KEY`), no `migol-finanzas-v2`, la cola ni los recibos; además borra el salt compartido. | Si se invocara, dejaría el resto de blobs indescifrables. | `encrypted-storage.ts:263-272`; sin llamadas en `src/` |
| `F4-I` | **Sin separación de claves/AAD.** La misma clave cifra estado, cola, caché y recibos; el nombre del almacén no se autentica. Un ciphertext válido puede copiarse de una clave a otra y descifra igual. | Manipulación local de bajo impacto; confusión de contextos. | `encrypted-storage.ts:127-149`, `:212-225` |
| `F4-J` | **Salt compartido y borrado en logout.** `clearEncryptedState()` sin argumentos borra `finance-pal-encrypted-v1-salt`, pero no los blobs de Zustand/recibos; quedan indescifrables. | Pérdida de datos y residuo cifrado. | `encrypted-storage.ts:245-261`; `AuthContext.tsx:94`; ver `F4-storage-inventory.md` §2 |
| `F4-K` | **Fallback plaintext en la caché de React Query** cuando `crypto.subtle` no está disponible (`App.tsx:45-47`). | En navegadores sin WebCrypto, la caché de consultas se guarda en claro. | `App.tsx:43-67` |
| `F4-L` | **`keyPromise` no se reinicia si la derivación falla.** Un fallo transitorio deja la promesa rechazada en caché hasta recargar. | Fallo de disponibilidad, no de confidencialidad. | `encrypted-storage.ts:62-66`, `:122-124` |

---

## 2. `F4.3` — Audit log: hash-chaining y manipulación local

### 2.1 Diseño

`src/lib/audit-logger.ts` guarda entradas en IndexedDB `finance-pal-audit`, store `audit_log` (`keyPath: 'id'`), con índices `timestamp`, `userId` y `action` (`:49-68`).

Cada entrada contiene:

```ts
{ id, timestamp, userId, action, resource, resourceId?, details, prevHash, hash }
```

- `hash = SHA-256(JSON.stringify({id,timestamp,userId,action,resource,resourceId,details,prevHash}))` (`:89-105`).
- `prevHash` es el `hash` de la última entrada por índice `timestamp` (`:70-87`); la primera usa `GENESIS_HASH = "0".repeat(64)` (`:52`).
- `verifyAuditIntegrity()` recorre todas las entradas por `timestamp`, recalcula el hash y comprueba `prevHash` (`:190-233`).
- `logAudit()` **nunca lanza**: si falla IndexedDB, solo hace `console.error` (`:133-136`).
- `MAX_AUDIT_ENTRIES = 10000` solo limita la exportación (`:51`, `:238-241`); no hay poda al escribir.

### 2.2 Migración `djb2` → SHA-256

El commit `392cee8` (`security: asegurar bucket de recibos privado y migrar log de auditoria a SHA-256`) sustituyó:

```ts
// anterior (djb2)
let hash = 0;
for (...) { hash = ((hash << 5) - hash) + char; hash = hash & hash; }
return btoa(JSON.stringify({ hash: hash.toString(16), prevHash: entry.prevHash }));
```

por el `SHA-256` actual. La migración mejora la resistencia a colisiones, pero:

- **No hay versión de entrada ni migración de datos.** Las entradas antiguas tienen `hash` en base64/JSON y un algoritmo distinto; `verifyAuditIntegrity()` las marcará como cadena rota. No hay código que las reconozca o re-hashee.
- `hash` pasó de un objeto base64 a un hex de 64 caracteres; ambos se comparan como strings, así que el cambio es detectable pero no compatible.
- No hay `HMAC`, firma ni clave. El algoritmo y el formato están en el bundle; cualquiera puede recalcular la cadena.

### 2.3 `SEC-009` — PoC `.agent/audit/scratch/poc-sec009-tamper.mjs`

El script implementa el mismo `computeHash`/`seal`/`verify` con Node WebCrypto y una cadena de 3 entradas sintéticas. Ejecución:

```text
$ node .agent/audit/scratch/poc-sec009-tamper.mjs
cadena original: { valid: true }
edición sin recalcular: { valid: false, brokenAt: 'e2' }
NAIVE_TAMPER_DETECTED
edición + recálculo SHA-256: { valid: true }
FORGED_CHAIN_VALID
entrada borrada + reenlace: { valid: true }
CHAIN_FORGED_OK
```

Interpretación:

1. La cadena **sí** detecta una edición ingenua (sin recalcular), que es el caso de corrupción accidental.
2. La cadena **no** detecta a un atacante con escritura en IndexedDB: al conocer el algoritmo (público) puede recalcular `hash` y `prevHash` de las entradas afectadas. El resultado vuelve a ser `valid: true`.
3. También puede **borrar una entrada** y reenlazar la siguiente; la verificación vuelve a pasar.

**Veredicto `SEC-009`: ⚠️ PARCIAL.** El `djb2` se corrigió, pero un hash sin clave no es un mecanismo de integridad frente a manipulación local. Para que el audit log sea "tamper-evident" de verdad necesita HMAC con una clave no accesible al cliente (servidor), firma/anclaje remoto, o al menos un sellado periódico del hash en Supabase.

### 2.4 Otras debilidades del audit log

| ID | Debilidad | Impacto | Evidencia |
| :--- | :--- | :--- | :--- |
| `F4-E` | **Sin cifrado y con PII en claro.** `details` guarda `{ newEmail }`; `userId`, `action` y `resourceId` también quedan legibles. | El siguiente usuario del navegador o un XSS puede leer el historial. | `audit-logger.ts:6-16`, `:110-137`; `PerfilSection.tsx:117`; `F4-storage-inventory.md` §1.3 |
| `F4-M` | **Consulta cross-user por defecto.** `queryAuditLogs()` sin `userId` devuelve las últimas 100 entradas de **todos** los usuarios. | Fuga de metadatos entre cuentas en el mismo navegador. | `audit-logger.ts:142-185` |
| `F4-G` | **Sin consumidor.** `queryAuditLogs`, `verifyAuditIntegrity` y `exportAuditLogs` no se usan fuera de `src/test/`; no hay UI, endpoint ni exportación. | El log no aporta detección/respuesta; solo ocupa espacio. | `rg` en `src/` (solo `audit.*` se invoca desde AuthContext/Perfil/Datos/finance-store) |
| `F4-N` | **Carrera de escritura.** Dos `logAudit()` concurrentes pueden leer el mismo `prevHash` y crear una bifurcación; no hay transacción/lock sobre `getLastEntryHash` + `put`. | Cadena rota de forma no maliciosa; falsos positivos. | `audit-logger.ts:110-132` |
| `F4-O` | **Orden por `timestamp` de cliente.** `new Date().toISOString()` tiene resolución de ms; entradas en el mismo ms se ordenan por clave primaria (UUID) en el índice, no por inserción. | La cadena puede "romperse" al verificar si dos entradas comparten timestamp. | `audit-logger.ts:70-87`, `:114`, `:190-233` |
| `F4-P` | **Crecimiento sin límite.** `MAX_AUDIT_ENTRIES` no se aplica al escribir; no hay poda ni TTL. | Crecimiento indefinido de IndexedDB. | `audit-logger.ts:51`, `:126-132` |
| `F4-Q` | **Fail-open.** `logAudit()` traga cualquier error; una cuota llena o un IndexedDB bloqueado no genera alerta ni reintento. | Pérdida silenciosa de eventos de seguridad. | `audit-logger.ts:133-136` |

### 2.5 Cobertura de pruebas negativas

| Archivo | Pruebas positivas | Pruebas negativas / tamper | Huecos |
| :--- | :---: | :---: | :--- |
| `src/test/audit-logger.test.ts` | 3 (insertar/leer, verificar cadena, filtrar) | **0** | No edita una entrada, no borra, no reordena, no prueba concurrencia, no prueba entradas legacy `djb2`, no prueba HMAC (no existe). `beforeEach` está vacío y comparte IndexedDB entre tests. |
| `src/test/encrypted-storage.test.ts` | 5 (round-trip, persistencia, clear, recibos) | **0** | No prueba ciphertext alterado, salt borrado, upgrade 100k→600k, clave derivada de `user.id`, ni que `clearEncryptedState()` borre el salt. `beforeEach` hace `localStorage.clear()` pero no resetea `cryptoKey`, por lo que la clave cacheada oculta la regeneración de salt. |

**Ejecución actual:** `npx vitest run src/test/audit-logger.test.ts src/test/encrypted-storage.test.ts` no puede arrancar:

```text
Error: Cannot find module '.../node_modules/fake-indexeddb/build/esm/fakeIndexedDB.js'
imported from .../node_modules/fake-indexeddb/auto/index.mjs
```

El paquete `fake-indexeddb@6.2.5` instalado no contiene `build/esm/`. Es una limitación del entorno de auditoría (no se modifica `node_modules` ni `package.json`); la revisión de cobertura anterior es estática. No se debe interpretar como que las pruebas pasan.

---

## 3. Matriz de veredictos F4

| ID | Veredicto | Nivel | Evidencia |
| :--- | :--- | :---: | :--- |
| `SEC-001` | ✅ **CERRADO** — `setItem` borra plaintext y cifra; sin fallback | `N0` | `F4-storage-inventory.md` §1.1 |
| `SEC-002` | ❌ **CONFIRMADO (Media)** — clave derivable de `user.id` + salt público | `N0`/`N2` | §1.3-1.4; PoC `DECRYPTED_OK` |
| `NEW-01` | ❌ **CONFIRMADO (Media)** — mismo hallazgo, PoC reproducible | `N0`/`N2` | §1.3 |
| `SEC-009` | ⚠️ **PARCIAL** — SHA-256 sí; sin HMAC/anclaje; cadena falsificable | `N0`/`N2` | §2.3; PoC `CHAIN_FORGED_OK` |
| `SEC-015` | ❌ **CONFIRMADO (Alta)** — no borra estado/sync/recibos/audit; salt rompe descifrado | `N0` | `F4-storage-inventory.md` §2 |
| `SEC-018` | ❌ **CONFIRMADO (Media)** — email cifrado local, sincronizado a JSONB y exportado por defecto | `N0` | `F4-storage-inventory.md` §3 |
| `T14` | ✅ **PASA** — PoC de descifrado con material público | `N0`/`N2` | §1.3 |
| `T13` | ⚠️ **ESCALADA (parcial)** — inventario estático completo; falta prueba dinámica pre/post logout y A→B | `N0`/`N2` | `F4-storage-inventory.md` §4-5 |

---

## 4. Recomendaciones

1. **No presentar el cifrado local como frontera de seguridad.** Si se mantiene, documentar que solo protege contra inspección casual y que la clave es derivable del propio navegador.
2. **Usar un secreto real por dispositivo/usuario** que no esté en `localStorage` (p. ej., clave no exportable en IndexedDB/Keystore, o clave derivada de un factor que el atacante no tenga). Para datos en la nube, el cifrado debe ocurrir antes de subirlos y la clave no debe viajar al servidor.
3. **Corregir el upgrade legacy:** re-cifrar todos los blobs (estado, cola, caché, recibos) con la clave nueva **antes** de actualizar el salt; o mantener las iteraciones antiguas hasta completar la migración.
4. **Unificar el ciclo de vida:** `clearEncryptedState()` debe borrar explícitamente `migol-finanzas-v2`, `finance-pal-sync-queue-encrypted`, la caché, los recibos y el audit log; no debe borrar el salt sin re-cifrar (ver `F4-storage-inventory.md` §6).
5. **Audit log con integridad real:** HMAC con clave de servidor, firma por lote y anclaje en Supabase; o eliminar la promesa de "tamper-evident" y tratarlo como log local de depuración.
6. **Minimizar PII:** no guardar `newEmail` en `details`; particionar por `userId` y borrar la partición en logout; cifrar el store o no persistirlo.
7. **Añadir pruebas negativas:** ciphertext alterado, salt ausente, upgrade de iteraciones, edición/borrado de una entrada del audit log, concurrencia y entradas legacy. Arreglar `fake-indexeddb` en CI para que estas pruebas se ejecuten.

---

## 5. Referencias

- `src/lib/encrypted-storage.ts:21-125` (salt, `getDeviceSecret`, `getMasterKey`), `:127-174` (AES-GCM), `:212-272` (persistencia, clear, rotate), `:282-358` (recibos).
- `src/store/finance-store.ts:293` (`migol-finanzas-v2`), `:326-347` (`setItem`/`removeItem`).
- `src/store/sync-store.ts:26-63`, `:88-91`.
- `src/App.tsx:39-67` (caché de React Query).
- `src/context/AuthContext.tsx:70-105` (logout), `:190-205` (login audit).
- `src/pages/ajustes/secciones/PerfilSection.tsx:108-132`, `:160-195`.
- `src/lib/audit-logger.ts:49-68` (DB), `:70-105` (hash), `:110-137` (write), `:142-185` (query), `:190-241` (verify/export).
- `src/test/audit-logger.test.ts:1-51`; `src/test/encrypted-storage.test.ts:1-90`.
- Commit `392cee8` (migración `djb2` → SHA-256).
- PoCs: `.agent/audit/scratch/poc-new01-pbkdf2.mjs`, `.agent/audit/scratch/poc-sec009-tamper.mjs`.
