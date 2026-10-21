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

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const REDACTED = '[REDACTED]';
const SENSITIVE_DETAIL_KEYS = new Set([
  'email',
  'newemail',
  'oldemail',
  'token',
  'access_token',
  'refresh_token',
  'clabe',
  'password',
  'secret',
]);

/**
 * F10-B: mask an email while keeping enough context for support/forensics,
 * e.g. `user@example.com` -> `u***@example.com`.
 */
export function maskEmail(email: string): string {
  const value = email.trim();
  const at = value.lastIndexOf('@');

  if (at <= 0) {
    return value.length <= 1 ? '***' : `${value[0]}***`;
  }

  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}

function redactString(value: string): string {
  return value.replace(EMAIL_PATTERN, (match) => maskEmail(match));
}

function redactValue(value: unknown, key?: string): unknown {
  if (typeof value === 'string') {
    const normalizedKey = key?.toLowerCase();
    if (normalizedKey && SENSITIVE_DETAIL_KEYS.has(normalizedKey)) {
      return normalizedKey.includes('email') ? maskEmail(value) : REDACTED;
    }
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        redactValue(childValue, childKey),
      ]),
    );
  }

  return value;
}

/**
 * F10-B: redact PII/secrets from audit details before hashing and persisting.
 * Emails are masked; tokens, passwords and CLABEs are fully redacted.
 */
export function redactAuditDetails(
  details?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!details) return undefined;

  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, redactValue(value, key)]),
  );
}

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

async function computeHash(entry: Omit<AuditEntry, 'hash'>): Promise<string> {
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
  
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Log an audit entry for a security-sensitive operation
 */
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'prevHash' | 'hash'>): Promise<void> {
  try {
    const prevHash = await getLastEntryHash();
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const details = redactAuditDetails(entry.details) ?? {};

    const fullEntry: AuditEntry = {
      ...entry,
      details,
      id,
      timestamp,
      prevHash,
      hash: '', // Will be computed below
    };
    
    fullEntry.hash = await computeHash(fullEntry);
    
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
 * SEC-015 / F10-B: delete a user's audit entries, or the whole store when no
 * user id is supplied (e.g. on device sign-out).
 */
export async function clearAuditLogs(userId?: string): Promise<void> {
  try {
    const db = await openAuditDB();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AUDIT_STORE, 'readwrite');
        const store = tx.objectStore(AUDIT_STORE);

        if (!userId) {
          store.clear();
        } else {
          const req = store.getAll();
          req.onsuccess = () => {
            for (const entry of req.result as AuditEntry[]) {
              if (entry.userId === userId) {
                store.delete(entry.id);
              }
            }
          };
          req.onerror = () => reject(req.error);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch (e) {
    console.error('Failed to clear audit logs:', e);
  }
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
    const req = index.getAll();
    
    req.onsuccess = async () => {
      const entries = req.result as AuditEntry[];
      let prevHash = GENESIS_HASH;
      let valid = true;
      let brokenAt: string | undefined;
      
      for (const entry of entries) {
        if (!valid) break;
        
        const computedHash = await computeHash({
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
      }
      
      resolve({ valid, brokenAt, details: valid ? 'Audit log integrity verified' : `Hash chain broken at entry ${brokenAt}` });
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
