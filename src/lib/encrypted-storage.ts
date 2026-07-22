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
  } catch (e) {
    // Filesystem not available (e.g., in tests)
  }
}

const STORAGE_KEY = 'finance-pal-encrypted-v1';
const KEY_DERIVATION_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

let cryptoKey: CryptoKey | null = null;
let keyPromise: Promise<CryptoKey> | null = null;

async function getMasterKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;
  if (keyPromise) return keyPromise;

  keyPromise = (async () => {
    let salt: Uint8Array;
    const stored = localStorage.getItem(`${STORAGE_KEY}-salt`);
    
    if (stored) {
      salt = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    } else {
      salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
      localStorage.setItem(`${STORAGE_KEY}-salt`, btoa(String.fromCharCode(...salt)));
    }

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(getDeviceSecret()),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: KEY_DERIVATION_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    return cryptoKey!;
  })();

  return keyPromise;
}

function getDeviceSecret(): string {
  let secret = localStorage.getItem('finance-pal-device-secret');
  if (!secret) {
    const entropy = crypto.getRandomValues(new Uint8Array(32));
    secret = btoa(String.fromCharCode(...entropy));
    localStorage.setItem('finance-pal-device-secret', secret);
  }
  return secret;
}

export async function encryptData(data: string): Promise<string> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Chunk the conversion to avoid Maximum call stack size exceeded on large data
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < combined.length; i += chunkSize) {
    binary += String.fromCharCode(...combined.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function decryptData(encryptedB64: string): Promise<string | null> {
  try {
    const key = await getMasterKey();
    const combined = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
    
    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted data length');
    }

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
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

export async function saveEncryptedState(state: string): Promise<void> {
  try {
    await ensureFilesystem();
    const encrypted = await encryptData(state);
    if (isNativePlatform()) {
      await writeFileNative(STORAGE_KEY, encrypted);
    } else {
      localStorage.setItem(STORAGE_KEY, encrypted);
    }
  } catch (e) {
    console.error('Failed to save encrypted state:', e);
    throw e;
  }
}

export async function loadEncryptedState(): Promise<string | null> {
  try {
    await ensureFilesystem();
    let encrypted: string;
    if (isNativePlatform()) {
      encrypted = await readFileNative(STORAGE_KEY);
    } else {
      encrypted = localStorage.getItem(STORAGE_KEY) ?? '';
    }
    
    if (!encrypted) return null;
    return await decryptData(encrypted);
  } catch (e) {
    console.error('Failed to load encrypted state:', e);
    return null;
  }
}

export async function clearEncryptedState(): Promise<void> {
  try {
    await ensureFilesystem();
    if (isNativePlatform()) {
      await deleteFileNative(STORAGE_KEY);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    localStorage.removeItem(`${STORAGE_KEY}-salt`);
    cryptoKey = null;
    keyPromise = null;
  } catch (e) {
    console.error('Failed to clear encrypted state:', e);
  }
}

export async function rotateEncryptionKey(): Promise<void> {
  const currentState = await loadEncryptedState();
  if (!currentState) return;
  
  localStorage.removeItem(`${STORAGE_KEY}-salt`);
  cryptoKey = null;
  keyPromise = null;
  
  await saveEncryptedState(currentState);
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

/** Save a receipt (base64 data URL) to IndexedDB. */
export async function saveReceipt(key: string, dataUrl: string): Promise<void> {
  const db = await openReceiptDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECEIPT_STORE, 'readwrite');
    tx.objectStore(RECEIPT_STORE).put(dataUrl, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load a receipt from IndexedDB. Returns undefined if not found. */
export async function loadReceipt(key: string): Promise<string | undefined> {
  const db = await openReceiptDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECEIPT_STORE, 'readonly');
    const req = tx.objectStore(RECEIPT_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
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