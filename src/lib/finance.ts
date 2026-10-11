export type ItemType = "income_fixed" | "expense_fixed" | "expense_variable" | "saving_fixed";
export type Frequency =
  | "monthly"
  | "biweekly"
  | "weekly"
  | "yearly"
  | "one_time"
  | "bimonthly"
  | "quarterly"
  | "fourmonthly"
  | "biannual";
export type Priority = "low" | "medium" | "high";
export type PaymentMethod = "cash" | "transfer" | "card" | "other";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

export const PAYMENT_METHOD_EMOJI: Record<PaymentMethod, string> = {
  cash: "💵",
  transfer: "🏦",
  card: "💳",
  other: "🔁",
};

export type AccountType = "bank" | "cash" | "other";

export interface Denomination {
  value: number;
  count: number;
  kind?: "bill" | "coin";
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance?: number;
  currency?: string;
  /** For cash accounts: list of denominations (bills/coins) */
  denominations?: Denomination[];
  // Optional bank metadata for bank accounts
  clabe?: string;       // 18-digit CLABE interbancaria
  bank?: string;        // Bank name / institución
  holderName?: string;  // Titular de la cuenta
}

/** Visual identity: either an emoji OR a cropped image (dataURL) */
export interface IconRef {
  kind: "emoji" | "image";
  value: string; // emoji char or dataURL
}

export interface FixedItem {
  id: string;
  type: ItemType;
  category: string;
  concept: string;
  amount: number;
  frequency: Frequency;
  active: boolean;
  note?: string;
  startDate: string;
  endDate: string;
  priority: Priority;
  payDay?: number;     // day of month (1-31) - optional
  payWeekDay?: number; // day of week (0=Sunday..6=Saturday) - optional
  icon?: IconRef;
  paymentMethod?: PaymentMethod;
  accountId?: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense" | "saving" | "transfer";
  category: string;
  concept: string;
  amount: number;
  date: string; // ISO
  note?: string;
  icon?: IconRef;
  paymentMethod?: PaymentMethod;
  fixedId?: string; // optional reference to originating FixedItem
  accountId?: string; // optional reference to an Account
  // For transfers: destination account id (internal) or external payee info
  transferToAccountId?: string;
  externalPayee?: { clabe?: string; bank?: string; name?: string };
  // Optional receipt image as data URL or filesystem path
  receipt?: string;
}

export interface GoalFolder {
  id: string;
  name: string;
  color: string;
  icon?: IconRef;
  parentId?: string;
  order: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  emoji: string;
  color: string;
  deadline?: string;
  icon?: IconRef;
  purchaseUrl?: string;
  contributions?: { id: string; date: string; amount: number }[];
  createdAt?: string;
  pinned?: boolean;
  folderId?: string;
}

/** Records a payment received against a debt */
export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  /** For transfers: destination account id (internal) or external payee info */
  transferToAccountId?: string;
  externalPayee?: { clabe?: string; bank?: string; name?: string };
  /** Optional receipt image as data URL or filesystem path */
  receipt?: string;
}

/** Money someone owes you */
export interface Debt {
  id: string;
  person: string;
  concept: string;
  amount: number;       // total owed
  date: string;         // when the debt was created
  dueDate?: string;
  note?: string;
  icon?: IconRef;
  payments: DebtPayment[];
  accountId?: string;
}

export type ChangeAction = "create" | "update" | "delete";
export type ChangeEntity = "transaction" | "fixed" | "goal" | "debt";

export interface ChangeLogEntry {
  id: string;
  at: string;            // ISO
  entity: ChangeEntity;
  entityId: string;
  action: ChangeAction;
  label: string;         // human readable summary
  changes?: { field: string; from?: unknown; to?: unknown }[];
}

export const TYPE_LABEL: Record<ItemType | "transfer", string> = {
  income_fixed: "Ingreso fijo",
  expense_fixed: "Gasto fijo",
  expense_variable: "Gasto variable",
  saving_fixed: "Ahorro fijo",
  transfer: "Traspaso",
};

