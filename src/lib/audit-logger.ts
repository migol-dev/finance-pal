/**
 * Audit Logger for security-sensitive operations
 * Provides tamper-evident logging with hash chaining
 */

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

type AuditAction = 
  | 'auth.login' 
  | 'auth.logout' 
  | 'auth.mfa_enabled' 
  | 'auth.mfa_disabled' 
  | 'auth.password_changed' 
  | 'auth.email_changed'
  | 'data.export'
  | 'data.import'
  | 'data.delete_all'
  | 'account.create'
  | 'account.update'
  | 'account.delete'
  | 'transaction.create'
  | 'transaction.update'
  | 'transaction.delete'
  | 'fixed.create'
  | 'fixed.update'
  | 'fixed.delete'
  | 'goal.create'
  | 'goal.update'
  | 'goal.delete'
  | 'debt.create'
  | 'debt.update'
  | 'debt.delete'
  | 'debt_payment.create'
  | 'debt_payment.delete'
  | 'settings.sync_toggled'
  | 'receipt.upload'
  | 'receipt.delete';

const AUDIT_DB = 'finance-pal-audit';
const AUDIT_STORE = 'audit_log';
const MAX_AUDIT_ENTRIES = 10000;
const GENESIS_HASH = '0'.repeat(64);

async function openAuditDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIT_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(AUDIT_STORE)) {
        const store = req.result.createObjectStore(AUDIT_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('action', 'action', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getLastEntryHash(): Promise<string> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_STORE, 'readonly');
    const store = tx.objectStore(AUDIT_STORE);
    const index = store.index('timestamp');
    const req = index.openCursor(null, 'prev');
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        resolve(cursor.value.hash);
      } else {
        resolve(GENESIS_HASH);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

function computeHash(entry: Omit<AuditEntry, 'hash'>): string {
  const data = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    details: entry.details,
    prevHash: entry.prevHash,
  });
  // Simple tamper-evident hash chaining
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return btoa(JSON.stringify({ hash: hash.toString(16), prevHash: entry.prevHash }));
}

/**
 * Log an audit entry for a security-sensitive operation
 */
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'prevHash' | 'hash'>): Promise<void> {
  try {
    const prevHash = await getLastEntryHash();
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const fullEntry: AuditEntry = {
      ...entry,
      id,
      timestamp,
      prevHash,
      hash: '', // Will be computed below
    };
    
    fullEntry.hash = computeHash(fullEntry);
    
    const db = await openAuditDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUDIT_STORE, 'readwrite');
      tx.objectStore(AUDIT_STORE).put(fullEntry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('Failed to write audit log:', e);
    // Never throw - audit logging should not break app functionality
  }
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(options?: {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  since?: Date;
  until?: Date;
  limit?: number;
}): Promise<AuditEntry[]> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_STORE, 'readonly');
    const store = tx.objectStore(AUDIT_STORE);
    const index = store.index('timestamp');
    
    let range: IDBKeyRange | undefined;
    if (options?.since && options?.until) {
      range = IDBKeyRange.bound(options.since.toISOString(), options.until.toISOString());
    } else if (options?.since) {
      range = IDBKeyRange.lowerBound(options.since.toISOString());
    } else if (options?.until) {
      range = IDBKeyRange.upperBound(options.until.toISOString());
    }
    
    const req = index.openCursor(range, 'prev');
    const results: AuditEntry[] = [];
    const limit = options?.limit ?? 100;
    
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && results.length < limit) {
        const entry = cursor.value;
        if ((!options?.userId || entry.userId === options.userId) &&
            (!options?.action || entry.action === options.action) &&
            (!options?.resource || entry.resource === options.resource)) {
          results.push(entry);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Verify audit log integrity (hash chain validation)
 */
export async function verifyAuditIntegrity(): Promise<{ valid: boolean; brokenAt?: string; details: string }> {
  const db = await openAuditDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIT_STORE, 'readonly');
    const store = tx.objectStore(AUDIT_STORE);
    const index = store.index('timestamp');
    const req = index.openCursor();
    
    let prevHash = GENESIS_HASH;
    let valid = true;
    let brokenAt: string | undefined;
    
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && valid) {
        const entry = cursor.value;
        const computedHash = computeHash({
          id: entry.id,
          timestamp: entry.timestamp,
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details,
          prevHash: entry.prevHash,
        });
        
        if (entry.prevHash !== prevHash) {
          valid = false;
          brokenAt = entry.id;
        } else if (entry.hash !== computedHash) {
          valid = false;
          brokenAt = entry.id;
        }
        
        prevHash = entry.hash;
        cursor.continue();
      } else {
        resolve({ valid, brokenAt, details: valid ? 'Audit log integrity verified' : `Hash chain broken at entry ${brokenAt}` });
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Export audit logs for compliance/forensics
 */
export async function exportAuditLogs(userId?: string): Promise<string> {
  const logs = await queryAuditLogs({ userId, limit: MAX_AUDIT_ENTRIES });
  return JSON.stringify(logs, null, 2);
}

/**
 * Convenience functions for common audit actions
 */
export const audit = {
  login: (userId: string, details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'auth.login', resource: 'session', details }),
  
  logout: (userId: string, details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'auth.logout', resource: 'session', details }),
  
  mfaEnabled: (userId: string, details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'auth.mfa_enabled', resource: 'mfa', details }),
  
  mfaDisabled: (userId: string, details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'auth.mfa_disabled', resource: 'mfa', details }),
  
  passwordChanged: (userId: string, details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'auth.password_changed', resource: 'credentials', details }),
  
  emailChanged: (userId: string, details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'auth.email_changed', resource: 'credentials', details }),
  
  dataExported: (userId: string, scopes: string[], details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'data.export', resource: 'export', details: { scopes, ...details } }),
  
  dataImported: (userId: string, scopes: string[], details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'data.import', resource: 'import', details: { scopes, ...details } }),
  
  dataDeleted: (userId: string, details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'data.delete_all', resource: 'all_data', details }),
  
  syncToggled: (userId: string, enabled: boolean, details: Record<string, unknown> = {}) => 
    logAudit({ userId, action: 'settings.sync_toggled', resource: 'sync', details: { enabled, ...details } }),
};
