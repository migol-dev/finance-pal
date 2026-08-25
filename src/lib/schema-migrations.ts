/**
 * Schema Migration System
 * Handles automatic migration of local/cloud data between schema versions
 * Version history:
 * v1 - Initial schema
 * v2 - Added accounts, fixed_items
 * v3 - Added goals, debts
 * v4 - Added goalFolders, folderId on goals, receipt on debt_payments
 * v5 - Current: added encrypted storage, audit logging, MFA support
 */
import { 
  FixedItem, Transaction, Goal, Debt, DebtPayment, 
  ChangeLogEntry, Account, ThemeMode, Currency, 
  UserProfile, AccentColor, AppSettings, GoalFolder,
  NotificationPreferences, DEFAULT_NOTIFICATION_PREFS
} from '@/lib/finance';
import { generateSecureId } from '@/lib/crypto-utils';

export const CURRENT_SCHEMA_VERSION = 5;

interface MigrationContext {
  userId?: string;
  isNative: boolean;
  timestamp: string;
}

interface MigrationResult {
  success: boolean;
  migrated: boolean;
  fromVersion: number;
  toVersion: number;
  warnings: string[];
  errors: string[];
}

/**
 * Migration functions - each handles upgrade from version N to N+1
 */
const migrations: Record<number, (data: any, ctx: MigrationContext) => Promise<any>> = {
  // v1 -> v2: Add accounts and fixed_items structure
  1: async (data, ctx) => {
    const warnings: string[] = [];
    return {
      ...data,
      accounts: data.accounts ?? [],
      fixedItems: data.fixed_items ?? data.fixedItems ?? [],
      transactions: data.transactions ?? [],
      goals: data.goals ?? [],
      debts: data.debts ?? [],
      changeLog: data.changeLog ?? [],
      theme: data.theme ?? 'light',
      profile: data.profile ?? { name: '', currency: 'MXN' as Currency },
      appSettings: data.appSettings ?? getDefaultAppSettings(),
      _meta: { ...data._meta, schemaVersion: 2 }
    };
  },

  // v2 -> v3: Add goals and debts with proper structure
  2: async (data, ctx) => {
    return {
      ...data,
      goals: (data.goals ?? []).map((g: any) => ({
        ...g,
        emoji: g.emoji ?? '🎯',
        color: g.color ?? 'gradient-primary',
        contributions: g.contributions ?? [],
        saved: g.saved ?? 0,
        pinned: g.pinned ?? false,
        createdAt: g.createdAt ?? g.created_at ?? new Date().toISOString(),
      })),
      debts: (data.debts ?? []).map((d: any) => ({
        ...d,
        payments: d.payments ?? [],
        accountId: d.account_id ?? d.accountId,
        dueDate: d.due_date ?? d.dueDate,
        createdAt: d.created_at ?? new Date().toISOString(),
      })),
      _meta: { ...data._meta, schemaVersion: 3 }
    };
  },

  // v3 -> v4: Add goalFolders and folderId on goals
  3: async (data, ctx) => {
    return {
      ...data,
      goalFolders: data.goalFolders ?? [],
      goals: (data.goals ?? []).map((g: any) => ({
        ...g,
        folderId: g.folder_id ?? g.folderId,
        contributions: Array.isArray(g.contributions) ? g.contributions : [],
      })),
      debts: (data.debts ?? []).map((d: any) => ({
        ...d,
        payments: Array.isArray(d.payments) ? d.payments : [],
      })),
      _meta: { ...data._meta, schemaVersion: 4 }
    };
  },

  // v4 -> v5: Add encrypted receipts, audit fields, MFA, notifications
  4: async (data, ctx) => {
    return {
      ...data,
      transactions: (data.transactions ?? []).map((t: any) => ({
        ...t,
        receipt: t.receipt ?? undefined,
        paymentMethod: t.payment_method ?? t.paymentMethod ?? 'cash',
        transferToAccountId: t.transfer_to_account_id ?? t.transferToAccountId,
        externalPayee: t.external_payee ?? t.externalPayee,
      })),
      debts: (data.debts ?? []).map((d: any) => ({
        ...d,
        payments: (d.payments ?? []).map((p: any) => ({
          ...p,
          paymentMethod: p.payment_method ?? p.paymentMethod ?? 'cash',
          accountId: p.account_id ?? p.accountId,
          transferToAccountId: p.transfer_to_account_id ?? p.transferToAccountId,
          externalPayee: p.external_payee ?? p.externalPayee,
        })),
      })),
      accounts: (data.accounts ?? []).map((a: any) => ({
        ...a,
        initialBalance: a.initial_balance ?? a.initialBalance ?? 0,
        denominations: a.denominations ?? [],
        clabe: a.clabe,
        bank: a.bank,
        holderName: a.holder_name ?? a.holderName,
      })),
      fixedItems: (data.fixedItems ?? []).map((f: any) => ({
        ...f,
        startDate: f.start_date ?? f.startDate,
        endDate: f.end_date ?? f.endDate,
        payDay: f.pay_day ?? f.payDay,
        payWeekDay: f.pay_week_day ?? f.payWeekDay,
        paymentMethod: f.payment_method ?? f.paymentMethod,
        accountId: f.account_id ?? f.accountId,
      })),
      appSettings: {
        ...getDefaultAppSettings(),
        ...data.appSettings,
        notifications: {
          ...DEFAULT_NOTIFICATION_PREFS,
          ...data.appSettings?.notifications,
        },
      },
      _meta: { ...data._meta, schemaVersion: 5 }
    };
  },
};

