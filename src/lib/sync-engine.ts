import { supabase, isSupabaseEnabled } from './supabase';
import { useSyncStore } from '@/store/sync-store';
import { useAuth } from '@/context/AuthContext';

type SyncMutation = {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  payload?: any;
  createdAt: number;
};

let isProcessing = false;

export async function processSyncQueue(): Promise<void> {
  if (!isSupabaseEnabled || isProcessing) return;

  const { session } = useAuth.getState?.() ?? { session: null };
  if (!session) return;

  const { syncQueue, removeMutation, setSyncing } = useSyncStore.getState();
  if (syncQueue.length === 0) return;

  isProcessing = true;
  setSyncing(true);

  for (const mutation of syncQueue) {
    try {
      await applyMutation(mutation);
      removeMutation(mutation.id);
    } catch (error) {
      console.error('Sync failed for mutation:', mutation, error);
      break;
    }
  }

  setSyncing(false);
  isProcessing = false;
}

async function applyMutation(mutation: SyncMutation): Promise<void> {
  const { table, action, recordId, payload } = mutation;

  switch (action) {
    case 'INSERT': {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      break;
    }
    case 'UPDATE': {
      const { error } = await supabase.from(table).update(payload).eq('id', recordId);
      if (error) throw error;
      break;
    }
    case 'DELETE': {
      const { error } = await supabase.from(table).delete().eq('id', recordId);
      if (error) throw error;
      break;
    }
  }
}

export function setupSyncListener(): void {
  if (!isSupabaseEnabled) return;

  const { subscribe } = useAuth.getState?.() ?? { subscribe: () => () => {} };
  
  useSyncStore.subscribe((state) => {
    if (state.isSyncing) return;
    
    const { session } = useAuth.getState?.() ?? { session: null };
    if (session && state.syncQueue.length > 0) {
      processSyncQueue();
    }
  });

  window.addEventListener('online', () => {
    processSyncQueue();
  });
}