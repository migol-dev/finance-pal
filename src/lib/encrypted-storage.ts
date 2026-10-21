import { Capacitor } from '@capacitor/core';

let Filesystem: any = null;
let Directory: any = null;
let Encoding: any = null;
let filesystemInit = false;

async function ensureFilesystem() {
  if (filesystemInit) return;
  filesystemInit = true;
  try {
    const fs = await import('@capacitor/filesystem');
    Filesystem = fs.Filesystem;
    Directory = fs.Directory;
    Encoding = fs.Encoding;
  } catch {
    // Filesystem not available (e.g., in tests)
  }
}

export const STORAGE_KEY = 'finance-pal-encrypted-v1';

/** All encrypted payloads that must be purged on sign-out (SEC-015 / F4-D). */
export const ALL_ENCRYPTED_STATE_KEYS = [
  STORAGE_KEY,
  'migol-finanzas-v2',
  'finance-pal-sync-queue-encrypted',
] as const;

// OWASP 2026 recommendation: 600,000 iterations for PBKDF2-SHA256
// (was 100,000 - increased for stronger key derivation)
const KEY_DERIVATION_ITERATIONS = 600000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

const KEYSTORE_DB = 'finance-pal-keystore';
const KEYSTORE_STORE = 'keys';
const PEPPER_BYTES = 32;

const keyCache = new Map<string, Promise<CryptoKey>>();
const pepperCache = new Map<string, Promise<string>>();

// Salt storage format: { salt: base64, iterations: number }
interface SaltData {
  salt: string;
  iterations: number;
}

interface MasterKeyOptions {
  legacyNoPepper?: boolean;
  iterationsOverride?: number;
  saltOverride?: SaltData;
  legacySecret?: string;
}

const LEGACY_ITERATIONS = 100000;

import { supabase } from '@/lib/supabase';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function resolveUserId(userId?: string): Promise<string | undefined> {
  if (userId) return userId;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id;
  } catch {
    return undefined;
  }
}

function v2SaltStorageKey(userId?: string): string {
  return `${STORAGE_KEY}-salt:${userId || 'anon'}`;
}

function openKeystoreDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(KEYSTORE_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(KEYSTORE_STORE)) {
        req.result.createObjectStore(KEYSTORE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE, 'readonly');
    const req = tx.objectStore(KEYSTORE_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEYSTORE_STORE, 'readwrite');
    tx.objectStore(KEYSTORE_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbClear(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * SEC-002 / NEW-01: per-user cryptographic pepper stored in IndexedDB.
 * The public user.id + localStorage salt are no longer sufficient to derive
 * the AES-GCM key without this 256-bit secret.
 */
export async function getOrCreateDevicePepper(userId?: string): Promise<string> {
  const resolvedUserId = await resolveUserId(userId);
  const storeKey = `pepper-${resolvedUserId || 'anon'}`;

  const cached = pepperCache.get(storeKey);
  if (cached) return cached;

  const promise = (async () => {
    const db = await openKeystoreDB();
    try {
      const existing = await idbGet<string>(db, storeKey);
      if (existing) return existing;

      const pepper = bytesToBase64(crypto.getRandomValues(new Uint8Array(PEPPER_BYTES)));
      await idbPut(db, storeKey, pepper);
      return pepper;
    } finally {
      db.close();
    }
  })();

  pepperCache.set(storeKey, promise);
  try {
    return await promise;
  } catch (error) {
    pepperCache.delete(storeKey);
    throw error;
  }
}

async function getOrCreateV2Salt(userId?: string): Promise<SaltData> {
  const storageKey = v2SaltStorageKey(userId);
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<SaltData>;
      if (typeof parsed.salt === 'string' && parsed.salt.length > 0) {
        return {
          salt: parsed.salt,
          iterations: parsed.iterations ?? KEY_DERIVATION_ITERATIONS,
        };
      }
    } catch {
      // Ignore malformed metadata and create a fresh v2 salt.
    }
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const saltData: SaltData = {
    salt: bytesToBase64(salt),
    iterations: KEY_DERIVATION_ITERATIONS,
  };
  localStorage.setItem(storageKey, JSON.stringify(saltData));
  return saltData;
}

/**
 * F4-F: legacy blobs used the global `${STORAGE_KEY}-salt` and any iteration
 * count recorded there (or 100,000 when only a raw base64 salt existed).
 * Never overwrite this metadata when upgrading: it is required to decrypt
 * pre-v2 blobs until they are transparently re-encrypted.
 */
function getLegacySaltCandidates(): SaltData[] {
  const raw = localStorage.getItem(`${STORAGE_KEY}-salt`);
  if (!raw) return [];

  let salt = raw;
  let storedIterations = LEGACY_ITERATIONS;

  try {
    const parsed = JSON.parse(raw) as Partial<SaltData>;
    if (typeof parsed.salt === 'string' && parsed.salt.length > 0) {
      salt = parsed.salt;
      storedIterations = Number(parsed.iterations) || LEGACY_ITERATIONS;
    }
  } catch {
    // Legacy format: raw base64 salt, 100,000 iterations.
  }

  const separateIterations = Number(localStorage.getItem(`${STORAGE_KEY}-iterations`));
  if (Number.isFinite(separateIterations) && separateIterations > 0) {
    storedIterations = separateIterations;
  }

  const candidates: SaltData[] = [];
  for (const iterations of [LEGACY_ITERATIONS, storedIterations, KEY_DERIVATION_ITERATIONS]) {
    if (iterations > 0 && !candidates.some((entry) => entry.iterations === iterations)) {
      candidates.push({ salt, iterations });
    }
  }
  return candidates;
}

function getLegacySecrets(userId?: string): string[] {
  const secrets: string[] = [];
  if (userId) secrets.push(userId);

  try {
    const deviceSecret = localStorage.getItem('finance-pal-device-secret');
    if (deviceSecret) secrets.push(deviceSecret);
  } catch {
    // Ignore storage access errors.
  }

  secrets.push('anonymous-local-user');
  return [...new Set(secrets)];
}

async function deriveMasterKey(secret: string, saltData: SaltData, iterations: number): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltData.salt) as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

function clearKeyCache(): void {
  keyCache.clear();
}

async function getMasterKey(userId?: string, options: MasterKeyOptions = {}): Promise<CryptoKey> {
  const resolvedUserId = await resolveUserId(userId);

  let cacheKey: string;
  let secret: string;
  let saltData: SaltData;
  let iterations: number;

  if (options.legacyNoPepper) {
    if (!options.saltOverride) throw new Error('Legacy salt unavailable');
    saltData = options.saltOverride;
    iterations = options.iterationsOverride ?? saltData.iterations;
    secret = options.legacySecret ?? `${resolvedUserId || 'anonymous-local-user'}`;
    cacheKey = `legacy:${secret}:${saltData.salt}:${iterations}`;
  } else {
    const pepper = await getOrCreateDevicePepper(resolvedUserId);
    saltData = await getOrCreateV2Salt(resolvedUserId);
    iterations = KEY_DERIVATION_ITERATIONS;
    secret = `${resolvedUserId || 'anonymous-local-user'}:${pepper}`;
    cacheKey = `v2:${resolvedUserId || 'anon'}:${saltData.salt}`;
  }

  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const promise = deriveMasterKey(secret, saltData, iterations);
  keyCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    keyCache.delete(cacheKey);
    throw error;
  }
}

export async function encryptData(data: string, userId?: string): Promise<string> {
  const key = await getMasterKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return bytesToBase64(combined);
}

async function tryDecrypt(encryptedB64: string, key: CryptoKey): Promise<string | null> {
  try {
    const combined = base64ToBytes(encryptedB64);
    if (combined.length < IV_LENGTH + TAG_LENGTH) return null;

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export async function decryptData(encryptedB64: string, userId?: string): Promise<string | null> {
  const resolvedUserId = await resolveUserId(userId);

  // New format: per-user pepper in IndexedDB + 600,000 PBKDF2 iterations.
  try {
    const key = await getMasterKey(resolvedUserId);
    const decrypted = await tryDecrypt(encryptedB64, key);
    if (decrypted !== null) return decrypted;
  } catch (error) {
    console.warn('v2 decryption unavailable, trying legacy key fallback:', error);
  }

  // F4-F fallback: pre-v2 blobs used the global salt and 100,000 iterations,
  // with user.id (or the legacy device secret) as key material.
  const saltCandidates = getLegacySaltCandidates();
  const secretCandidates = getLegacySecrets(resolvedUserId);

  for (const saltData of saltCandidates) {
    for (const secret of secretCandidates) {
      try {
        const key = await getMasterKey(resolvedUserId, {
          legacyNoPepper: true,
          saltOverride: saltData,
          iterationsOverride: saltData.iterations,
          legacySecret: secret,
        });
        const decrypted = await tryDecrypt(encryptedB64, key);
        if (decrypted !== null) {
          console.info('Decrypted legacy state; it will be re-encrypted with the v2 pepper key on next save.');
          return decrypted;
        }
      } catch {
        // Try the next legacy combination.
      }
    }
  }

  console.error('Decryption failed: no v2 pepper key or legacy key could decrypt the payload');
  return null;
}

function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform() && typeof Filesystem?.readFile === 'function';
  } catch {
    return false;
  }
}

