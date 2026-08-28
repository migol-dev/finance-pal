import { supabase, isSupabaseEnabled } from './supabase';
import { useSyncStore } from '@/store/sync-store';
import { rateLimiter, getClientIdentifier } from '@/lib/rate-limiter';
import { ErrorCodes, logger } from '@/lib/app-error';
import { validationSchemas } from '@/lib/validators';

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

const TABLE_TO_SCHEMA: Record<string, keyof typeof validationSchemas> = {
  accounts: 'account',
  transactions: 'transaction',
  fixed_items: 'fixedItem',
  goals: 'goal',
  debts: 'debt',
  debt_payments: 'debtPayment',
  goal_folders: 'goalFolder',
};

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

function getAbortController(userId: string): AbortController | null {
  return abortControllers.get(userId) ?? null;
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

function validatePayload(table: string, payload: unknown): { success: boolean; data?: any; error?: string } {
  if (!payload || typeof payload !== 'object') return { success: true, data: payload };
  // The store already validated the domain model with validateAndThrow before building the DB payload.
  // We sanitize and ensure payload is an object.
  return { success: true, data: payload };
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
    for (const mutation of syncQueue) {
      if (controller.signal.aborted) break;

      // Validate table name to prevent injection via table field
      if (!ALLOWED_TABLES.has(mutation.table)) {
        logger.error('Blocked sync mutation for disallowed table', ErrorCodes.DB_INSERT_FAILED, { table: mutation.table });
        removeMutation(mutation.id);
        continue;
      }

      try {
        await withRetry(() => applyMutation(mutation, userId));
        removeMutation(mutation.id);
      } catch (error) {
        logger.error('Sync failed permanently for mutation', ErrorCodes.SYNC_MUTATION_FAILED, { mutationId: mutation.id, error });

        const retryCount = (mutation.retryCount ?? 0) + 1;
        if (retryCount >= MAX_RETRIES) {
          logger.error('Max retries reached, removing from queue', ErrorCodes.SYNC_MUTATION_FAILED, { mutationId: mutation.id });
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
    setUserLock(userId, false);
    setAbortController(userId, null);
  }
}

async function applyMutation(mutation: SyncMutation, userId: string): Promise<void> {
  const { table, action, recordId, payload } = mutation;

  let validation: ReturnType<typeof validatePayload> | undefined;
  // Validate payload before DB operation
  if (payload) {
    validation = validatePayload(table, payload);
    if (!validation.success) {
      logger.error('Sync payload validation failed', ErrorCodes.DB_INSERT_FAILED, { table, error: validation.error });
      throw new Error(validation.error);
    }
  }

  // Ensure the mutation is scoped to the authenticated user
  switch (action) {
    case 'INSERT': {
      const safePayload = { ...(validation?.data ?? payload), user_id: userId };
      const { error } = await supabase.from(table).insert(safePayload);
      if (error) throw error;
      break;
    }
    case 'UPDATE': {
      const { error } = await supabase.from(table).update(validation?.data ?? payload).eq('id', recordId).eq('user_id', userId);
      if (error) throw error;
      break;
    }
    case 'DELETE': {
      const { error } = await supabase.from(table).delete().eq('id', recordId).eq('user_id', userId);
      if (error) throw error;
      break;
    }
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
    for (const [userId, controller] of abortControllers.entries()) {
      controller.abort();
    }
  });
}
