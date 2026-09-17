import {
    FixedItem, Transaction, Goal, GoalFolder, Debt, DebtPayment,
    ChangeLogEntry, ChangeAction, ChangeEntity, IconRef,
    Account, Currency, UserProfile
} from "@/lib/finance";
import { validationSchemas } from '@/lib/validators';
import { CURRENT_SCHEMA_VERSION } from '@/lib/schema-migrations';

export const SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;

/* ─────────────────────────────  Identificadores y Diff  ───────────────────────────── */

export function generateSecureId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    array[6] = (array[6] & 0x0f) | 0x40; // version 4
    array[8] = (array[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(s: string): boolean {
    return UUID_RE.test(s);
}

export function diffFields<T>(prev: T, next: Partial<T>): { field: string; from?: unknown; to?: unknown }[] {
    const out: { field: string; from?: unknown; to?: unknown }[] = [];
    const prevRecord = prev as Record<string, unknown>;
    const nextRecord = next as Record<string, unknown>;
    for (const k of Object.keys(nextRecord)) {
        if (k === "id") continue;
        const a = prevRecord[k];
        const b = nextRecord[k];
        if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ field: k, from: a, to: b });
    }
    return out;
}

export function logEntry(
    entity: ChangeEntity,
    entityId: string,
    action: ChangeAction,
    label: string,
    changes?: { field: string; from?: unknown; to?: unknown }[]
): ChangeLogEntry {
    return { id: generateSecureId(), at: new Date().toISOString(), entity, entityId, action, label, changes };
}

/* ─────────────────────────────  Validadores Zod  ───────────────────────────── */

export function validateEntityData<T>(
    schemaKey: keyof typeof validationSchemas,
    data: unknown
): { success: true; data: T } | { success: false; error: string } {
    const schema = validationSchemas[schemaKey];
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data as unknown as T };
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { success: false, error: `Validation failed: ${issues}` };
}

export function validateAndThrow<T>(schemaKey: keyof typeof validationSchemas, data: unknown): T {
    const result = validateEntityData<T>(schemaKey, data);
    if (!result.success) throw new Error(result.error);
    return result.data;
}

/* ─────────────────────────────  Limpiadores para exportación  ───────────────────────────── */

export function sanitizeAccountForExport(account: Account, opts: { excludeBankDetails?: boolean }): Account {
    if (!opts.excludeBankDetails) return account;
    return {
        ...account,
        clabe: undefined,
        bank: undefined,
        holderName: undefined,
    };
}

export function sanitizeTransactionForExport(
    tx: Transaction,
    opts: { excludeReceipts?: boolean; excludeBankDetails?: boolean }
): Transaction {
    const result = { ...tx };
    if (opts.excludeReceipts) {
        result.receipt = undefined;
    }
    if (opts.excludeBankDetails) {
        result.externalPayee = undefined;
    }
    return result;
}

export function sanitizeDebtPaymentForExport(
    payment: DebtPayment,
    opts: { excludeBankDetails?: boolean }
): DebtPayment {
    if (!opts.excludeBankDetails) return payment;
    return {
        ...payment,
        externalPayee: undefined,
    };
}

export function sanitizeProfileForExport(profile: UserProfile, opts: { excludeEmail?: boolean }): UserProfile {
    if (!opts.excludeEmail) return profile;
    return {
        ...profile,
        email: undefined,
    };
}

/* ─────────────────────────────  Type Guards  ───────────────────────────── */

export const isStr = (v: unknown): v is string => typeof v === "string";
export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export const isBool = (v: unknown): v is boolean => typeof v === "boolean";
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function inSet<T extends string>(set: readonly T[], v: unknown): v is T {
    return typeof v === "string" && (set as readonly string[]).includes(v);
}

/* ─────────────────────────────  Sanitizadores de entidad  ───────────────────────────── */

export function sanitizeIcon(v: unknown): IconRef | undefined {
    if (!isObj(v)) return undefined;
    const kind = v.kind === "image" ? "image" : v.kind === "emoji" ? "emoji" : null;
    if (!kind || !isStr(v.value)) return undefined;
    return { kind, value: v.value };
}

