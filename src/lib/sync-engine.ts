import { supabase, isSupabaseEnabled } from './supabase';
import { useSyncStore } from '@/store/sync-store';
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { ErrorCodes, logger } from '@/lib/app-error';

type SyncMutation = {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  payload?: any;
  createdAt: number;
  retryCount?: number;
};

const ALLOWED_TABLES = new Set([
  'accounts', 'transactions', 'fixed_items', 'goals', 'debts', 'debt_payments', 'goal_folders',
]);

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Per-user mutex map to prevent concurrent sync for same user
// Different users can sync concurrently without blocking each other
const processingLocks = new Map<string, boolean>();
const abortControllers = new Map<string, AbortController>();

function getUserLock(userId: string): boolean {
  return processingLocks.get(userId) ?? false;
}

function setUserLock(userId: string, locked: boolean): void {
  if (locked) {
    processingLocks.set(userId, true);
  } else {
    processingLocks.delete(userId);
  }
}

function setAbortController(userId: string, controller: AbortController | null): void {
  if (controller) {
    abortControllers.set(userId, controller);
  } else {
    abortControllers.delete(userId);
  }
}

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
    logger.warn(`Sync retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`, { error });
    await sleep(delay);
    return withRetry(fn, retryCount + 1);
  }
}

export async function processSyncQueue(): Promise<void> {
  if (!isSupabaseEnabled) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const userId = session.user.id;
  
  // Check per-user lock - don't block other users
  if (getUserLock(userId)) return;

  // Rate limit sync operations
  const clientId = getClientIdentifier();
  const rateLimitResult = await rateLimiter.checkLimit(clientId, 'sync');

  if (!rateLimitResult.allowed) {
    logger.warn('Sync rate limited, retry after: ' + rateLimitResult.retryAfter, { clientId });
    if (rateLimitResult.retryAfter) {
      setTimeout(() => processSyncQueue(), rateLimitResult.retryAfter * 1000);
    }
    return;
  }

  const { syncQueue, removeMutation, setSyncing, addMutation } = useSyncStore.getState();
  if (syncQueue.length === 0) return;

  setUserLock(userId, true);
  const controller = new AbortController();
  setAbortController(userId, controller);
  setSyncing(true);

  try {
    // 1. Deduplicate mutations
    const dedupedMutations = new Map<string, SyncMutation>();
    for (const m of syncQueue) {
      if (!ALLOWED_TABLES.has(m.table)) {
        removeMutation(m.id);
        continue;
      }
      const key = `${m.table}:${m.recordId}`;
      const existing = dedupedMutations.get(key);
      if (existing) {
        if (m.action === 'DELETE') {
          dedupedMutations.set(key, m); // DELETE wins
        } else if (existing.action === 'INSERT') {
          // Keep as INSERT but update payload
          dedupedMutations.set(key, { ...m, action: 'INSERT' });
        } else {
          dedupedMutations.set(key, m); // Latest UPDATE
        }
      } else {
        dedupedMutations.set(key, m);
      }
    }

    // 2. Group by Table and Action (Upsert vs Delete)
    const tableOps = new Map<string, { upserts: any[]; deletes: string[]; ids: string[] }>();
    for (const m of dedupedMutations.values()) {
      if (!tableOps.has(m.table)) tableOps.set(m.table, { upserts: [], deletes: [], ids: [] });
      const ops = tableOps.get(m.table)!;
      ops.ids.push(m.id);
      
      if (m.action === 'DELETE') {
        ops.deletes.push(m.recordId);
      } else {
        const payload = { ...(m.payload ?? {}), id: m.recordId, user_id: userId };
        ops.upserts.push(payload);
      }
    }

    // 3. Process batches per table
    for (const [table, ops] of tableOps.entries()) {
      if (controller.signal.aborted) break;

      try {
        await withRetry(async () => {
          if (ops.upserts.length > 0) {
            const { error } = await supabase.from(table).upsert(ops.upserts, { onConflict: 'id' });
            if (error) throw error;
          }
          if (ops.deletes.length > 0) {
            const { error } = await supabase.from(table).delete().eq('user_id', userId).in('id', ops.deletes);
            if (error) throw error;
          }
        });
        
        // Remove all successful mutations for this table from queue
        // We remove both the deduped ones and the intermediate ones to clear the queue
        for (const m of syncQueue) {
          if (m.table === table) removeMutation(m.id);
        }
      } catch (error) {
        logger.error(`Batch sync failed for table ${table}`, ErrorCodes.SYNC_MUTATION_FAILED, { error });
        // Increment retry count for these mutations or handle failure
        for (const m of syncQueue) {
          if (m.table === table) {
            const retryCount = (m.retryCount ?? 0) + 1;
            if (retryCount >= MAX_RETRIES) {
              removeMutation(m.id);
            } else {
              removeMutation(m.id);
              addMutation({ ...m, retryCount });
            }
          }
        }
      }
    }
  } finally {
    setSyncing(false);
    setUserLock(userId, false);
    setAbortController(userId, null);
  }
}

export function setupSyncListener(): void {
  if (!isSupabaseEnabled) return;

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
    setTimeout(() => processSyncQueue(), 1000);
  });

  window.addEventListener('beforeunload', () => {
    // Abort all pending sync operations
    for (const controller of abortControllers.values()) {
      controller.abort();
    }
  });
}