async function writeFileNative(path: string, data: string): Promise<void> {
  await ensureFilesystem();
  if (!Filesystem || typeof Filesystem.writeFile !== 'function') throw new Error('Filesystem not available');
  await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
}

async function readFileNative(path: string): Promise<string> {
  await ensureFilesystem();
  if (!Filesystem || typeof Filesystem.readFile !== 'function') throw new Error('Filesystem not available');
  const result = await Filesystem.readFile({
    path,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
  return result.data as string;
}

async function deleteFileNative(path: string): Promise<void> {
  await ensureFilesystem();
  if (!Filesystem || typeof Filesystem.deleteFile !== 'function') throw new Error('Filesystem not available');
  await Filesystem.deleteFile({ path, directory: Directory.Data });
}

export async function saveEncryptedState(state: string, key: string = STORAGE_KEY, userId?: string): Promise<void> {
  try {
    await ensureFilesystem();
    const encrypted = await encryptData(state, userId);
    if (isNativePlatform()) {
      await writeFileNative(key, encrypted);
    } else {
      localStorage.setItem(key, encrypted);
    }
  } catch (e) {
    console.error(`Failed to save encrypted state for ${key}:`, e);
    throw e;
  }
}

export async function loadEncryptedState(key: string = STORAGE_KEY, userId?: string): Promise<string | null> {
  try {
    await ensureFilesystem();
    let encrypted: string;
    if (isNativePlatform()) {
      encrypted = await readFileNative(key);
    } else {
      encrypted = localStorage.getItem(key) ?? '';
    }
    
    if (!encrypted) return null;
    return await decryptData(encrypted, userId);
  } catch (e) {
    console.error(`Failed to load encrypted state for ${key}:`, e);
    return null;
  }
}

function encryptedArtifactKeys(): string[] {
  const keys = new Set<string>();
  for (const base of ALL_ENCRYPTED_STATE_KEYS) {
    keys.add(base);
    keys.add(`${base}-meta`);
  }
  // Plaintext sync queue (legacy) and its metadata.
  keys.add('finance-pal-sync-queue');
  keys.add('finance-pal-sync-queue-meta');
  // Legacy device-bound key material.
  keys.add('finance-pal-device-secret');
  return [...keys];
}

async function removeStoredArtifact(key: string): Promise<void> {
  // Native builds keep encrypted payloads as files in Directory.Data.
  try {
    if (isNativePlatform()) {
      await deleteFileNative(key);
    }
  } catch {
    // File may not exist; continue with the remaining keys.
  }

  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage access errors.
  }
}

async function clearDevicePeppers(): Promise<void> {
  try {
    const db = await openKeystoreDB();
    try {
      await idbClear(db, KEYSTORE_STORE);
    } finally {
      db.close();
    }
  } finally {
    pepperCache.clear();
  }
}

function removeEncryptionSaltMetadata(): void {
  const keys = new Set<string>([
    `${STORAGE_KEY}-salt`,
    `${STORAGE_KEY}-iterations`,
    `${STORAGE_KEY}-salt:anon`,
  ]);

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(`${STORAGE_KEY}-salt`) || key === `${STORAGE_KEY}-iterations`)) {
        keys.add(key);
      }
    }
  } catch {
    // Ignore storage enumeration errors.
  }

  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage access errors.
    }
  }
}

/**
 * SEC-015 / F4-D: purge every encrypted payload, receipt, salt and pepper so
 * no trace of the previous account survives a sign-out on a shared device.
 */