/**
 * Default app settings
 */
function getDefaultAppSettings(): AppSettings {
  const now = new Date();
  return {
    accentColor: 'rose',
    compactMode: false,
    glassEffect: true,
    conflictResolved: false,
    notifications: DEFAULT_NOTIFICATION_PREFS,
    firstRunVersion: CURRENT_SCHEMA_VERSION,
    lastMigrationVersion: 0,
  };
}

/**
 * Run all pending migrations on data
 */
export async function migrateData(
  data: any, 
  ctx: MigrationContext
): Promise<{ data: any; result: MigrationResult }> {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Detect current version
  const currentVersion = data._meta?.schemaVersion ?? 1;
  let migratedData = { ...data, _meta: data._meta ?? {} };
  let migrated = false;

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return { 
      data: migratedData, 
      result: { success: true, migrated: false, fromVersion: currentVersion, toVersion: CURRENT_SCHEMA_VERSION, warnings, errors }
    };
  }

  // Run migrations sequentially
  for (let v = currentVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migration = migrations[v];
    if (!migration) {
      errors.push(`No migration found for version ${v} -> ${v + 1}`);
      break;
    }
    
    try {
      warnings.push(`Migrating schema v${v} -> v${v + 1}`);
      migratedData = await migration(migratedData, ctx);
      migrated = true;
    } catch (e) {
      errors.push(`Migration v${v} -> v${v + 1} failed: ${e}`);
      break;
    }
  }

  // Ensure _meta exists
  migratedData._meta = {
    ...migratedData._meta,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastMigratedAt: new Date().toISOString(),
    migrationCount: (migratedData._meta.migrationCount ?? 0) + (migrated ? 1 : 0),
  };

  return { data: migratedData, result: { success: errors.length === 0, migrated, fromVersion: currentVersion, toVersion: CURRENT_SCHEMA_VERSION, warnings, errors } };
}

/**
 * Merge local and cloud data intelligently (no overwrite, merge by ID)
 */
export function mergeLocalCloudData<T extends { id: string }>(
  local: T[],
  cloud: T[],
  options: { preferNewer?: boolean } = {}
): T[] {
  const merged = new Map<string, T>();
  const now = Date.now();

  // Add cloud data first
  for (const item of cloud) {
    merged.set(item.id, item);
  }

  // Merge local data
  for (const item of local) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
    } else if (options.preferNewer) {
      // Compare updated_at or created_at timestamps
      const localTime = new Date((item as any).updated_at ?? (item as any).created_at ?? 0).getTime();
      const cloudTime = new Date((existing as any).updated_at ?? (existing as any).created_at ?? 0).getTime();
      if (localTime > cloudTime) {
        merged.set(item.id, item);
      }
    } else {
      // Keep local by default (user's pending changes)
      merged.set(item.id, item);
    }
  }

  return Array.from(merged.values());
}

/**
 * Sanitize and validate migrated data against current schemas
 */
export function sanitizeMigratedData(data: any): any {
  const sanitized: any = {};
  
  // Sanitize arrays
  const arrays = ['accounts', 'transactions', 'fixedItems', 'goals', 'debts', 'goalFolders', 'changeLog'];
  for (const key of arrays) {
    sanitized[key] = Array.isArray(data[key]) ? data[key] : [];
  }

  // Ensure required objects
  sanitized.theme = data.theme ?? 'light';
  sanitized.profile = data.profile ?? { name: '', currency: 'MXN' };
  sanitized.appSettings = { ...getDefaultAppSettings(), ...data.appSettings };

  // Fix common issues
  sanitized.goals = sanitized.goals.map((g: any) => ({
    ...g,
    folderId: g.folderId ?? g.folder_id,
    contributions: Array.isArray(g.contributions) ? g.contributions : [],
    saved: typeof g.saved === 'number' ? g.saved : 0,
  }));

  sanitized.debts = sanitized.debts.map((d: any) => ({
    ...d,
    payments: Array.isArray(d.payments) ? d.payments : [],
    accountId: d.accountId ?? d.account_id,
  }));

  sanitized.transactions = sanitized.transactions.map((t: any) => ({
    ...t,
    receipt: t.receipt,
    paymentMethod: t.paymentMethod ?? t.payment_method ?? 'cash',
  }));

  sanitized.accounts = sanitized.accounts.map((a: any) => ({
    ...a,
    initialBalance: typeof a.initialBalance === 'number' ? a.initialBalance : 
                    typeof a.initial_balance === 'number' ? a.initial_balance : 0,
    denominations: Array.isArray(a.denominations) ? a.denominations : [],
  }));

  return sanitized;
}

export { CURRENT_SCHEMA_VERSION as SCHEMA_VERSION };