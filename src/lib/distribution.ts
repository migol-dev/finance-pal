import type { Account, Denomination } from "./finance";

export const CHART_COLOR_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

export interface DistributionSlice {
  id: string;
  label: string;
  sublabel?: string;
  amount: number;
  count?: number;
  percentage: number;
  colorVar: string;
}

export interface AccountsDistributionResult {
  total: number;
  slices: DistributionSlice[];
  excludedNegativeCount: number;
}

export interface DenominationsDistributionResult {
  total: number;
  totalPieces: number;
  slices: DistributionSlice[];
}

/**
 * Calcula porcentajes con 1 decimal asegurando suma exacta a 100.0%
 * mediante el método del resto mayor (largest remainder).
 */
function distributePercentages(amounts: number[], total: number): number[] {
  if (amounts.length === 0 || total <= 0) {
    return amounts.map(() => 0);
  }
  const targetUnits = 1000; // décimas de porcentaje (1000 => 100.0%)
  const exactUnits = amounts.map((a) => (a / total) * targetUnits);
  const floored = exactUnits.map((v) => Math.floor(v));
  let remainder = targetUnits - floored.reduce((acc, v) => acc + v, 0);

  const byRemainder = exactUnits
    .map((v, idx) => ({ idx, frac: v - floored[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < byRemainder.length && remainder > 0; i++) {
    floored[byRemainder[i].idx] += 1;
    remainder -= 1;
  }

  return floored.map((u) => u / 10);
}

/**
 * Calcula la distribución porcentual y monetaria de las cuentas con saldo positivo.
 * Excluye cuentas en saldo 0 o negativo (reportando `excludedNegativeCount` para aviso UI).
 */
export function computeAccountsDistribution(
  accounts: Account[],
  balances: Record<string, number>
): AccountsDistributionResult {
  let excludedNegativeCount = 0;
  const positive: Array<{ acc: Account; amount: number }> = [];

  for (const acc of accounts) {
    const raw = balances[acc.id] ?? acc.initialBalance ?? 0;
    const amount = Number.isFinite(raw) ? raw : 0;
    if (amount < 0) {
      excludedNegativeCount += 1;
      continue;
    }
    if (amount > 0) {
      positive.push({ acc, amount });
    }
  }

  positive.sort((a, b) => b.amount - a.amount);
  const total = positive.reduce((sum, item) => sum + item.amount, 0);
  const percentages = distributePercentages(
    positive.map((p) => p.amount),
    total
  );

  const slices: DistributionSlice[] = positive.map((item, idx) => ({
    id: item.acc.id,
    label: item.acc.name,
    sublabel:
      item.acc.type === "cash"
        ? "Efectivo"
        : item.acc.type === "bank"
        ? "Cuenta bancaria"
        : "Otra cuenta",
    amount: item.amount,
    percentage: percentages[idx] ?? 0,
    colorVar: CHART_COLOR_VARS[idx % CHART_COLOR_VARS.length],
  }));

  return { total, slices, excludedNegativeCount };
}

/**
 * Calcula la distribución del desglose físico de efectivo por denominación (billetes y monedas),
 * incluyendo cantidad de piezas, importe subtotal y porcentaje del total físico.
 */
export function computeDenominationsDistribution(
  denominations?: Denomination[]
): DenominationsDistributionResult {
  if (!denominations || denominations.length === 0) {
    return { total: 0, totalPieces: 0, slices: [] };
  }

  const active = denominations
    .filter((d) => Number.isFinite(d.value) && d.value > 0 && Number.isFinite(d.count) && d.count > 0)
    .map((d, idx) => {
      const kind = d.kind === "coin" ? "coin" : "bill";
      return {
        key: `${kind}-${d.value}-${idx}`,
        kind,
        value: d.value,
        count: d.count,
        amount: d.value * d.count,
      };
    })
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return b.value - a.value;
    });

  const total = active.reduce((sum, item) => sum + item.amount, 0);
  const totalPieces = active.reduce((sum, item) => sum + item.count, 0);
  const percentages = distributePercentages(
    active.map((a) => a.amount),
    total
  );

  const slices: DistributionSlice[] = active.map((item, idx) => ({
    id: item.key,
    label: `${item.kind === "coin" ? "Moneda" : "Billete"} $${item.value}`,
    sublabel: `${item.count} ${item.count === 1 ? "pieza" : "piezas"}`,
    amount: item.amount,
    count: item.count,
    percentage: percentages[idx] ?? 0,
    colorVar: CHART_COLOR_VARS[idx % CHART_COLOR_VARS.length],
  }));

  return { total, totalPieces, slices };
}
