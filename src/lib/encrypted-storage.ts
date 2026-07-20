import { Capacitor } from '@capacitor/core';

let Filesystem: any = null;
let Directory: any = null;
let Encoding: any = null;

try {
  const fs = await import('@capacitor/filesystem');
  Filesystem = fs.Filesystem;
  Directory = fs.Directory;
  Encoding = fs.Encoding;
} catch (e) {
  // Filesystem not available (e.g., in tests)
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
        salt,
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
  
  return btoa(String.fromCharCode(...combined));
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
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function writeFileNative(path: string, data: string): Promise<void> {
  if (!Filesystem) throw new Error('Filesystem not available');
  await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
}

async function readFileNative(path: string): Promise<string> {
  if (!Filesystem) throw new Error('Filesystem not available');
  const result = await Filesystem.readFile({
    path,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
  return result.data as string;
}

async function deleteFileNative(path: string): Promise<void> {
  if (!Filesystem) throw new Error('Filesystem not available');
  await Filesystem.deleteFile({ path, directory: Directory.Data });
}

export async function saveEncryptedState(state: string): Promise<void> {
  try {
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