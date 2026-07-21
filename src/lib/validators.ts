import { z } from 'zod';
import { 
  ItemType, Frequency, Priority, PaymentMethod, AccountType, 
  ChangeAction, ChangeEntity, IconRef, Denomination,
  Currency, ThemeMode
} from '@/lib/finance';

const iconRefSchema: z.ZodType<IconRef> = z.object({
  kind: z.enum(['emoji', 'image']),
  value: z.string().max(5000),
}).refine(
  (v) => v.kind === 'emoji' ? v.value.length <= 8 : v.value.startsWith('data:image/'),
  { message: 'Invalid icon format' }
);

const denominationSchema: z.ZodType<Denomination> = z.object({
  value: z.number().positive().finite(),
  count: z.number().int().nonnegative().max(10000),
  kind: z.enum(['bill', 'coin']).optional(),
});

const paymentMethodSchema = z.enum(['cash', 'transfer', 'card', 'other']) satisfies z.ZodEnum<[PaymentMethod, ...PaymentMethod[]]>;
const itemTypeSchema = z.enum(['income_fixed', 'expense_fixed', 'expense_variable', 'saving_fixed']) satisfies z.ZodEnum<[ItemType, ...ItemType[]]>;
const frequencySchema = z.enum(['monthly', 'weekly', 'yearly', 'one_time', 'bimonthly', 'quarterly', 'fourmonthly', 'biannual']) satisfies z.ZodEnum<[Frequency, ...Frequency[]]>;
const prioritySchema = z.enum(['low', 'medium', 'high']) satisfies z.ZodEnum<[Priority, ...Priority[]]>;
const accountTypeSchema = z.enum(['bank', 'cash', 'other']) satisfies z.ZodEnum<[AccountType, ...AccountType[]]>;
const transactionTypeSchema = z.enum(['income', 'expense', 'saving', 'transfer']);
const changeActionSchema = z.enum(['create', 'update', 'delete']) satisfies z.ZodEnum<[ChangeAction, ...ChangeAction[]]>;
const changeEntitySchema = z.enum(['transaction', 'fixed', 'goal', 'debt']) satisfies z.ZodEnum<[ChangeEntity, ...ChangeEntity[]]>;
const currencySchema = z.enum(['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'BRL']) satisfies z.ZodEnum<[Currency, ...Currency[]]>;
const themeModeSchema = z.enum(['light', 'dark']) satisfies z.ZodEnum<[ThemeMode, ...ThemeMode[]]>;

export const accountSchema = z.object({
  id: z.string().uuid({ message: 'Invalid account ID format' }),
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
  type: accountTypeSchema,
  initialBalance: z.number().finite().optional(),
  currency: currencySchema.optional(),
  denominations: z.array(denominationSchema).max(50).optional(),
  clabe: z.string().regex(/^\d{18}$/, 'CLABE must be 18 digits').optional(),
  bank: z.string().max(100).optional(),
  holderName: z.string().max(100).optional(),
}).strict();

export const transactionSchema = z.object({
  id: z.string().uuid({ message: 'Invalid transaction ID format' }),
  type: transactionTypeSchema,
  category: z.string().min(1).max(50),
  concept: z.string().min(1, 'Concept required').max(200, 'Concept too long'),
  amount: z.number().positive().finite().max(1e12, 'Amount too large'),
  date: z.string().datetime({ offset: true, local: true }).or(z.string().date()),
  note: z.string().max(1000).optional(),
  icon: iconRefSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  fixedId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  transferToAccountId: z.string().uuid().optional(),
  externalPayee: z.object({
    clabe: z.string().regex(/^\d{18}$/).optional(),
    bank: z.string().max(100).optional(),
    name: z.string().max(100).optional(),
  }).strict().optional(),
  receipt: z.string().max(10000000).optional(),
}).strict();

export const fixedItemSchema = z.object({
  id: z.string().uuid({ message: 'Invalid fixed item ID format' }),
  type: itemTypeSchema,
  category: z.string().min(1).max(50),
  concept: z.string().min(1, 'Concept required').max(200, 'Concept too long'),
  amount: z.number().positive().finite().max(1e12),
  frequency: frequencySchema,
  active: z.boolean(),
  note: z.string().max(1000).optional(),
  startDate: z.string().datetime({ offset: true, local: true }).or(z.string().date()),
  endDate: z.string().datetime({ offset: true, local: true }).or(z.string().date()),
  priority: prioritySchema,
  payDay: z.number().int().min(1).max(28).optional(),
  payWeekDay: z.number().int().min(0).max(6).optional(),
  icon: iconRefSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
  accountId: z.string().uuid().optional(),
}).strict().refine(
  (data) => {
    if (data.frequency === 'monthly' || data.frequency === 'bimonthly' || 
        data.frequency === 'quarterly' || data.frequency === 'fourmonthly' || 
        data.frequency === 'biannual') {
      return data.payDay !== undefined && data.payDay >= 1 && data.payDay <= 28;
    }
    if (data.frequency === 'weekly') {
      return data.payWeekDay !== undefined && data.payWeekDay >= 0 && data.payWeekDay <= 6;
    }
    return true;
  },
  { message: 'payDay required for monthly frequencies (1-28), payWeekDay for weekly (0-6)', path: ['payDay'] }
);

export const goalSchema = z.object({
  id: z.string().uuid({ message: 'Invalid goal ID format' }),
  name: z.string().min(1, 'Name required').max(100, 'Name too long'),
  target: z.number().positive().finite().max(1e12),
  saved: z.number().nonnegative().finite().max(1e12),
  emoji: z.string().max(8).default('🎯'),
  color: z.string().max(50).default('gradient-primary'),
  deadline: z.string().date().optional(),
  icon: iconRefSchema.optional(),
  purchaseUrl: z.string().url('Invalid URL').max(500).optional().or(z.literal('')),
  contributions: z.array(z.object({
    id: z.string().uuid(),
    date: z.string().datetime({ offset: true, local: true }).or(z.string().date()),
    amount: z.number().finite().max(1e12),
  })).max(10000).optional(),
  createdAt: z.string().datetime({ offset: true, local: true }).optional(),
  pinned: z.boolean().optional(),
}).strict();

export const debtPaymentSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive().finite().max(1e12),
  date: z.string().datetime({ offset: true, local: true }).or(z.string().date()),
  note: z.string().max(500).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  accountId: z.string().uuid().optional(),
}).strict();

