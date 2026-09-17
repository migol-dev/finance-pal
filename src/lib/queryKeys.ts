// Catálogo centralizado de query keys tipadas.
// Catálogo centralizado de query keys tipadas (incluye `userSettings`).
// Sin imports externos. Solo exports de constantes.

export const financeKeys = {
  all: ['finance'] as const,
  accounts: () => ['accounts'] as const,
  transactions: () => ['transactions'] as const,
  fixedItems: () => ['fixed_items'] as const,
  goals: () => ['goals'] as const,
  goalFolders: () => ['goal_folders'] as const,
  debts: () => ['debts'] as const,
  userSettings: (userId: string) => ['user_settings', userId] as const,
} as const;

export type FinanceQueryKey =
  | typeof financeKeys.all
  | ReturnType<typeof financeKeys.accounts>
  | ReturnType<typeof financeKeys.transactions>
  | ReturnType<typeof financeKeys.fixedItems>
  | ReturnType<typeof financeKeys.goals>
  | ReturnType<typeof financeKeys.goalFolders>
  | ReturnType<typeof financeKeys.userSettings>;