export function sanitizeFixed(raw: unknown): FixedItem | null {
    if (!isObj(raw) || !isStr(raw.concept) || !isNum(raw.amount)) return null;
    const types = ["income_fixed", "expense_fixed", "expense_variable", "saving_fixed"] as const;
    const freqs = ["monthly", "weekly", "yearly", "one_time", "bimonthly", "quarterly", "fourmonthly", "biannual"] as const;
    const prios = ["low", "medium", "high"] as const;
    const pays = ["cash", "transfer", "card", "other"] as const;
    return {
        id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
        type: inSet(types, raw.type) ? raw.type : "expense_fixed",
        category: isStr(raw.category) ? raw.category : "Otros",
        concept: raw.concept,
        amount: raw.amount,
        frequency: inSet(freqs, raw.frequency) ? raw.frequency : "monthly",
        active: isBool(raw.active) ? raw.active : true,
        note: isStr(raw.note) ? raw.note : undefined,
        startDate: isStr(raw.startDate) ? raw.startDate : new Date().toISOString(),
        endDate: isStr(raw.endDate) ? raw.endDate : `${new Date().getFullYear() + 5}-12-31T00:00:00.000Z`,
        priority: inSet(prios, raw.priority) ? raw.priority : "medium",
        payDay: isNum(raw.payDay) ? raw.payDay : undefined,
        payWeekDay: isNum(raw.payWeekDay) ? raw.payWeekDay : undefined,
        icon: sanitizeIcon(raw.icon),
        paymentMethod: inSet(pays, raw.paymentMethod) ? raw.paymentMethod : undefined,
        accountId: isStr(raw.accountId) && isValidUUID(raw.accountId) ? raw.accountId : undefined,
    };
}

export function sanitizeTx(raw: unknown): Transaction | null {
    if (!isObj(raw) || !isStr(raw.concept) || !isNum(raw.amount)) return null;
    const types = ["income", "expense", "saving", "transfer"] as const;
    const pays = ["cash", "transfer", "card", "other"] as const;
    return {
        id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
        type: inSet(types, raw.type) ? raw.type : "expense",
        category: isStr(raw.category) ? raw.category : "Otros",
        concept: raw.concept,
        amount: raw.amount,
        date: isStr(raw.date) ? raw.date : new Date().toISOString(),
        note: isStr(raw.note) ? raw.note : undefined,
        icon: sanitizeIcon(raw.icon),
        paymentMethod: inSet(pays, raw.paymentMethod) ? raw.paymentMethod : undefined,
        fixedId: isStr(raw.fixedId) && isValidUUID(raw.fixedId) ? raw.fixedId : undefined,
        accountId: isStr(raw.accountId) && isValidUUID(raw.accountId) ? raw.accountId : undefined,
        transferToAccountId: isStr(raw.transferToAccountId) && isValidUUID(raw.transferToAccountId) ? raw.transferToAccountId : undefined,
        externalPayee: isObj(raw.externalPayee)
            ? {
                clabe: isStr(raw.externalPayee.clabe) ? raw.externalPayee.clabe : undefined,
                bank: isStr(raw.externalPayee.bank) ? raw.externalPayee.bank : undefined,
                name: isStr(raw.externalPayee.name) ? raw.externalPayee.name : undefined,
            }
            : undefined,
        receipt: isStr(raw.receipt) ? raw.receipt : undefined,
    };
}