export const FREQ_LABEL: Record<Frequency, string> = {
  monthly: "Mensual",
  biweekly: "Quincenal",
  weekly: "Semanal",
  yearly: "Anual",
  one_time: "Una vez",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  fourmonthly: "Cuatrimestral",
  biannual: "Semestral",
};

export const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export function monthlyAmount(item: FixedItem): number {
  if (!item || !item.active) return 0;
  switch (item.frequency) {
    case "monthly": return item.amount;
    case "biweekly": return item.amount * 2;
    case "weekly": return item.amount * 4.345;
    case "yearly": return item.amount / 12;
    case "one_time": return 0;
    case "bimonthly": return item.amount / 2;
    case "quarterly": return item.amount / 3;
    case "fourmonthly": return item.amount / 4;
    case "biannual": return item.amount / 6;
    default:
      if ((item.frequency as string) === "annual") return item.amount / 12;
      return 0;
  }
}

/** Whether a fixed item is "active" in a given (year, month) based on its date range and frequency. */
export function isFixedActiveInMonth(item: FixedItem, year: number, month: number): boolean {
  if (!item.active) return false;
  const start = parseDateLocal(item.startDate);
  const end = parseDateLocal(item.endDate);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  if (end < monthStart || start > monthEnd) return false;
  const freq = (item.frequency as string) === "annual" ? "yearly" : item.frequency;
  if (freq === "yearly") {
    return start.getMonth() === month;
  }
  if (freq === "one_time") {
    return start.getFullYear() === year && start.getMonth() === month;
  }
  // Periodic frequencies that hit only on certain months relative to startDate
  const monthsSinceStart = (year - start.getFullYear()) * 12 + (month - start.getMonth());
  if (monthsSinceStart < 0) return false;
  if (freq === "bimonthly") return monthsSinceStart % 2 === 0;
  if (freq === "quarterly") return monthsSinceStart % 3 === 0;
  if (freq === "fourmonthly") return monthsSinceStart % 4 === 0;
  if (freq === "biannual") return monthsSinceStart % 6 === 0;
  return true;
}

/**
 * Genera un UUID v4 determinístico a partir de fixedId y la fecha YYYY-MM-DD (occISO).
 * Garantiza idempotencia en memoria local y en upserts hacia Supabase/Postgres.
 */
