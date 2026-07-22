export type ItemType = "income_fixed" | "expense_fixed" | "expense_variable" | "saving_fixed";
export type Frequency = "monthly" | "weekly" | "yearly" | "one_time" | "bimonthly" | "quarterly" | "fourmonthly" | "biannual";
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
  payDay?: number;     // day of month (1-28) - optional
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

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  emoji: string;          // legacy fallback
  color: string;          // tailwind gradient utility class
  deadline?: string;
  icon?: IconRef;         // new — preferred
  purchaseUrl?: string;
  /** Per-contribution log used for charts and calendar views. */
  contributions?: { id: string; date: string; amount: number }[];
  /** When the goal was created — used as the start of the ideal plan. */
  createdAt?: string;
  pinned?: boolean; // show as main goal on dashboard
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
  if (!item.active) return 0;
  switch (item.frequency) {
    case "monthly": return item.amount;
    case "weekly": return item.amount * 4.345;
    case "yearly": return item.amount / 12;
    case "one_time": return 0;
    case "bimonthly": return item.amount / 2;
    case "quarterly": return item.amount / 3;
    case "fourmonthly": return item.amount / 4;
    case "biannual": return item.amount / 6;
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
  if (item.frequency === "yearly") {
    return start.getMonth() === month;
  }
  if (item.frequency === "one_time") {
    return start.getFullYear() === year && start.getMonth() === month;
  }
  // Periodic frequencies that hit only on certain months relative to startDate
  const monthsSinceStart = (year - start.getFullYear()) * 12 + (month - start.getMonth());
  if (monthsSinceStart < 0) return false;
  if (item.frequency === "bimonthly") return monthsSinceStart % 2 === 0;
  if (item.frequency === "quarterly") return monthsSinceStart % 3 === 0;
  if (item.frequency === "fourmonthly") return monthsSinceStart % 4 === 0;
  if (item.frequency === "biannual") return monthsSinceStart % 6 === 0;
  return true;
}

export function fmt(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

export function fmt2(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

/** Format a date as dd/mm/yy (local) */
export function fmtDate(d: string | Date): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
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
  Ropa: "👕", Café: "☕", Mascotas: "🐾", Regalos: "🎁",
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

export type ThemeMode = "light" | "dark";
export type AccentColor = "blue" | "violet" | "emerald" | "rose" | "amber";
export type Currency = "MXN" | "USD" | "EUR" | "COP" | "ARS" | "CLP" | "PEN" | "BRL";

export interface UserProfile {
  name: string;
  email?: string;
  currency: Currency;
  avatar?: IconRef;
}

export interface AppSettings {
  accentColor: AccentColor;
  compactMode: boolean;
  glassEffect: boolean;
  conflictResolved?: boolean;
}

export const emojiFor = (cat: string) => CATEGORY_EMOJI[cat] ?? "💸";

/** Resolve display info for any record that might carry an icon. */
export function iconFor(rec: { icon?: IconRef; category?: string; emoji?: string }): IconRef {
  if (rec.icon) return rec.icon;
  if (rec.emoji) return { kind: "emoji", value: rec.emoji };
  return { kind: "emoji", value: emojiFor(rec.category ?? "") };
}