export function sanitizeGoal(raw: unknown): Goal | null {
    if (!isObj(raw) || !isStr(raw.name) || !isNum(raw.target)) return null;
    const rawList: unknown[] = Array.isArray(raw.contributions) ? raw.contributions : [];
    const contributions = Array.isArray(raw.contributions)
        ? rawList
            .filter((c): c is Record<string, unknown> => isObj(c) && isNum(c.amount) && isStr(c.date))
            .map((c) => ({
                id: isStr(c.id) && isValidUUID(c.id) ? c.id : generateSecureId(),
                date: c.date as string,
                amount: c.amount as number,
            }))
        : undefined;
    return {
        id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
        name: raw.name,
        target: raw.target,
        saved: isNum(raw.saved) ? raw.saved : 0,
        emoji: isStr(raw.emoji) ? raw.emoji : "🎯",
        color: isStr(raw.color) ? raw.color : "gradient-primary",
        deadline: isStr(raw.deadline) ? raw.deadline : undefined,
        icon: sanitizeIcon(raw.icon),
        purchaseUrl: isStr(raw.purchaseUrl) ? raw.purchaseUrl : undefined,
        contributions,
        createdAt: isStr(raw.createdAt) ? raw.createdAt : undefined,
        pinned: isBool(raw.pinned) ? raw.pinned : undefined,
    } as Goal;
}

export function sanitizeGoalFolder(raw: unknown): GoalFolder | null {
    if (!isObj(raw) || !isStr(raw.name)) return null;
    return {
        id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
        name: raw.name,
        color: isStr(raw.color) ? raw.color : "gradient-primary",
        icon: sanitizeIcon(raw.icon),
        parentId: isStr(raw.parentId) && isValidUUID(raw.parentId) ? raw.parentId : undefined,
        order: isNum(raw.order) ? raw.order : 0,
        createdAt: isStr(raw.createdAt) ? raw.createdAt : new Date().toISOString(),
    } as GoalFolder;
}

export function sanitizeDebt(raw: unknown): Debt | null {
    if (!isObj(raw) || !isStr(raw.person) || !isNum(raw.amount)) return null;
    const pays = ["cash", "transfer", "card", "other"] as const;
    const rawPayments: unknown[] = Array.isArray(raw.payments) ? raw.payments : [];
    const payments: DebtPayment[] = Array.isArray(raw.payments)
        ? rawPayments
            .filter((p): p is Record<string, unknown> => isObj(p) && isNum(p.amount))
            .map((p) => ({
                id: isStr(p.id) && isValidUUID(p.id) ? p.id : generateSecureId(),
                amount: p.amount as number,
                date: isStr(p.date) ? p.date : new Date().toISOString(),
                note: isStr(p.note) ? p.note : undefined,
                paymentMethod: inSet(pays, p.paymentMethod) ? p.paymentMethod : undefined,
                accountId: isStr(p.accountId) && isValidUUID(p.accountId) ? p.accountId : undefined,
                transferToAccountId: isStr(p.transferToAccountId) && isValidUUID(p.transferToAccountId) ? p.transferToAccountId : undefined,
                externalPayee: isObj(p.externalPayee)
                    ? {
                        clabe: isStr(p.externalPayee.clabe) ? p.externalPayee.clabe : undefined,
                        bank: isStr(p.externalPayee.bank) ? p.externalPayee.bank : undefined,
                        name: isStr(p.externalPayee.name) ? p.externalPayee.name : undefined,
                    }
                    : undefined,
                receipt: isStr(p.receipt) ? p.receipt : undefined,
            }))
        : [];
    return {
        id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
        person: raw.person,
        concept: isStr(raw.concept) ? raw.concept : "Préstamo",
        amount: raw.amount,
        date: isStr(raw.date) ? raw.date : new Date().toISOString(),
        dueDate: isStr(raw.dueDate) ? raw.dueDate : undefined,
        note: isStr(raw.note) ? raw.note : undefined,
        icon: sanitizeIcon(raw.icon),
        payments,
        accountId: isStr(raw.accountId) && isValidUUID(raw.accountId) ? raw.accountId : undefined,
    } as Debt;
}