export function buildScheduledTxId(fixedId: string, occISO: string): string {
  const input = `scheduled:${fixedId}:${occISO}`;
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const hashes = seeds.map((seed, idx) => {
    let h = seed ^ (idx * 0x27d4eb2d);
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
      h ^= h >>> 16;
    }
    return h >>> 0;
  });
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 4; i++) {
    const val = hashes[i];
    bytes[i * 4] = (val >>> 24) & 0xff;
    bytes[i * 4 + 1] = (val >>> 16) & 0xff;
    bytes[i * 4 + 2] = (val >>> 8) & 0xff;
    bytes[i * 4 + 3] = val & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Evalúa un concepto fijo activo y devuelve las transacciones programadas del periodo actual
 * cuya fecha de cobro ya llegó o ya pasó (<= today) y que aún no existen en `transactions`.
 */
export function getDueOccurrencesForFixedItem(
  f: FixedItem,
  transactions: Transaction[],
  now: Date = new Date(),
): Transaction[] {
  if (!f.active) return [];
  const amount = Number(f.amount);
  if (!Number.isFinite(amount) || amount <= 0) return [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const start = parseDateLocal(f.startDate);
  const end = parseDateLocal(f.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const todayISO = toYMD(today);
  const startISO = toYMD(start);
  const endISO = toYMD(end);

  if (todayISO < startISO || todayISO > endISO) return [];

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const freq = (f.frequency as string) === "annual" ? "yearly" : f.frequency;
  const isSinglePerMonthFreq = [
    "monthly",
    "bimonthly",
    "quarterly",
    "fourmonthly",
    "biannual",
    "yearly",
    "one_time",
  ].includes(freq);

  const candidateDates: Date[] = [];

  if (freq === "weekly" && typeof f.payWeekDay === "number" && Number.isFinite(f.payWeekDay)) {
    const daysSincePayDay = (today.getDay() - f.payWeekDay + 7) % 7;
    const occDate = new Date(year, month, today.getDate() - daysSincePayDay, 12, 0, 0);
    const occISO = toYMD(occDate);
    if (occISO >= startISO && occISO <= endISO) {
      candidateDates.push(occDate);
    }
  } else if (freq === "biweekly") {
    if (isFixedActiveInMonth(f, year, month)) {
      const rawPayDay = typeof f.payDay === "number" && Number.isFinite(f.payDay) ? f.payDay : 1;
      const baseDay = Math.min(Math.max(1, rawPayDay), daysInMonth);
      const firstHalfDay = baseDay <= 15 ? baseDay : Math.max(1, baseDay - 15);
      const secondHalfDay = Math.min(firstHalfDay + 15, daysInMonth);
      const biweeklyDays = Array.from(new Set([firstHalfDay, secondHalfDay])).sort((a, b) => a - b);
      for (const d of biweeklyDays) {
        if (today.getDate() >= d) {
          const occDate = new Date(year, month, d, 12, 0, 0);
          const occISO = toYMD(occDate);
          if (occISO >= startISO && occISO <= endISO) {
            candidateDates.push(occDate);
          }
        }
      }
    }
  } else if (
    ["monthly", "bimonthly", "quarterly", "fourmonthly", "biannual", "yearly"].includes(freq)
  ) {
    if (isFixedActiveInMonth(f, year, month)) {
      const rawPayDay =
        typeof f.payDay === "number" && Number.isFinite(f.payDay) ? f.payDay : start.getDate();
      const effectiveDay = Math.min(Math.max(1, rawPayDay), daysInMonth);
      if (today.getDate() >= effectiveDay) {
        const occDate = new Date(year, month, effectiveDay, 12, 0, 0);
        const occISO = toYMD(occDate);
        if (occISO <= endISO) {
          candidateDates.push(occDate);
        }
      }
    }
  } else if (freq === "one_time") {
    if (start.getFullYear() === year && start.getMonth() === month) {
      const rawPayDay =
        typeof f.payDay === "number" && Number.isFinite(f.payDay) ? f.payDay : start.getDate();
      const effectiveDay = Math.min(Math.max(1, rawPayDay), daysInMonth);
      if (today.getDate() >= effectiveDay) {
        const occDate = new Date(year, month, effectiveDay, 12, 0, 0);
        const occISO = toYMD(occDate);
        if (occISO >= startISO && occISO <= endISO) {
          candidateDates.push(occDate);
        }
      }
    }
  }

  let txType: Transaction["type"] = "expense";
  if (f.type === "income_fixed") txType = "income";
  else if (f.type === "saving_fixed") txType = "saving";

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validPayMethods: PaymentMethod[] = ["cash", "transfer", "card", "other"];

  const due: Transaction[] = [];
  for (const occDate of candidateDates) {
    const occISO = toYMD(occDate);
    const scheduledId = buildScheduledTxId(f.id, occISO);
    const already = transactions.some((t) => {
      if (t.id === scheduledId) return true;
      if (t.fixedId !== f.id) return false;
      const td = parseDateLocal(t.date ?? "");
      if (isNaN(td.getTime())) return false;
      if (toYMD(td) === occISO) return true;
      if (isSinglePerMonthFreq && td.getFullYear() === year && td.getMonth() === month) {
        return true;
      }
      return false;
    });
    if (already) continue;

    const validIcon =
      f.icon &&
      ((f.icon.kind === "emoji" && typeof f.icon.value === "string" && f.icon.value.length <= 8) ||
        (f.icon.kind === "image" &&
          typeof f.icon.value === "string" &&
          f.icon.value.startsWith("data:image/") &&
          f.icon.value.length <= 200000))
        ? { kind: f.icon.kind, value: f.icon.value }
        : undefined;

    due.push({
      id: scheduledId,
      type: txType,
      category: (f.category || "Otros").slice(0, 50),
      concept: (f.concept || "Concepto fijo").slice(0, 200),
      amount,
      date: occDate.toISOString(),
      note: f.note ? f.note.slice(0, 1000) : undefined,
      icon: validIcon,
      paymentMethod:
        f.paymentMethod && validPayMethods.includes(f.paymentMethod) ? f.paymentMethod : undefined,
      fixedId: uuidRe.test(f.id) ? f.id : undefined,
      accountId: f.accountId && uuidRe.test(f.accountId) ? f.accountId : undefined,
    });
  }

  return due;
}

export function fmt(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

export function fmt2(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

/** Format a date as dd/mm/yyyy (local) with safety check against Invalid Date */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? parseDateLocal(d) : d;
  if (!dt || isNaN(dt.getTime())) return "—";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Robustly parse a goal deadline string into a local Date at 12:00:00.
 * Handles bare YYYY-MM-DD as well as full ISO strings (e.g. 2026-05-10T00:00:00.000Z).
 * Returns null if deadline is missing or invalid.
 */
export function parseGoalDeadline(deadline?: string | null): Date | null {
  if (!deadline || typeof deadline !== "string") return null;
  const cleanDate = deadline.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const fallback = new Date(deadline);
    return isNaN(fallback.getTime()) ? null : fallback;
  }
  const dt = parseDateLocal(`${cleanDate}T12:00:00`);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Parse a stored date into a local `Date` object in a robust way.
 * - If the string includes a time component (`T` / `Z`), parse as an instant
 *   so local fields reflect the actual wall-clock date.
 * - If it's a date-only `YYYY-MM-DD`, construct with `new Date(year, month-1, day)`
 *   to avoid the inconsistent UTC parsing of bare date strings.
 */
export function parseDateLocal(d: string | Date): Date {
  if (d instanceof Date) return d;
  if (typeof d !== "string") return new Date(d);
  // If there's a time component, let Date parse the instant (so local fields are correct)
  if (d.includes("T") || d.includes("Z")) return new Date(d);
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(d);
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000));
}

/** Compute per-account balances by applying transactions to each account's initialBalance. */
export function computeBalances(accounts: Account[], transactions: Transaction[], debts: Debt[] = [], endDate?: Date) {
  const map: Record<string, number> = {};
  for (const a of accounts) map[a.id] = (a.initialBalance ?? 0);

  // Fallback helpers
  const cashAccount = accounts.find((x) => x.type === "cash");
  const bankAccount = accounts.find((x) => x.type === "bank") || cashAccount;
  const firstAccount = accounts[0];

  const getFallbackId = (method?: PaymentMethod) => {
    if (method === "cash") return cashAccount?.id;
    if (method === "transfer" || method === "card") return bankAccount?.id;
    // For "other" or undefined, default to cash if it exists
    return cashAccount?.id ?? firstAccount?.id;
  };

  const endTs = endDate ? endDate.getTime() : Infinity;

  for (const t of transactions) {
    const d = parseDateLocal(t.date);
    if (d.getTime() > endTs) continue;

    // Determine origin account: prefer explicit accountId, fall back based on payment method
    const originId = t.accountId ?? getFallbackId(t.paymentMethod);

    // Handle internal transfers specially: debit origin and credit destination
    if (t.type === "transfer" || t.transferToAccountId) {
      if (originId) {
        map[originId] = (map[originId] ?? 0) - Math.abs(t.amount);
      }
      // credit destination only if it exists among known accounts
      const destId = t.transferToAccountId;
      const destExists = destId && accounts.some((a) => a.id === destId);
      if (destExists) {
        map[destId!] = (map[destId!] ?? 0) + Math.abs(t.amount);
      }
      continue;
    }

    if (!originId || map[originId] === undefined) continue;

    // For normal transactions: incomes add, expenses and savings subtract
    const signed = (t.type === "income") ? Math.abs(t.amount) : -Math.abs(t.amount);
    map[originId] = (map[originId] ?? 0) + signed;
  }

  // Also include debt-related movements
  for (const d of debts) {
    const debtDate = parseDateLocal(d.date);
    if (debtDate.getTime() <= endTs) {
      // ONLY apply to balance if accountId is explicitly set for the debt creation
      // This prevents "surprise" negative balances from old debts with no account assigned.
      if (d.accountId && map[d.accountId] !== undefined) {
        map[d.accountId] -= d.amount;
      }
    }

    for (const p of d.payments) {
      const payDate = parseDateLocal(p.date);
      if (payDate.getTime() <= endTs) {
        // For payments, if no accountId is set, fall back to payment method
        const payAccountId = p.accountId ?? getFallbackId(p.paymentMethod);
        if (payAccountId && map[payAccountId] !== undefined) {
          map[payAccountId] += p.amount;
        }
      }
    }
  }

  return map;
}

export function cashTotalFromDenominations(denoms?: Denomination[]) {
  if (!Array.isArray(denoms) || denoms.length === 0) return 0;
  return denoms.reduce((acc, d) => acc + (d.value * (d.count || 0)), 0);
}

export const CATEGORY_EMOJI: Record<string, string> = {
  Trabajo: "💼", Servicios: "🛠️", Transporte: "⛽", Salud: "💪",
  Conectividad: "📱", "Apoyo familiar": "👨‍👩‍👧", Ocio: "🎉",
  Alimentación: "🛒", "Cuidado personal": "🧴", Entretenimiento: "🎵",
  Moto: "🏍️", Fondo: "🛟", Otros: "✨", Hogar: "🏠", Educación: "📚",
  Ropa: "👕", Café: "☕", Mascotas: "🐾", Regalos: "🎁", Deudas: "🤝",
};

export const COMMON_EMOJIS = [
  "💼","💰","💵","💸","🪙","🏦","💳","🧾","📈","📉",
  "🏠","🏡","🛋️","🛏️","🚿","💡","🔌","🔥","💧","🧹",
  "🛒","🍎","🍞","🥩","🥗","🍕","🍔","🍣","☕","🍻",
  "⛽","🚗","🚙","🏍️","🛵","🚲","🚌","🚕","✈️","🚆",
  "📱","💻","🖥️","🎧","📺","🎮","📷","🖨️","📡","💿",
  "💪","🏥","💊","🩺","🦷","🧴","💄","✂️","👕","👟",
  "🎉","🎂","🎁","🎵","🎬","🎟️","🎨","📚","✏️","🎓",
  "🐾","🐶","🐱","🌱","🌳","🌸","🛟","🧳","🏖️","⛰️",
];

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "blue" | "violet" | "emerald" | "rose" | "amber";
export type Currency = "MXN" | "USD" | "EUR" | "COP" | "ARS" | "CLP" | "PEN" | "BRL";

export interface UserProfile {
  name: string;
  email?: string;
  currency: Currency;
  avatar?: IconRef;
}

export type TextScale = "compact" | "normal" | "large" | "xlarge" | "custom";
export type ColorBlindMode = "none" | "protanopia" | "deuteranopia" | "tritanopia";

export interface AccessibilitySettings {
  textScale: TextScale;
  textScalePercent: number;
  highContrast: boolean;
  reduceMotion: boolean;
  dyslexicFont: boolean;
  underlineLinks: boolean;
  largeTouchTargets: boolean;
  colorBlindMode: ColorBlindMode;
  enhancedFocusRing: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textScale: "normal",
  textScalePercent: 100,
  highContrast: false,
  reduceMotion: false,
  dyslexicFont: false,
  underlineLinks: false,
  largeTouchTargets: false,
  colorBlindMode: "none",
  enhancedFocusRing: true,
};

export interface AppSettings {
  accentColor: AccentColor;
  compactMode: boolean;
  glassEffect: boolean;
  conflictResolved?: boolean;
  notifications: NotificationPreferences;
  accessibility: AccessibilitySettings;
}

export type NotificationRepeatFrequency = "daily" | "every_3_days" | "weekly" | "once";
export type NotificationPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface NotificationPreferences {
  enabled: boolean;
  pushEnabled: boolean;
  localEnabled: boolean;
  inAppToastEnabled: boolean;
  // Alertas de Metas (límites de fecha y atraso según el plan)
  goalDeadlineReminders: boolean;
  upcomingDays: number[];                    // ej. [7, 3, 1, 0] (0 = mismo día del vencimiento)
  overdueAlert: boolean;
  overdueRepeat: NotificationRepeatFrequency;
  behindPaceAlert: boolean;
  behindPaceRepeat: NotificationRepeatFrequency;
  behindPaceTolerancePct: number;            // porcentaje del objetivo (2, 5, 10)
  // Alertas de Conceptos Fijos / Recurrentes (gastos, ingresos, ahorros)
  fixedItemReminders: boolean;
  notifyFixedExpenses: boolean;
  notifyFixedIncomes: boolean;
  notifyFixedSavings: boolean;
  fixedUpcomingDays: number[];               // ej. [3, 1, 0] (días antes + día de cobro)
  skipIfAlreadyRecorded: boolean;
  // Horario, canal y privacidad
  preferredTime: string;                     // "HH:mm" (ej. "09:00")
  quietHoursEnabled: boolean;
  quietHours: { start: string; end: string }; // ej. { start: "22:00", end: "08:00" }
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  hideAmountsInNotifications: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  pushEnabled: true,
  localEnabled: true,
  inAppToastEnabled: true,
  goalDeadlineReminders: true,
  upcomingDays: [7, 3, 1, 0],
  overdueAlert: true,
  overdueRepeat: "every_3_days",
  behindPaceAlert: true,
  behindPaceRepeat: "weekly",
  behindPaceTolerancePct: 2,
  fixedItemReminders: true,
  notifyFixedExpenses: true,
  notifyFixedIncomes: true,
  notifyFixedSavings: true,
  fixedUpcomingDays: [3, 1, 0],
  skipIfAlreadyRecorded: true,
  preferredTime: "09:00",
  quietHoursEnabled: true,
  quietHours: { start: "22:00", end: "08:00" },
  soundEnabled: true,
  vibrationEnabled: true,
  hideAmountsInNotifications: false,
};

export interface GoalPaceInfo {
  remaining: number;
  days: number;
  perDay: number;
  perWeek: number;
  perMonth: number;
  overdue: boolean;
}

export interface GoalStatusInfo {
  kind: "done" | "behind" | "ahead" | "ontrack";
  diff: number;
  ideal: number;
  actual: number;
}

export interface FixedOccurrenceInfo {
  dueDate: Date;
  dueISO: string;
  daysUntil: number;
  alreadyRecorded: boolean;
  autoRecordedToday: boolean;
}

export function paceForGoal(goal: Goal, now: Date = new Date()): GoalPaceInfo | null {
  if (!goal.deadline) return null;
  const parsed = parseGoalDeadline(goal.deadline);
  if (!parsed) return null;
  const remaining = Math.max(0, goal.target - goal.saved);
  const today = startOfDay(now);
  const dl = startOfDay(parsed);
  const days = Math.max(1, daysBetween(today, dl) || 1);
  return {
    remaining,
    days,
    perDay: remaining / days,
    perWeek: remaining / (days / 7),
    perMonth: remaining / (days / 30),
    overdue: dl < today,
  };
}

export function expectedGoalAt(goal: Goal, date: Date): number {
  if (!goal.deadline) return goal.target;
  const parsed = parseGoalDeadline(goal.deadline);
  if (!parsed) return goal.target;
  const start = startOfDay(parseDateLocal(goal.createdAt ?? date.toISOString()));
  const dl = startOfDay(parsed);
  const total = Math.max(1, daysBetween(start, dl));
  const elapsed = Math.min(total, Math.max(0, daysBetween(start, date)));
  return (goal.target * elapsed) / total;
}

export function actualGoalAt(goal: Goal, date: Date): number {
  const end = startOfDay(date).getTime();
  const initial = goal.contributions && goal.contributions.length > 0 ? 0 : goal.saved;
  const sum = (goal.contributions ?? []).reduce((acc, c) => {
    const t = startOfDay(parseDateLocal(c.date)).getTime();
    return t <= end ? acc + c.amount : acc;
  }, 0);
  return Math.max(0, initial + sum);
}

export function statusForGoal(
  goal: Goal,
  tolerancePct: number = 2,
  now: Date = new Date(),
): GoalStatusInfo | null {
  if (goal.saved >= goal.target) {
    const actual = actualGoalAt(goal, now);
    const ideal = goal.deadline ? expectedGoalAt(goal, now) : goal.target;
    return { kind: "done", diff: actual - ideal, ideal, actual };
  }
  if (!goal.deadline) return null;
  const parsed = parseGoalDeadline(goal.deadline);
  if (!parsed) return null;
  const ideal = expectedGoalAt(goal, now);
  const actual = actualGoalAt(goal, now);
  const diff = actual - ideal;
  const safeTolerancePct = Number.isFinite(tolerancePct)
    ? Math.min(50, Math.max(0, tolerancePct))
    : 2;
  const tolerance = Math.max(50, goal.target * (safeTolerancePct / 100));
  if (diff < -tolerance) return { kind: "behind", diff, ideal, actual };
  if (diff > tolerance) return { kind: "ahead", diff, ideal, actual };
  return { kind: "ontrack", diff, ideal, actual };
}

export function getUpcomingOccurrencesForFixedItem(
  item: FixedItem,
  transactions: Transaction[] = [],
  now: Date = new Date(),
  maxCount: number = 2,
): FixedOccurrenceInfo[] {
  if (!item || !item.active) return [];
  const amount = Number(item.amount);
  if (!Number.isFinite(amount) || amount <= 0) return [];

  const pad = (n: number) => String(n).padStart(2, "0");
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const start = parseDateLocal(item.startDate);
  const end = parseDateLocal(item.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  const today = startOfDay(now);
  const startDay = startOfDay(start);
  const endDay = startOfDay(end);
  const todayISO = toYMD(today);
  const startISO = toYMD(startDay);
  const endISO = toYMD(endDay);

  if (todayISO > endISO) return [];

  const freq = (item.frequency as string) === "annual" ? "yearly" : item.frequency;
  const isSinglePerMonthFreq = [
    "monthly",
    "bimonthly",
    "quarterly",
    "fourmonthly",
    "biannual",
    "yearly",
    "one_time",
  ].includes(freq);

  const candidateDates: Date[] = [];

  if (freq === "weekly") {
    const payWeekDay =
      typeof item.payWeekDay === "number" && Number.isFinite(item.payWeekDay)
        ? ((Math.round(item.payWeekDay) % 7) + 7) % 7
        : startDay.getDay();
    const base = today > startDay ? today : startDay;
    const daysUntilFirst = (payWeekDay - base.getDay() + 7) % 7;
    const firstDate = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daysUntilFirst, 12, 0, 0);
    for (let w = 0; w < maxCount + 6 && candidateDates.length < maxCount; w++) {
      const cand = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate() + w * 7, 12, 0, 0);
      const candISO = toYMD(cand);
      if (candISO > endISO) break;
      if (candISO >= todayISO && candISO >= startISO) {
        candidateDates.push(cand);
      }
    }
  } else if (freq === "one_time") {
    const y = startDay.getFullYear();
    const m = startDay.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const rawPayDay =
      typeof item.payDay === "number" && Number.isFinite(item.payDay)
        ? item.payDay
        : startDay.getDate();
    const effDay = Math.min(Math.max(1, rawPayDay), daysInMonth);
    const cand = new Date(y, m, effDay, 12, 0, 0);
    const candISO = toYMD(cand);
    if (candISO >= todayISO && candISO >= startISO && candISO <= endISO) {
      candidateDates.push(cand);
    }
  } else if (freq === "biweekly") {
    for (let offset = 0; offset < 24 && candidateDates.length < maxCount; offset++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      if (new Date(y, m, 1) > endDay) break;
      if (!isFixedActiveInMonth(item, y, m)) continue;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const rawPayDay =
        typeof item.payDay === "number" && Number.isFinite(item.payDay) ? item.payDay : 1;
      const baseDay = Math.min(Math.max(1, rawPayDay), daysInMonth);
      const firstHalfDay = baseDay <= 15 ? baseDay : Math.max(1, baseDay - 15);
      const secondHalfDay = Math.min(firstHalfDay + 15, daysInMonth);
      const biweeklyDays = Array.from(new Set([firstHalfDay, secondHalfDay])).sort((a, b) => a - b);
      for (const d of biweeklyDays) {
        if (candidateDates.length >= maxCount) break;
        const cand = new Date(y, m, d, 12, 0, 0);
        const candISO = toYMD(cand);
        if (candISO >= todayISO && candISO >= startISO && candISO <= endISO) {
          candidateDates.push(cand);
        }
      }
    }
  } else if (isSinglePerMonthFreq) {
    for (let offset = 0; offset < 36 && candidateDates.length < maxCount; offset++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      if (new Date(y, m, 1) > endDay) break;
      if (!isFixedActiveInMonth(item, y, m)) continue;
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const rawPayDay =
        typeof item.payDay === "number" && Number.isFinite(item.payDay)
          ? item.payDay
          : startDay.getDate();
      const effDay = Math.min(Math.max(1, rawPayDay), daysInMonth);
      const cand = new Date(y, m, effDay, 12, 0, 0);
      const candISO = toYMD(cand);
      if (candISO >= todayISO && candISO <= endISO && (today >= startDay || candISO >= startISO)) {
        candidateDates.push(cand);
      }
    }
  }

  return candidateDates.map((cand) => {
    const dueDate = startOfDay(cand);
    const dueISO = toYMD(dueDate);
    const daysUntil = daysBetween(today, dueDate);
    const scheduledId = buildScheduledTxId(item.id, dueISO);

    const autoRecordedToday =
      dueISO === todayISO && transactions.some((t) => t.id === scheduledId);

    const alreadyRecorded = transactions.some((t) => {
      if (t.id === scheduledId) return true;
      if (t.fixedId !== item.id) return false;
      const td = parseDateLocal(t.date ?? "");
      if (isNaN(td.getTime())) return false;
      if (toYMD(td) === dueISO) return true;
      if (
        isSinglePerMonthFreq &&
        td.getFullYear() === dueDate.getFullYear() &&
        td.getMonth() === dueDate.getMonth()
      ) {
        return true;
      }
      return false;
    });

    return {
      dueDate,
      dueISO,
      daysUntil,
      alreadyRecorded,
      autoRecordedToday,
    };
  });
}

export const emojiFor = (cat: string) => CATEGORY_EMOJI[cat] ?? "💸";

/** Resolve display info for any record that might carry an icon. */
export function iconFor(rec: { icon?: IconRef; category?: string; emoji?: string }): IconRef {
  if (rec.icon) return rec.icon;
  if (rec.emoji) return { kind: "emoji", value: rec.emoji };
  return { kind: "emoji", value: emojiFor(rec.category ?? "") };
}

