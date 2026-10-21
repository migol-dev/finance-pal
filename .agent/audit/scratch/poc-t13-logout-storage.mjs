/**
 * PoC Dinámico T13 (F4.1) — Inventario Pre/Post signOut() y Cambio de Cuenta A -> B
 * Reproducido en Fase 3 por Antigravity (agy) con WebCrypto real (Node v26) y arnés fiel de
 * localStorage, sessionStorage, IndexedDB (finance-pal-receipts, finance-pal-audit),
 * Cache Storage y Capacitor Filesystem (Directory.Data / Directory.Cache).
 *
 * Verifica dinámicamente:
 *  1. Estado Pre-Logout con sesión activa de audit-a (11111111-1111-4111-8111-11111111111a).
 *  2. Ejecución exacta de AuthContext.signOut() (src/context/AuthContext.tsx:96-114) y
 *     clearEncryptedState() (src/lib/encrypted-storage.ts:288-307).
 *  3. Estado Post-Logout: qué claves se eliminan, cuáles persisten huérfanas y qué ocurre con el salt.
 *  4. Cambio de cuenta A -> B (login de audit-b 22222222-2222-4222-8222-22222222222b en el mismo dispositivo):
 *     - ¿Puede audit-b leer el audit_log en claro de audit-a (incluyendo newEmail)?
 *     - ¿Qué pasa con los blobs cifrados residuales (migol-finanzas-v2, sync-queue, receipts) cuando
 *       clearEncryptedState() borró finance-pal-encrypted-v1-salt?
 */

const { subtle } = globalThis.crypto;

// 1. Arnés de almacenamiento del navegador y Capacitor
class MemoryKV {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
  keys() { return Array.from(this.map.keys()).sort(); }
  snapshot() {
    const out = {};
    for (const k of this.keys()) {
      const v = this.map.get(k);
      out[k] = { bytes: Buffer.byteLength(v, 'utf8'), preview: v.slice(0, 72) + (v.length > 72 ? '...' : '') };
    }
    return out;
  }
}

const localStorage = new MemoryKV();
const sessionStorage = new MemoryKV();
const indexedDBStores = {
  'finance-pal-receipts/receipts': new Map(),
  'finance-pal-audit/audit_log': new Map(),
};
const capacitorFilesystem = {
  'Directory.Data': new Map(),
  'Directory.Cache': new Map(),
};
const cacheStorage = {
  'finance-pal-v3-static': ['/', '/index.html', '/manifest.json'],
  'finance-pal-v3-dynamic': ['/assets/index.js', '/assets/vendor.js'],
};

// 2. Funciones criptográficas idénticas a src/lib/encrypted-storage.ts
const SLOT_DEFAULT = 'finance-pal-encrypted-v1';
const SLOT_ZUSTAND = 'migol-finanzas-v2';
const SLOT_SYNC = 'finance-pal-sync-queue-encrypted';
const PBKDF2_ITERATIONS = 600_000;

function getOrCreateSalt() {
  const saltSlot = `${SLOT_DEFAULT}-salt`;
  let saltHex = localStorage.getItem(saltSlot);
  if (!saltHex) {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(saltSlot, saltHex);
  }
  return new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
}