export function sanitizeAccount(raw: unknown): Account | null {
    if (!isObj(raw) || !isStr(raw.name)) return null;
    const types = ["bank", "cash", "other"] as const;
    const rawDenoms: unknown[] = Array.isArray(raw.denominations) ? raw.denominations : [];
    const denoms = Array.isArray(raw.denominations)
        ? rawDenoms
            .filter((d): d is Record<string, unknown> => isObj(d) && isNum(d.value) && isNum(d.count))
            .map((d) => ({
                value: d.value as number,
                count: d.count as number,
                kind: d.kind === "coin" ? "coin" : "bill",
            }))
        : undefined;
    return {
        id: isStr(raw.id) && isValidUUID(raw.id) ? raw.id : generateSecureId(),
        name: raw.name,
        type: inSet(types, raw.type) ? raw.type : "bank",
        initialBalance: isNum(raw.initialBalance) ? raw.initialBalance : 0,
        currency: isStr(raw.currency) ? raw.currency : undefined,
        denominations: denoms,
        clabe: isStr(raw.clabe) ? raw.clabe : undefined,
        bank: isStr(raw.bank) ? raw.bank : undefined,
        holderName: isStr(raw.holderName) ? raw.holderName : undefined,
    } as Account;
}

export function sanitizeProfile(raw: unknown): UserProfile {
    const currencies: Currency[] = ["MXN", "USD", "EUR", "COP", "ARS", "CLP", "PEN", "BRL"];
    if (!isObj(raw)) return { name: "", currency: "MXN" };
    return {
        name: isStr(raw.name) ? raw.name : "",
        email: isStr(raw.email) ? raw.email : undefined,
        currency: currencies.includes(raw.currency as Currency) ? (raw.currency as Currency) : "MXN",
        avatar: sanitizeIcon(raw.avatar),
    };
}

/* ─────────────────────────────  Normalizadores de importación  ───────────────────────────── */

/** Normalize keys from old app: Spanish → English, snake_case → camelCase, and coerce string numbers */
export function normalizeImportKeys(obj: unknown): unknown {
    if (obj === null || obj === undefined || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(normalizeImportKeys);
    const record = obj as Record<string, unknown>;
    const keyMap: Record<string, string> = {
        cuentas: "accounts", movimientos: "transactions", metas: "goals",
        carpetas_metas: "goalFolders",
        deudas: "debts", fijos: "fixedItems", conceptos: "fixedItems",
        historial: "changeLog", perfil: "profile", tema: "theme",
        initial_balance: "initialBalance", holder_name: "holderName",
        account_id: "accountId", fixed_id: "fixedId",
        payment_method: "paymentMethod", transfer_to_account_id: "transferToAccountId",
        external_payee: "externalPayee", due_date: "dueDate", purchase_url: "purchaseUrl",
        created_at: "createdAt", start_date: "startDate", end_date: "endDate",
        pay_day: "payDay", pay_week_day: "payWeekDay", user_id: "userId",
    };
    // Fields that should be coerced from string to number
    const numericFields = new Set(["amount", "target", "saved", "initialBalance", "value", "count"]);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
        const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        const mapped = keyMap[camel] ?? keyMap[k] ?? camel;
        let val: unknown = normalizeImportKeys(v);
        // Coerce string numbers to actual numbers for known numeric fields
        if (numericFields.has(mapped) && typeof val === "string") {
            const n = Number(val);
            if (!Number.isNaN(n) && Number.isFinite(n)) val = n;
        }
        out[mapped] = val;
    }
    return out;
}

/** Upgrade an older payload to current schema. Pure: returns sanitized data. */
export function migrateImported(payload: unknown): { data: unknown; warnings: string[] } {
    const warnings: string[] = [];
    const payloadRecord: Record<string, unknown> = isObj(payload) ? payload : {};
    const version: number = isNum(payloadRecord.version) ? (payloadRecord.version as number) : 1;
    const raw: unknown = isObj(payload) && payload.data !== undefined ? payload.data : (payload ?? {});
    if (version > SCHEMA_VERSION) warnings.push(`Importando datos de una versión más nueva (${version}). Algunos campos podrían ignorarse.`);
    if (version < SCHEMA_VERSION) warnings.push(`Migrando datos de versión ${version} a ${SCHEMA_VERSION}.`);
    // Always normalize keys (Spanish → English, snake_case → camelCase)
    const d = normalizeImportKeys(raw);
    return { data: d, warnings };
}
