import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpTokenPayload } from '../oauth/crypto.js';
import { executeRpcTool } from './audit.js';
import {
  getBudget602020StatusSchema,
  getFinancialOverviewSchema,
  getSpendingByCategorySchema,
  listAccountsSchema,
  listDebtsSchema,
  listFixedItemsSchema,
  listGoalsSchema,
  listTransactionsSchema,
} from './schemas.js';

const READ_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

export function registerReadTools(server: McpServer, token: McpTokenPayload): void {
  server.registerTool(
    'get_financial_overview',
    {
      title: 'Resumen Financiero Mensual',
      description:
        'Obtiene totales agregados del mes (ingresos, gastos, ahorro, balances por cuenta y cumplimiento 60/20/20) sin datos personales (PII).',
      inputSchema: getFinancialOverviewSchema,
      annotations: READ_ANNOTATIONS,
    },
    async ({ year, month }) =>
      executeRpcTool({
        token,
        toolName: 'get_financial_overview',
        requiredScope: 'mcp:read:overview',
        isWrite: false,
        rpcName: 'mcp_get_financial_overview',
        rpcParams: {
          p_grant_id: token.grantId,
          ...(year !== undefined ? { p_year: year } : {}),
          ...(month !== undefined ? { p_month: month } : {}),
        },
        summarize: (res) => ({ status: 'ok', count: typeof res.transaction_count === 'number' ? res.transaction_count : 0 }),
      }),
  );

  server.registerTool(
    'list_accounts',
    {
      title: 'Listar Cuentas y Saldos',
      description: 'Lista todas las cuentas activas del usuario con su tipo (cash/bank/other) y saldo vigente calculado.',
      inputSchema: listAccountsSchema,
      annotations: READ_ANNOTATIONS,
    },
    async () =>
      executeRpcTool({
        token,
        toolName: 'list_accounts',
        requiredScope: 'mcp:read:accounts',
        isWrite: false,
        rpcName: 'mcp_list_accounts',
        rpcParams: { p_grant_id: token.grantId },
        summarize: (res) => ({ count: typeof res.count === 'number' ? res.count : 0 }),
      }),
  );

  server.registerTool(
    'list_transactions',
    {
      title: 'Listar Movimientos',
      description:
        'Consulta movimientos recientes (máximo 90 días por ventana y 50 filas por página). El texto libre del usuario viene envuelto en <untrusted_user_note>.',
      inputSchema: listTransactionsSchema,
      annotations: READ_ANNOTATIONS,
    },
    async ({ start_date, end_date, type, category, account_id, search, limit, offset }) =>
      executeRpcTool({
        token,
        toolName: 'list_transactions',
        requiredScope: 'mcp:read:transactions',
        isWrite: false,
        rpcName: 'mcp_list_transactions',
        rpcParams: {
          p_grant_id: token.grantId,
          ...(start_date !== undefined ? { p_start_date: start_date } : {}),
          ...(end_date !== undefined ? { p_end_date: end_date } : {}),
          ...(type !== undefined ? { p_type: type } : {}),
          ...(category !== undefined ? { p_category: category } : {}),
          ...(account_id !== undefined ? { p_account_id: account_id } : {}),
          ...(search !== undefined ? { p_search: search } : {}),
          ...(limit !== undefined ? { p_limit: limit } : {}),
          ...(offset !== undefined ? { p_offset: offset } : {}),
        },
        summarize: (res) => ({ count: typeof res.count === 'number' ? res.count : 0 }),
      }),
  );

  server.registerTool(
    'get_spending_by_category',
    {
      title: 'Gasto por Categoría',
      description: 'Agrupa los egresos del período solicitado (máximo 90 días) por categoría de menor a mayor impacto.',
      inputSchema: getSpendingByCategorySchema,
      annotations: READ_ANNOTATIONS,
    },
    async ({ start_date, end_date }) =>
      executeRpcTool({
        token,
        toolName: 'get_spending_by_category',
        requiredScope: 'mcp:read:transactions',
        isWrite: false,
        rpcName: 'mcp_get_spending_by_category',
        rpcParams: {
          p_grant_id: token.grantId,
          ...(start_date !== undefined ? { p_start_date: start_date } : {}),
          ...(end_date !== undefined ? { p_end_date: end_date } : {}),
        },
      }),
  );

  server.registerTool(
    'list_fixed_items',
    {
      title: 'Listar Gastos e Ingresos Fijos',
      description: 'Lista compromisos fijos y recurrentes con su frecuencia, prorrateo mensual equivalente y estado.',
      inputSchema: listFixedItemsSchema,
      annotations: READ_ANNOTATIONS,
    },
    async ({ active_only }) =>
      executeRpcTool({
        token,
        toolName: 'list_fixed_items',
        requiredScope: 'mcp:read:fixed_items',
        isWrite: false,
        rpcName: 'mcp_list_fixed_items',
        rpcParams: {
          p_grant_id: token.grantId,
          ...(active_only !== undefined ? { p_active_only: active_only } : {}),
        },
        summarize: (res) => ({ count: typeof res.count === 'number' ? res.count : 0 }),
      }),
  );

  server.registerTool(
    'list_goals',
    {
      title: 'Listar Metas de Ahorro',
      description: 'Devuelve las metas de ahorro activas con monto ahorrado, objetivo, porcentaje de avance y fecha límite.',
      inputSchema: listGoalsSchema,
      annotations: READ_ANNOTATIONS,
    },
    async () =>
      executeRpcTool({
        token,
        toolName: 'list_goals',
        requiredScope: 'mcp:read:goals',
        isWrite: false,
        rpcName: 'mcp_list_goals',
        rpcParams: { p_grant_id: token.grantId },
        summarize: (res) => ({ count: typeof res.count === 'number' ? res.count : 0 }),
      }),
  );

  server.registerTool(
    'list_debts',
    {
      title: 'Listar Deudas Activas',
      description: 'Devuelve préstamos por cobrar (owed_to_me) y deudas por pagar (i_owe) con saldo abonado y restante.',
      inputSchema: listDebtsSchema,
      annotations: READ_ANNOTATIONS,
    },
    async () =>
      executeRpcTool({
        token,
        toolName: 'list_debts',
        requiredScope: 'mcp:read:debts',
        isWrite: false,
        rpcName: 'mcp_list_debts',
        rpcParams: { p_grant_id: token.grantId },
        summarize: (res) => ({ count: typeof res.count === 'number' ? res.count : 0 }),
      }),
  );

  server.registerTool(
    'get_budget_60_20_20_status',
    {
      title: 'Estado de Regla 60/20/20',
      description: 'Calcula la distribución mensual respecto a la meta 60% necesidades/fijos, 20% estilo/ocio y 20% ahorro/metas.',
      inputSchema: getBudget602020StatusSchema,
      annotations: READ_ANNOTATIONS,
    },
    async ({ year, month }) =>
      executeRpcTool({
        token,
        toolName: 'get_budget_60_20_20_status',
        requiredScope: 'mcp:read:overview',
        isWrite: false,
        rpcName: 'mcp_get_budget_60_20_20_status',
        rpcParams: {
          p_grant_id: token.grantId,
          ...(year !== undefined ? { p_year: year } : {}),
          ...(month !== undefined ? { p_month: month } : {}),
        },
      }),
  );
}
