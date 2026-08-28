import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import { saveEncryptedState, loadEncryptedState, clearEncryptedState, isEncryptionAvailable } from '@/lib/encrypted-storage';

export type SyncActionType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncMutation {
  id: string;
  table: string;
  action: SyncActionType;
  recordId: string;
  payload?: any;
  createdAt: number;
  retryCount?: number;
}

interface SyncState {
  syncQueue: SyncMutation[];
  isSyncing: boolean;
  addMutation: (mutation: Omit<SyncMutation, 'id' | 'createdAt'>) => void;
  removeMutation: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (isSyncing: boolean) => void;
}

const STORAGE_KEY = 'finance-pal-sync-queue';
const ENCRYPTED_STORAGE_KEY = 'finance-pal-sync-queue-encrypted';

const encryptedStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (name !== STORAGE_KEY) return null;
    if (!isEncryptionAvailable()) return localStorage.getItem(name);
    const encrypted = await loadEncryptedState(ENCRYPTED_STORAGE_KEY);
    if (encrypted) return encrypted;
    return localStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (name !== STORAGE_KEY) return;
    localStorage.setItem(name, value);
    if (isEncryptionAvailable()) {
      try {
        await saveEncryptedState(value, ENCRYPTED_STORAGE_KEY);
      } catch (e) {
        console.warn('Sync queue encrypted save failed:', e);
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (name !== STORAGE_KEY) return;
    localStorage.removeItem(name);
    if (isEncryptionAvailable()) {
      await clearEncryptedState(ENCRYPTED_STORAGE_KEY);
    }
  },
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      syncQueue: [],
      isSyncing: false,
      addMutation: (mutation) =>
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...mutation,
              id: crypto.randomUUID(),
              createdAt: Date.now(),
            },
          ],
        })),
      removeMutation: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((m) => m.id !== id),
        })),
      clearQueue: () => set({ syncQueue: [] }),
      setSyncing: (isSyncing) => set({ isSyncing }),
    }),
    {
      name: STORAGE_KEY,
      storage: encryptedStorage,
    }
  )
);