export const debtSchema = z.object({
  id: z.string().uuid({ message: 'Invalid debt ID format' }),
  person: z.string().min(1, 'Person required').max(100, 'Name too long'),
  concept: z.string().min(1).max(200),
  amount: z.number().positive().finite().max(1e12),
  date: z.string().datetime({ offset: true, local: true }).or(z.string().date()),
  dueDate: z.string().date().optional(),
  note: z.string().max(1000).optional(),
  icon: iconRefSchema.optional(),
  payments: z.array(debtPaymentSchema).max(1000),
  accountId: z.string().uuid().optional(),
}).strict();

export const changeLogEntrySchema = z.object({
  id: z.string().uuid(),
  at: z.string().datetime({ offset: true }),
  entity: changeEntitySchema,
  entityId: z.string().uuid(),
  action: changeActionSchema,
  label: z.string().min(1).max(200),
  changes: z.array(z.object({
    field: z.string().max(50),
    from: z.unknown().optional(),
    to: z.unknown().optional(),
  })).max(50).optional(),
}).strict();

export const userProfileSchema = z.object({
  name: z.string().min(1, 'Name required').max(50, 'Name too long'),
  email: z.string().email('Invalid email').max(254).optional(),
  currency: currencySchema,
  avatar: iconRefSchema.optional(),
}).strict();

export const exportDataSchema = z.object({
  app: z.literal('finance-pal').or(z.literal('migol-finanzas')),
  version: z.number().int().positive(),
  exportedAt: z.string().datetime({ offset: true }),
  scopes: z.object({
    fixedItems: z.boolean(),
    transactions: z.boolean(),
    accounts: z.boolean(),
    goals: z.boolean(),
    debts: z.boolean(),
    changeLog: z.boolean(),
    theme: z.boolean(),
    profile: z.boolean(),
  }),
  data: z.object({
    fixedItems: z.array(fixedItemSchema).optional(),
    transactions: z.array(transactionSchema).optional(),
    accounts: z.array(accountSchema).optional(),
    goals: z.array(goalSchema).optional(),
    debts: z.array(debtSchema).optional(),
    changeLog: z.array(changeLogEntrySchema).optional(),
    theme: themeModeSchema.optional(),
    profile: userProfileSchema.optional(),
  }).strict(),
}).strict();

export function validateEntity<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: result.error };
}

export function sanitizeForLog(data: unknown, maxLength: number = 200): string {
  try {
    const str = JSON.stringify(data);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '... [truncated]';
  } catch {
    return '[unserializable]';
  }
}

export const validationSchemas = {
  account: accountSchema,
  transaction: transactionSchema,
  fixedItem: fixedItemSchema,
  goal: goalSchema,
  debt: debtSchema,
  debtPayment: debtPaymentSchema,
  changeLogEntry: changeLogEntrySchema,
  userProfile: userProfileSchema,
  exportData: exportDataSchema,
} as const;

export type ValidationSchemas = typeof validationSchemas;