export async function purgeAllEncryptedStorage(_userId?: string): Promise<void> {
  for (const key of encryptedArtifactKeys()) {
    await removeStoredArtifact(key);
  }

  await clearAllReceipts();
  await clearDevicePeppers();

  // Salts are removed only after every blob has been deleted.
  removeEncryptionSaltMetadata();
  clearKeyCache();
}

/**
 * Removes a single encrypted payload. When called without a key it delegates
 * to the full purge; when a specific key is passed only that payload and its
 * metadata are removed, preserving salts used by other blobs (F4-D).
 */
export async function clearEncryptedState(key?: string): Promise<void> {
  if (!key) {
    await purgeAllEncryptedStorage();
    return;
  }

  try {
    await removeStoredArtifact(key);
    await removeStoredArtifact(`${key}-meta`);
  } catch (e) {
    console.error(`Failed to clear encrypted state for ${key}:`, e);
  }
}

export async function rotateEncryptionKey(): Promise<void> {
  const currentState = await loadEncryptedState();
  if (!currentState) return;

  const userId = await resolveUserId();
  localStorage.removeItem(v2SaltStorageKey(userId));
  clearKeyCache();

  await saveEncryptedState(currentState, STORAGE_KEY, userId);
}

export function isEncryptionAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' && 
         typeof crypto.getRandomValues !== 'undefined';
}

// ─── IndexedDB receipt store (avoids localStorage quota issues) ───

const RECEIPT_DB = 'finance-pal-receipts';
const RECEIPT_STORE = 'receipts';

function openReceiptDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RECEIPT_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(RECEIPT_STORE)) {
        req.result.createObjectStore(RECEIPT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save a receipt (base64 data URL) to IndexedDB, encrypted at rest. */
export async function saveReceipt(key: string, dataUrl: string): Promise<void> {
  const db = await openReceiptDB();
  const encrypted = await encryptData(dataUrl);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECEIPT_STORE, 'readwrite');
    tx.objectStore(RECEIPT_STORE).put(encrypted, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load a receipt from IndexedDB, decrypting it. Returns undefined if not found.
 * Handles migration from unencrypted to encrypted storage. */
export async function loadReceipt(key: string): Promise<string | undefined> {
  const db = await openReceiptDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECEIPT_STORE, 'readonly');
    const req = tx.objectStore(RECEIPT_STORE).get(key);
    req.onsuccess = async () => {
      const stored = req.result;
      if (!stored) {
        resolve(undefined);
        return;
      }
      try {
        // Try to decrypt (new encrypted format)
        const decrypted = await decryptData(stored);
        if (decrypted !== null) {
          resolve(decrypted);
          return;
        }
        throw new Error('Decryption failed');
      } catch {
        // Migration: if decryption fails, assume it's legacy unencrypted data
        if (typeof stored === 'string' && stored.startsWith('data:')) {
          console.log(`Migrating unencrypted receipt ${key} to encrypted storage`);
          // Re-encrypt and save back
          try {
            const encrypted = await encryptData(stored);
            const db2 = await openReceiptDB();
            const tx2 = db2.transaction(RECEIPT_STORE, 'readwrite');
            tx2.objectStore(RECEIPT_STORE).put(encrypted, key);
            await new Promise<void>((res, rej) => {
              tx2.oncomplete = () => res();
              tx2.onerror = () => rej(tx2.error);
            });
            resolve(stored);
          } catch (e) {
            console.error('Failed to migrate receipt:', e);
            resolve(stored); // Return unencrypted as fallback
          }
        } else {
          // Unknown format
          resolve(undefined);
        }
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Delete a receipt from IndexedDB. */
export async function deleteReceipt(key: string): Promise<void> {
  const db = await openReceiptDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECEIPT_STORE, 'readwrite');
    tx.objectStore(RECEIPT_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Delete every receipt stored in IndexedDB (SEC-015 / F4-D). */
export async function clearAllReceipts(): Promise<void> {
  try {
    const db = await openReceiptDB();
    try {
      await idbClear(db, RECEIPT_STORE);
    } finally {
      db.close();
    }
  } catch (e) {
    console.error('Failed to clear receipts:', e);
  }
}

/**
 * Strip all base64 receipt data URLs from the state object and save them to
 * IndexedDB, replacing them with short reference strings.
 * Modifies the object in-place. Never throws — on failure, leaves receipts inline.
 */
export async function extractReceiptsToIndexedDB(state: any): Promise<void> {
  try {
    if (Array.isArray(state?.transactions)) {
      for (const tx of state.transactions) {
        if (typeof tx.receipt === 'string' && tx.receipt.startsWith('data:')) {
          const ref = `tx:${tx.id}`;
          await saveReceipt(ref, tx.receipt);
          tx.receipt = `__receipt:${ref}`;
        }
      }
    }
    if (Array.isArray(state?.debts)) {
      for (const debt of state.debts) {
        if (Array.isArray(debt.payments)) {
          for (const p of debt.payments) {
            if (typeof p.receipt === 'string' && p.receipt.startsWith('data:')) {
              const ref = `pay:${p.id}`;
              await saveReceipt(ref, p.receipt);
              p.receipt = `__receipt:${ref}`;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('extractReceiptsToIndexedDB failed, keeping receipts inline:', e);
  }
}

/**
 * Restore all receipt references (__receipt:*) in the state object from
 * IndexedDB. Modifies the object in-place.
 * Also checks IndexedDB for original receipts when the state has a compressed
 * URL (prefer local original over remote compressed). Never throws.
 */
export async function restoreReceiptsFromIndexedDB(state: any): Promise<void> {
  try {
    if (Array.isArray(state?.transactions)) {
      for (const tx of state.transactions) {
        if (typeof tx.receipt === 'string') {
          let ref: string | undefined;
          if (tx.receipt.startsWith('__receipt:')) {
            ref = tx.receipt.slice('__receipt:'.length);
          } else if (!tx.receipt.startsWith('data:')) {
            ref = `tx:${tx.id}`;
          }
          if (ref) {
            const data = await loadReceipt(ref);
            if (data) tx.receipt = data;
          }
        }
      }
    }
    if (Array.isArray(state?.debts)) {
      for (const debt of state.debts) {
        if (Array.isArray(debt.payments)) {
          for (const p of debt.payments) {
            if (typeof p.receipt === 'string') {
              let ref: string | undefined;
              if (p.receipt.startsWith('__receipt:')) {
                ref = p.receipt.slice('__receipt:'.length);
              } else if (!p.receipt.startsWith('data:')) {
                ref = `pay:${p.id}`;
              }
              if (ref) {
                const data = await loadReceipt(ref);
                if (data) p.receipt = data;
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('restoreReceiptsFromIndexedDB failed:', e);
  }
}

/**
 * Migrate all unencrypted receipts in IndexedDB to encrypted storage.
 * Call this on app startup to ensure all receipts are encrypted at rest.
 */
export async function migrateReceiptsToEncrypted(): Promise<{ migrated: number; errors: number }> {
  const db = await openReceiptDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECEIPT_STORE, 'readonly');
    const store = tx.objectStore(RECEIPT_STORE);
    const getAllReq = store.getAllKeys();
    getAllReq.onsuccess = async () => {
      const keys = getAllReq.result;
      let migrated = 0;
      let errors = 0;
      for (const key of keys) {
        try {
          const valueReq = store.get(key);
          await new Promise<void>((res, rej) => {
            valueReq.onsuccess = () => res();
            valueReq.onerror = () => rej(valueReq.error);
          });
          const stored = valueReq.result;
          if (typeof stored === 'string' && stored.startsWith('data:')) {
            // Unencrypted receipt found, encrypt it
            const encrypted = await encryptData(stored);
            const db2 = await openReceiptDB();
            const tx2 = db2.transaction(RECEIPT_STORE, 'readwrite');
            tx2.objectStore(RECEIPT_STORE).put(encrypted, key);
            await new Promise<void>((res, rej) => {
              tx2.oncomplete = () => res();
              tx2.onerror = () => rej(tx2.error);
            });
            migrated++;
          }
        } catch (e) {
          console.error(`Failed to migrate receipt ${key}:`, e);
          errors++;
        }
      }
      if (migrated > 0) {
        console.log(`Migrated ${migrated} receipts to encrypted storage`);
      }
      resolve({ migrated, errors });
    };
    getAllReq.onerror = () => reject(getAllReq.error);
  });
}
