import { z } from 'zod';

const uuidString = z.string().uuid();
const isoDateTimeString = z
  .string()
  .min(8)
  .max(40)
  .describe('Fecha en formato ISO 8601 (ej. 2026-11-15T12:00:00Z o 2026-11-15).');
const positiveAmount = z.number().finite().positive().max(1_000_000_000);
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(4)
  .max(128)
  .optional()
  .describe('Clave idempotente opcional para evitar duplicados ante reintentos.');

export const getFinancialOverviewSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional().describe('Año calendario (ej. 2026). Por defecto el actual.'),
  month: z
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe('Mes calendario 1-12 (ej. 11 para noviembre). Por defecto el actual.'),
}).shape;

export const listAccountsSchema = z.object({}).shape;

export const listTransactionsSchema = z.object({
  start_date: isoDateTimeString.optional().describe('Inicio del rango (máximo 90 días hasta end_date).'),
  end_date: isoDateTimeString.optional().describe('Fin del rango en ISO 8601.'),
  type: z.enum(['income', 'expense', 'saving', 'transfer']).optional().describe('Tipo de movimiento.'),
  category: z.string().trim().min(1).max(60).optional().describe('Categoría exacta del movimiento.'),
  account_id: uuidString.optional().describe('Filtrar por UUID de cuenta origen.'),
  search: z.string().trim().min(1).max(80).optional().describe('Búsqueda parcial por concepto.'),
  limit: z.number().int().min(1).max(50).optional().describe('Cantidad máxima (1-50, por defecto 25).'),
  offset: z.number().int().min(0).max(5000).optional().describe('Desplazamiento para paginación.'),
}).shape;

export const getSpendingByCategorySchema = z.object({
  start_date: isoDateTimeString.optional().describe('Inicio del rango (máximo 90 días).'),
  end_date: isoDateTimeString.optional().describe('Fin del rango en ISO 8601.'),
}).shape;

export const listFixedItemsSchema = z.object({
  active_only: z.boolean().optional().describe('Si true, devuelve solo fijos activos. Por defecto true.'),
}).shape;

export const listGoalsSchema = z.object({}).shape;

export const listDebtsSchema = z.object({}).shape;

export const getBudget602020StatusSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional().describe('Año calendario.'),
  month: z.number().int().min(1).max(12).optional().describe('Mes calendario 1-12.'),
}).shape;

export const createTransactionSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  type: z.enum(['income', 'expense', 'saving', 'transfer']).describe('Tipo de movimiento.'),
  category: z.string().trim().min(1).max(60).describe('Categoría del movimiento (ej. Alimentación, Salario).'),
  concept: z.string().trim().min(1).max(140).describe('Concepto corto del movimiento.'),
  amount: positiveAmount.describe('Monto positivo mayor a 0.'),
  date: isoDateTimeString.optional().describe('Fecha del movimiento en ISO 8601. Por defecto ahora.'),
  account_id: uuidString.optional().describe('UUID de la cuenta asociada.'),
  transfer_to_account_id: uuidString
    .optional()
    .describe('UUID de cuenta destino (obligatorio y distinto a account_id cuando type=transfer).'),
  payment_method: z
    .enum(['cash', 'transfer', 'card', 'other'])
    .optional()
    .describe('Método de pago (efectivo solo cash; banco solo card o transfer).'),
  note: z.string().trim().max(500).optional().describe('Nota adicional opcional.'),
}).shape;

export const updateTransactionSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  transaction_id: uuidString.describe('UUID del movimiento existente (no programado).'),
  category: z.string().trim().min(1).max(60).optional().describe('Nueva categoría.'),
  concept: z.string().trim().min(1).max(140).optional().describe('Nuevo concepto.'),
  amount: positiveAmount.optional().describe('Nuevo monto positivo.'),
  date: isoDateTimeString.optional().describe('Nueva fecha ISO 8601.'),
  note: z.string().trim().max(500).optional().describe('Nueva nota.'),
  payment_method: z.enum(['cash', 'transfer', 'card', 'other']).optional().describe('Nuevo método de pago.'),
}).shape;

