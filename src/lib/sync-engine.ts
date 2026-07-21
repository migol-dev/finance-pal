import { supabase, isSupabaseEnabled } from './supabase';
import { useSyncStore } from '@/store/sync-store';
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter';

type SyncMutation = {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  payload?: any;
  createdAt: number;
  retryCount?: number;
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

let processingLock = false;
let abortController: AbortController | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retryCount >= MAX_RETRIES) throw error;
    
    const delay = BASE_DELAY_MS * Math.pow(2, retryCount) + Math.random() * 1000;
    console.warn(`Sync retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms:`, error);
    await sleep(delay);
    return withRetry(fn, retryCount + 1);
  }
}

export async function processSyncQueue(): Promise<void> {
  if (!isSupabaseEnabled || processingLock) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  // Rate limit sync operations
  const clientId = getClientIdentifier();
  const rateLimitResult = await rateLimiter.checkLimit(clientId, 'sync');
  
  if (!rateLimitResult.allowed) {
    console.warn('Sync rate limited, retry after:', rateLimitResult.retryAfter);
    // Schedule retry after rate limit resets
    if (rateLimitResult.retryAfter) {
      setTimeout(() => processSyncQueue(), rateLimitResult.retryAfter * 1000);
    }
    return;
  }

  const { syncQueue, removeMutation, setSyncing, addMutation } = useSyncStore.getState();
  if (syncQueue.length === 0) return;

  processingLock = true;
  abortController = new AbortController();
  setSyncing(true);

  try {
    for (const mutation of syncQueue) {
      if (abortController?.signal.aborted) break;
      
      try {
        await withRetry(() => applyMutation(mutation));
        removeMutation(mutation.id);
      } catch (error) {
        console.error('Sync failed permanently for mutation:', mutation, error);
        
        // Move to dead letter queue (increment retry count, if max reached -> mark failed)
        const retryCount = (mutation.retryCount ?? 0) + 1;
        if (retryCount >= MAX_RETRIES) {
          console.error('Max retries reached, removing from queue:', mutation);
          removeMutation(mutation.id);
        } else {
          removeMutation(mutation.id);
          addMutation({ ...mutation, retryCount });
        }
        break; // Stop processing on permanent failure
      }
    }
  } finally {
    setSyncing(false);
    processingLock = false;
    abortController = null;
  }
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

  // Debounce rapid queue changes
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  
  useSyncStore.subscribe(async (state) => {
    if (state.isSyncing) return;
    
    if (state.syncQueue.length > 0) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          processSyncQueue();
        }, 500);
      }
    }
  });

  window.addEventListener('online', () => {
    // Small delay to let network stabilize
    setTimeout(() => processSyncQueue(), 1000);
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (abortController) abortController.abort();
  });
}