import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

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
  saveReceipt, loadReceipt, deleteReceipt
} from "../lib/encrypted-storage";

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
