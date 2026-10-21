import "./indexeddb-polyfill";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false }
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {},
  Directory: {},
  Encoding: {}
}));

import { 
  encryptData, decryptData, saveEncryptedState, loadEncryptedState, 
  clearEncryptedState, isEncryptionAvailable,
  saveReceipt, loadReceipt, deleteReceipt,
  STORAGE_KEY,
} from "../lib/encrypted-storage";

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function deriveAesKey(secret: string, saltB64: string, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)),
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptWithKey(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return toBase64(combined);
}

describe("encrypted-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("encrypt and decrypt data", () => {
    it("can encrypt and decrypt a string", async () => {
      const original = "Hello Secret World";
      const encrypted = await encryptData(original);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(original);
      
      const decrypted = await decryptData(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  describe("state persistence", () => {
    it("saves and loads encrypted state in localStorage", async () => {
      const state = JSON.stringify({ accounts: [{ id: "1" }] });
      
      await saveEncryptedState(state, "test-state");
      const stored = localStorage.getItem("test-state");
      expect(stored).toBeDefined();
      expect(stored).not.toBe(state);
      
      const loaded = await loadEncryptedState("test-state");
      expect(loaded).toBe(state);
    });

    it("clears encrypted state", async () => {
      await saveEncryptedState("test", "test-state");
      await clearEncryptedState("test-state");
      expect(localStorage.getItem("test-state")).toBeNull();
    });
  });

  describe("encryption availability", () => {
    it("returns true if crypto is available", () => {
      expect(isEncryptionAvailable()).toBe(true);
    });
  });

  describe("SEC-002 / NEW-01 — IndexedDB pepper", () => {
    it("prevents deriving the key from user.id and localStorage salt alone", async () => {
      const userId = "11111111-1111-4111-8111-111111111111";
      const plaintext = "pepper-protected state";

      const ciphertext = await encryptData(plaintext, userId);
      const saltKey = `${STORAGE_KEY}-salt:${userId}`;
      const saltData = JSON.parse(localStorage.getItem(saltKey) || "{}");

      expect(saltData.iterations).toBe(600000);
      expect(saltData.salt).toBeTruthy();

      // Attacker knows user.id, the salt and the ciphertext, but not the pepper.
      const attackerKey = await deriveAesKey(userId, saltData.salt, 600000);
      const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const payload = combined.slice(12);

      await expect(
        crypto.subtle.decrypt({ name: "AES-GCM", iv }, attackerKey, payload),
      ).rejects.toThrow();

      // The legitimate path still decrypts with the pepper.
      await expect(decryptData(ciphertext, userId)).resolves.toBe(plaintext);

      // The pepper must live in IndexedDB, not in localStorage.
      expect(localStorage.getItem(`pepper-${userId}`)).toBeNull();
    });
  });

  describe("F4-F — PBKDF2 100k → 600k migration", () => {
    it("decrypts legacy 100k blobs and re-encrypts them with the v2 pepper key", async () => {
      const userId = "22222222-2222-4222-8222-222222222222";
      const plaintext = "legacy encrypted state";

      const legacySalt = crypto.getRandomValues(new Uint8Array(16));
      const legacySaltB64 = toBase64(legacySalt);
      localStorage.setItem(
        `${STORAGE_KEY}-salt`,
        JSON.stringify({ salt: legacySaltB64, iterations: 100000 }),
      );

      const legacyKey = await deriveAesKey(userId, legacySaltB64, 100000);
      const legacyCiphertext = await encryptWithKey(plaintext, legacyKey);

      // Transparent backward-compatible read.
      await expect(decryptData(legacyCiphertext, userId)).resolves.toBe(plaintext);

      // Next save uses the v2 pepper key + 600,000 iterations.
      const migratedCiphertext = await encryptData(plaintext, userId);
      expect(migratedCiphertext).not.toBe(legacyCiphertext);
      await expect(decryptData(migratedCiphertext, userId)).resolves.toBe(plaintext);

      const v2Salt = JSON.parse(localStorage.getItem(`${STORAGE_KEY}-salt:${userId}`) || "{}");
      expect(v2Salt.iterations).toBe(600000);

      // The legacy key must no longer open the migrated blob.
      const combined = Uint8Array.from(atob(migratedCiphertext), (c) => c.charCodeAt(0));
      await expect(
        crypto.subtle.decrypt(
          { name: "AES-GCM", iv: combined.slice(0, 12) },
          legacyKey,
          combined.slice(12),
        ),
      ).rejects.toThrow();
    });

    it("does not overwrite the legacy salt metadata before decrypting", async () => {
      const userId = "33333333-3333-4333-8333-333333333333";
      const saltB64 = toBase64(crypto.getRandomValues(new Uint8Array(16)));
      const legacyMetadata = JSON.stringify({ salt: saltB64, iterations: 100000 });
      localStorage.setItem(`${STORAGE_KEY}-salt`, legacyMetadata);

      const legacyKey = await deriveAesKey(userId, saltB64, 100000);
      const legacyCiphertext = await encryptWithKey("keep my data", legacyKey);

      await expect(decryptData(legacyCiphertext, userId)).resolves.toBe("keep my data");
      expect(localStorage.getItem(`${STORAGE_KEY}-salt`)).toBe(legacyMetadata);
    });
  });

  describe("receipts (IndexedDB)", () => {
    beforeEach(async () => {
      // skip deleteDatabase
    });

    it("saves and loads receipt data", async () => {
      const key = "tx:123";
      const dataUrl = "data:image/png;base64,iVBORw0K";
      
      await saveReceipt(key, dataUrl);
      const loaded = await loadReceipt(key);
      
      expect(loaded).toBe(dataUrl);
    });

    it("deletes a receipt", async () => {
      const key = "tx:456";
      const dataUrl = "data:image/jpeg;base64,xxxx";
      
      await saveReceipt(key, dataUrl);
      await deleteReceipt(key);
      const loaded = await loadReceipt(key);
      
      expect(loaded).toBeUndefined();
    });
  });
});
