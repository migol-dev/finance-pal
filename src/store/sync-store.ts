import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SyncActionType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncMutation {
  id: string;
  table: string;
  action: SyncActionType;
  recordId: string;
  payload?: any;
  createdAt: number;
}

interface SyncState {
  syncQueue: SyncMutation[];
  isSyncing: boolean;
  addMutation: (mutation: Omit<SyncMutation, 'id' | 'createdAt'>) => void;
  removeMutation: (id: string) => void;
  clearQueue: () => void;
  setSyncing: (isSyncing: boolean) => void;
}

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
              id: Math.random().toString(36).slice(2, 10),
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
      name: 'finance-pal-sync-queue',
    }
  )
);
