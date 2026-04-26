export type ItemType = "income_fixed" | "expense_fixed" | "expense_variable" | "saving_fixed";
export type Frequency = "monthly" | "weekly" | "yearly" | "one_time";
export type Priority = "low" | "medium" | "high";

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
  payDay?: number;
  icon?: IconRef;
}

export interface Transaction {
  id: string;
  type: "income" | "expense" | "saving";
  category: string;
  concept: string;
  amount: number;
  date: string; // ISO
  note?: string;
  icon?: IconRef;
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
}

export const TYPE_LABEL: Record<ItemType, string> = {
  income_fixed: "Ingreso fijo",
  expense_fixed: "Gasto fijo",
  expense_variable: "Gasto variable",
  saving_fixed: "Ahorro fijo",
};

export const FREQ_LABEL: Record<Frequency, string> = {
  monthly: "Mensual",
  weekly: "Semanal",
  yearly: "Anual",
  one_time: "Una vez",
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
  }
}

/** Whether a fixed item is "active" in a given (year, month) based on its date range and frequency. */
export function isFixedActiveInMonth(item: FixedItem, year: number, month: number): boolean {
  if (!item.active) return false;
  const start = new Date(item.startDate);
  const end = new Date(item.endDate);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  if (end < monthStart || start > monthEnd) return false;
  if (item.frequency === "yearly") {
    return start.getMonth() === month;
  }
  if (item.frequency === "one_time") {
    return start.getFullYear() === year && start.getMonth() === month;
  }
  return true;
}

export function fmt(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

export function fmt2(n: number): string {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
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

export const emojiFor = (cat: string) => CATEGORY_EMOJI[cat] ?? "💸";

/** Resolve display info for any record that might carry an icon. */
export function iconFor(rec: { icon?: IconRef; category?: string; emoji?: string }): IconRef {
  if (rec.icon) return rec.icon;
  if (rec.emoji) return { kind: "emoji", value: rec.emoji };
  return { kind: "emoji", value: emojiFor(rec.category ?? "") };
}
