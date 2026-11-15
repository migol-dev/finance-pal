// Catálogo centralizado de query keys tipadas.
// Catálogo centralizado de query keys tipadas (incluye `userSettings`).
// Sin imports externos. Solo exports de constantes.

import type { QueryClient } from '@tanstack/react-query';

export const financeKeys = {
  all: ['finance'] as const,
  accounts: () => ['accounts'] as const,
  transactions: () => ['transactions'] as const,
  fixedItems: () => ['fixed_items'] as const,
  goals: () => ['goals'] as const,
  goalFolders: () => ['goal_folders'] as const,
  debts: () => ['debts'] as const,
  userSettings: (userId: string) => ['user_settings', userId] as const,
  receiptUrl: (path: string) => ['receipt_url', path] as const,
} as const;

export const ALL_FINANCE_ENTITY_KEYS = [
  financeKeys.accounts(),
  financeKeys.transactions(),
  financeKeys.fixedItems(),
  financeKeys.goals(),
  financeKeys.goalFolders(),
  financeKeys.debts(),
] as const;

export async function invalidateAllFinanceEntityQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    ...ALL_FINANCE_ENTITY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    queryClient.invalidateQueries({ queryKey: financeKeys.all }),
  ]);
}

export type FinanceQueryKey =
  | typeof financeKeys.all
  | ReturnType<typeof financeKeys.accounts>
  | ReturnType<typeof financeKeys.transactions>
  | ReturnType<typeof financeKeys.fixedItems>
  | ReturnType<typeof financeKeys.goals>
  | ReturnType<typeof financeKeys.goalFolders>
  | ReturnType<typeof financeKeys.debts>
  | ReturnType<typeof financeKeys.userSettings>
  | ReturnType<typeof financeKeys.receiptUrl>;