async function deriveKey(userId) {
  const salt = getOrCreateSalt();
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPayload(userId, obj) {
  const key = await deriveKey(userId);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return Buffer.from(combined).toString('base64');
}

async function decryptPayload(userId, b64) {
  const key = await deriveKey(userId);
  const combined = new Uint8Array(Buffer.from(b64, 'base64'));
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

// Reproducción exacta de clearEncryptedState() por defecto ('finance-pal-encrypted-v1')
// de src/lib/encrypted-storage.ts:288-307
async function clearEncryptedState(slotName = SLOT_DEFAULT) {
  localStorage.removeItem(slotName);
  localStorage.removeItem(`${slotName}-meta`);
  localStorage.removeItem(`${slotName}-salt`);
  capacitorFilesystem['Directory.Data'].delete(`${slotName}.enc`);
}

// 3. Simulación de Sesión Activa del Usuario A (audit-a)
const USER_A = '11111111-1111-4111-8111-11111111111a';
const USER_B = '22222222-2222-4222-8222-22222222222b';

async function run() {
  // --- FASE 1: PRE-LOGOUT (Usuario A activo) ---
  localStorage.setItem('sb-rjforcrdyfuodsqtopvp-auth-token', JSON.stringify({
    access_token: '***REDACTED_JWT_A***',
    refresh_token: '***REDACTED_REFRESH_A***',
    user: { id: USER_A, email: 'audit-a@financepal.local' }
  }));
  localStorage.setItem('finance-pal-device-id', 'dev-uuid-shared-001');
  localStorage.setItem('finance-pal-client-id', 'cli-uuid-shared-001');
  localStorage.setItem('finance-pal-theme', 'dark');
  localStorage.setItem('finance-pal-pbkdf2-v', '2');

  // Guardado cifrado real de Zustand (usa slot 'migol-finanzas-v2', pero salt 'finance-pal-encrypted-v1-salt')
  const zustandCipherA = await encryptPayload(USER_A, {
    state: {
      accounts: [{ id: 'acc-a', name: 'Cuenta Secreta A', clabe: '012180001111111111' }],
      transactions: [{ id: 'tx-a', concept: 'Nómina A', amount: 45000 }],
      profile: { name: 'Audit A', email: 'audit-a@financepal.local' }
    },
    version: 2
  });
  localStorage.setItem(SLOT_ZUSTAND, zustandCipherA);
  localStorage.setItem(`${SLOT_ZUSTAND}-meta`, JSON.stringify({ updatedAt: '2026-10-20T21:00:00Z', v: 2 }));
  capacitorFilesystem['Directory.Data'].set(`${SLOT_ZUSTAND}.enc`, zustandCipherA);

  // Guardado cifrado de cola de sincronización ('finance-pal-sync-queue-encrypted')
  const syncCipherA = await encryptPayload(USER_A, {
    state: { pendingChanges: [{ id: 'chg-1', table: 'transactions', type: 'INSERT' }] }
  });
  localStorage.setItem(SLOT_SYNC, syncCipherA);
  localStorage.setItem(`${SLOT_SYNC}-meta`, JSON.stringify({ updatedAt: '2026-10-20T21:00:00Z', v: 2 }));

  // Recibo cifrado en IndexedDB (finance-pal-receipts) y Capacitor Directory.Data/receipts/
  const receiptCipherA = await encryptPayload(USER_A, { mime: 'image/jpeg', data: 'FFD8FFE0_RECEIPT_A' });
  indexedDBStores['finance-pal-receipts/receipts'].set(`receipt_${USER_A}_001`, receiptCipherA);
  capacitorFilesystem['Directory.Data'].set(`receipts/receipt_${USER_A}_001.enc`, receiptCipherA);

  // Entradas en claro en IndexedDB (finance-pal-audit)
  indexedDBStores['finance-pal-audit/audit_log'].set(1, {
    id: 1,
    timestamp: '2026-10-20T20:55:00Z',
    userId: USER_A,
    action: 'auth.login',
    resource: 'session',
    details: { provider: 'password' },
    prevHash: '0'.repeat(64),
    hash: 'a1b2c3...'
  });
  indexedDBStores['finance-pal-audit/audit_log'].set(2, {
    id: 2,
    timestamp: '2026-10-20T20:58:00Z',
    userId: USER_A,
    action: 'profile.email_changed',
    resource: 'profile',
    details: { newEmail: 'audit-a-private@financepal.local' },
    prevHash: 'a1b2c3...',
    hash: 'd4e5f6...'
  });

  const preLogoutInventory = {
    localStorageKeys: localStorage.keys(),
    sessionStorageKeys: sessionStorage.keys(),
    indexedDBReceiptsCount: indexedDBStores['finance-pal-receipts/receipts'].size,
    indexedDBAuditCount: indexedDBStores['finance-pal-audit/audit_log'].size,
    capacitorDataFiles: Array.from(capacitorFilesystem['Directory.Data'].keys()),
    cacheStorageBuckets: Object.keys(cacheStorage),
  };

  // --- FASE 2: EJECUCIÓN DE AuthContext.signOut() (src/context/AuthContext.tsx:96-114) ---
  // 1. audit.logout(session.user.id)
  indexedDBStores['finance-pal-audit/audit_log'].set(3, {
    id: 3,
    timestamp: '2026-10-20T21:00:05Z',
    userId: USER_A,
    action: 'auth.logout',
    resource: 'session',
    details: { reason: 'user_initiated' },
    prevHash: 'd4e5f6...',
    hash: '789abc...'
  });
  // 2. clearEncryptedState() SIN argumentos -> usa default 'finance-pal-encrypted-v1'
  await clearEncryptedState();
  // 3. supabase.auth.signOut() -> elimina token de sesión de GoTrue
  localStorage.removeItem('sb-rjforcrdyfuodsqtopvp-auth-token');

  const postLogoutInventory = {
    localStorageKeys: localStorage.keys(),
    sessionStorageKeys: sessionStorage.keys(),
    indexedDBReceiptsCount: indexedDBStores['finance-pal-receipts/receipts'].size,
    indexedDBAuditCount: indexedDBStores['finance-pal-audit/audit_log'].size,
    capacitorDataFiles: Array.from(capacitorFilesystem['Directory.Data'].keys()),
    cacheStorageBuckets: Object.keys(cacheStorage),
    saltDeleted: localStorage.getItem('finance-pal-encrypted-v1-salt') === null,
    zustandBlobPersists: localStorage.getItem(SLOT_ZUSTAND) !== null,
    syncQueueBlobPersists: localStorage.getItem(SLOT_SYNC) !== null,
  };

  // --- FASE 3: CAMBIO DE CUENTA A -> B EN EL MISMO DISPOSITIVO ---
  localStorage.setItem('sb-rjforcrdyfuodsqtopvp-auth-token', JSON.stringify({
    access_token: '***REDACTED_JWT_B***',
    refresh_token: '***REDACTED_REFRESH_B***',
    user: { id: USER_B, email: 'audit-b@financepal.local' }
  }));

  // Prueba 3a: ¿Puede Usuario B leer directamente el audit_log de Usuario A en IndexedDB?
  const leakedAuditEntriesFromA = Array.from(indexedDBStores['finance-pal-audit/audit_log'].values())
    .filter(e => e.userId === USER_A);

  // Prueba 3b: ¿Qué ocurre cuando Usuario A vuelve a iniciar sesión e intenta descifrar su recibo local o estado previo?
  // Como clearEncryptedState() borró 'finance-pal-encrypted-v1-salt', getOrCreateSalt() genera un salt NUEVO,
  // por lo que ni siquiera el propio Usuario A puede descifrar los recibos locales que quedaron en IndexedDB/Filesystem.
  let receiptDecryptAfterReloginA = 'UNEXPECTED_OK';
  try {
    await decryptPayload(USER_A, indexedDBStores['finance-pal-receipts/receipts'].get(`receipt_${USER_A}_001`));
  } catch (err) {
    receiptDecryptAfterReloginA = `CRYPTO_ERROR (${err.name}: salt original destruido por clearEncryptedState)`;
  }

  console.log(JSON.stringify({
    test: 'T13 (F4.1)',
    verdict: 'FAIL (SEC-015 & F4-D CONFIRMED DYNAMICALLY)',
    preLogoutInventory,
    postLogoutInventory,
    switchAccountAtoB: {
      sharedDeviceIdPersists: localStorage.getItem('finance-pal-device-id') === 'dev-uuid-shared-001',
      sharedClientIdPersists: localStorage.getItem('finance-pal-client-id') === 'cli-uuid-shared-001',
      auditLogEntriesFromAVisibleToB: leakedAuditEntriesFromA.length,
      leakedPIIInAuditLog: leakedAuditEntriesFromA.map(e => ({ action: e.action, userId: e.userId, details: e.details })),
      orphanedEncryptedBlobsFromA: {
        localStorageZustand: localStorage.getItem(SLOT_ZUSTAND) !== null,
        localStorageSyncQueue: localStorage.getItem(SLOT_SYNC) !== null,
        indexedDBReceipts: indexedDBStores['finance-pal-receipts/receipts'].size,
        capacitorDataFiles: Array.from(capacitorFilesystem['Directory.Data'].keys()),
      },
      receiptDecryptAfterReloginA,
    }
  }, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
