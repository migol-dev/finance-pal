import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import { saveEncryptedState, loadEncryptedState, isEncryptionAvailable } from '@/lib/encrypted-storage';

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

const encryptedStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (name !== STORAGE_KEY) return null;
    if (!isEncryptionAvailable()) return localStorage.getItem(name);
    return await loadEncryptedState();
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (name !== STORAGE_KEY) return;
    if (!isEncryptionAvailable()) {
      localStorage.setItem(name, value);
      return;
    }
    await saveEncryptedState(value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (name !== STORAGE_KEY) return;
    if (!isEncryptionAvailable()) {
      localStorage.removeItem(name);
      return;
    }
    // clearEncryptedState removes the salt too, which we don't want for just this key
    // So we'll just remove the specific key
    localStorage.removeItem(name);
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