export const toggleFixedItemSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  fixed_item_id: uuidString.describe('UUID del gasto o ingreso fijo.'),
  active: z.boolean().optional().describe('Si se especifica, fija active; si se omite, alterna el estado.'),
}).shape;

export const createFixedItemSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  type: z
    .enum(['income_fixed', 'expense_fixed', 'expense_variable', 'saving_fixed'])
    .describe('Tipo de elemento fijo.'),
  category: z.string().trim().min(1).max(60).describe('Categoría.'),
  concept: z.string().trim().min(1).max(140).describe('Concepto del elemento fijo.'),
  amount: positiveAmount.describe('Monto por ocurrencia.'),
  frequency: z
    .enum(['monthly', 'biweekly', 'weekly', 'yearly', 'one_time', 'bimonthly', 'quarterly', 'fourmonthly', 'biannual'])
    .describe('Frecuencia de recurrencia.'),
  priority: z.enum(['low', 'medium', 'high']).optional().describe('Prioridad (por defecto medium).'),
  start_date: isoDateTimeString.optional(),
  end_date: isoDateTimeString.optional(),
  pay_day: z.number().int().min(1).max(31).optional().describe('Día del mes (1-31).'),
  pay_week_day: z.number().int().min(0).max(6).optional().describe('Día de la semana (0=domingo..6=sábado).'),
  payment_method: z.enum(['cash', 'transfer', 'card', 'other']).optional(),
  account_id: uuidString.optional(),
  note: z.string().trim().max(500).optional(),
}).shape;

export const contributeGoalSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  goal_id: uuidString.describe('UUID de la meta de ahorro.'),
  amount: positiveAmount.describe('Monto de la aportación a la meta.'),
  date: isoDateTimeString.optional(),
  account_id: uuidString.optional().describe('UUID de la cuenta desde donde se aparta el ahorro.'),
}).shape;

export const recordDebtPaymentSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  debt_id: uuidString.describe('UUID de la deuda existente.'),
  amount: positiveAmount.describe('Monto del abono o pago.'),
  date: isoDateTimeString.optional(),
  account_id: uuidString.optional().describe('UUID de la cuenta receptora/emisora del pago.'),
  payment_method: z.enum(['cash', 'transfer', 'card', 'other']).optional(),
  note: z.string().trim().max(500).optional(),
}).shape;

export const createGoalSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  name: z.string().trim().min(1).max(100).describe('Nombre de la meta.'),
  target: positiveAmount.describe('Monto objetivo total.'),
  saved: z.number().finite().min(0).max(1_000_000_000).optional().describe('Ahorro inicial (por defecto 0).'),
  deadline: isoDateTimeString.optional().describe('Fecha límite objetivo opcional.'),
  pinned: z.boolean().optional().describe('Fijar en el panel principal.'),
  color: z.string().trim().max(32).optional().describe('Color identificador opcional.'),
}).shape;

export const createDebtSchema = z.object({
  idempotency_key: idempotencyKeySchema,
  person: z.string().trim().min(1).max(100).describe('Nombre de la persona o entidad.'),
  concept: z.string().trim().min(1).max(140).describe('Concepto de la deuda.'),
  amount: positiveAmount.describe('Monto total original.'),
  direction: z
    .enum(['owed_to_me', 'i_owe'])
    .optional()
    .describe('owed_to_me = me deben; i_owe = yo debo (etiqueta internamente [yo_debo]).'),
  date: isoDateTimeString.optional(),
  due_date: isoDateTimeString.optional(),
  account_id: uuidString.optional(),
  note: z.string().trim().max(480).optional(),
}).shape;

export const prepareSoftDeleteSchema = z.object({
  entity_type: z
    .enum(['transaction', 'fixed_item', 'goal', 'debt', 'debt_payment'])
    .describe('Tipo de registro a enviar a papelera (las cuentas están bloqueadas).'),
  entity_id: uuidString.describe('UUID del registro a enviar a papelera.'),
}).shape;

export const confirmSoftDeleteSchema = z.object({
  confirmation_token: z
    .string()
    .trim()
    .min(16)
    .max(256)
    .describe('Token único generado por prepare_soft_delete después de confirmar explícitamente con el usuario.'),
  idempotency_key: idempotencyKeySchema,
}).shape;
