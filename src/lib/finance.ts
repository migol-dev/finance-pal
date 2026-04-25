export type ItemType = "income_fixed" | "expense_fixed" | "expense_variable" | "saving_fixed";
export type Frequency = "monthly" | "weekly" | "yearly" | "one_time";
export type Priority = "low" | "medium" | "high";

export interface FixedItem {
  id: string;
  type: ItemType;
  category: string;
  concept: string;
  amount: number;
  frequency: Frequency;
  active: boolean;
  note?: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  priority: Priority;
  payDay?: number;   // day of month for reminders 1-28
}

export interface Transaction {
  id: string;
  type: "income" | "expense" | "saving";
  category: string;
  concept: string;
  amount: number;
  date: string; // ISO
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  emoji: string;
  color: string; // tailwind gradient utility class
  deadline?: string;
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

export function monthlyAmount(item: FixedItem): number {
  if (!item.active) return 0;
  switch (item.frequency) {
    case "monthly": return item.amount;
    case "weekly": return item.amount * 4.345;
    case "yearly": return item.amount / 12;
    case "one_time": return 0;
  }
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

export const emojiFor = (cat: string) => CATEGORY_EMOJI[cat] ?? "💸";
