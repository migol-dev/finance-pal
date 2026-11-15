import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { generateOpaqueToken, sha256Hex, type McpTokenPayload } from '../oauth/crypto.js';
import { executeRpcTool } from './audit.js';
import {
  confirmSoftDeleteSchema,
  contributeGoalSchema,
  createDebtSchema,
  createFixedItemSchema,
  createGoalSchema,
  createTransactionSchema,
  prepareSoftDeleteSchema,
  recordDebtPaymentSchema,
  toggleFixedItemSchema,
  updateTransactionSchema,
} from './schemas.js';

const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  idempotentHint: false,
  destructiveHint: false,
  openWorldHint: false,
} as const;

const DESTRUCTIVE_PREPARE_ANNOTATIONS = {
  readOnlyHint: false,
  idempotentHint: false,
  destructiveHint: true,
  openWorldHint: false,
} as const;

const DESTRUCTIVE_CONFIRM_ANNOTATIONS = {
  readOnlyHint: false,
  idempotentHint: true,
  destructiveHint: true,
  openWorldHint: false,
} as const;

export const MCP_WRITE_TOOL_NAMES = new Set([
  'create_transaction',
  'update_transaction',
  'toggle_fixed_item',
  'create_fixed_item',
  'contribute_goal',
  'record_debt_payment',
  'create_goal',
  'create_debt',
  'prepare_soft_delete',
  'confirm_soft_delete',
]);

export function registerWriteTools(server: McpServer, token: McpTokenPayload): void {
  server.registerTool(
    'create_transaction',
    {
      title: 'Crear Movimiento',
      description:
        'Registra un ingreso, gasto, ahorro o transferencia. Efectivo solo acepta payment_method="cash"; banco solo "card" o "transfer".',
      inputSchema: createTransactionSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) =>
      executeRpcTool({
        token,
        toolName: 'create_transaction',
        requiredScope: 'mcp:write:transactions',
        isWrite: true,
        rpcName: 'mcp_create_transaction',
        rpcParams: {
          p_grant_id: token.grantId,
          p_idempotency_key: args.idempotency_key ?? null,
          p_type: args.type,
          p_category: args.category,
          p_concept: args.concept,
          p_amount: args.amount,
          ...(args.date !== undefined ? { p_date: args.date } : {}),
          ...(args.account_id !== undefined ? { p_account_id: args.account_id } : {}),
          ...(args.transfer_to_account_id !== undefined
            ? { p_transfer_to_account_id: args.transfer_to_account_id }
            : {}),
          ...(args.payment_method !== undefined ? { p_payment_method: args.payment_method } : {}),
          ...(args.note !== undefined ? { p_note: args.note } : {}),
        },
        summarize: (res) => ({ entity_type: 'transaction', entity_id: res.id, amount: args.amount }),
      }),
  );

  server.registerTool(
    'update_transaction',
    {
      title: 'Editar Movimiento',
      description:
        'Actualiza campos de un movimiento existente. Los movimientos programados generados por elementos fijos son inmutables.',
      inputSchema: updateTransactionSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) =>
      executeRpcTool({
        token,
        toolName: 'update_transaction',
        requiredScope: 'mcp:write:transactions',
        isWrite: true,
        rpcName: 'mcp_update_transaction',
        rpcParams: {
          p_grant_id: token.grantId,
          p_idempotency_key: args.idempotency_key ?? null,
          p_transaction_id: args.transaction_id,
          ...(args.category !== undefined ? { p_category: args.category } : {}),
          ...(args.concept !== undefined ? { p_concept: args.concept } : {}),
          ...(args.amount !== undefined ? { p_amount: args.amount } : {}),
          ...(args.date !== undefined ? { p_date: args.date } : {}),
          ...(args.note !== undefined ? { p_note: args.note } : {}),
          ...(args.payment_method !== undefined ? { p_payment_method: args.payment_method } : {}),
        },
        summarize: () => ({ entity_type: 'transaction', entity_id: args.transaction_id }),
      }),
  );

  server.registerTool(
    'toggle_fixed_item',
    {
      title: 'Activar o Pausar Elemento Fijo',
      description: 'Activa o pausa un gasto o ingreso fijo existente.',
      inputSchema: toggleFixedItemSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) =>
      executeRpcTool({
        token,
        toolName: 'toggle_fixed_item',
        requiredScope: 'mcp:write:fixed_items',
        isWrite: true,
        rpcName: 'mcp_toggle_fixed_item',
        rpcParams: {
          p_grant_id: token.grantId,
          p_idempotency_key: args.idempotency_key ?? null,
          p_fixed_item_id: args.fixed_item_id,
          ...(args.active !== undefined ? { p_active: args.active } : {}),
        },
        summarize: () => ({ entity_type: 'fixed_item', entity_id: args.fixed_item_id }),
      }),
  );

  server.registerTool(
    'create_fixed_item',
    {
      title: 'Crear Gasto o Ingreso Fijo',
      description: 'Crea un compromiso recurrente (mensual, quincenal, semanal, anual, etc.).',
      inputSchema: createFixedItemSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) =>
      executeRpcTool({
        token,
        toolName: 'create_fixed_item',
        requiredScope: 'mcp:write:fixed_items',
        isWrite: true,
        rpcName: 'mcp_create_fixed_item',
        rpcParams: {
          p_grant_id: token.grantId,
          p_idempotency_key: args.idempotency_key ?? null,
          p_type: args.type,
          p_category: args.category,
          p_concept: args.concept,
          p_amount: args.amount,
          p_frequency: args.frequency,
          ...(args.priority !== undefined ? { p_priority: args.priority } : {}),
          ...(args.start_date !== undefined ? { p_start_date: args.start_date } : {}),
          ...(args.end_date !== undefined ? { p_end_date: args.end_date } : {}),
          ...(args.pay_day !== undefined ? { p_pay_day: args.pay_day } : {}),
          ...(args.pay_week_day !== undefined ? { p_pay_week_day: args.pay_week_day } : {}),
          ...(args.payment_method !== undefined ? { p_payment_method: args.payment_method } : {}),
          ...(args.account_id !== undefined ? { p_account_id: args.account_id } : {}),
          ...(args.note !== undefined ? { p_note: args.note } : {}),
        },
        summarize: (res) => ({
          entity_type: 'fixed_item',
          entity_id: res.id,
          amount: args.amount,
          frequency: args.frequency,
        }),
      }),
  );

  server.registerTool(
    'contribute_goal',
    {
      title: 'Aportar a Meta de Ahorro',
      description: 'Registra atómicamente una aportación a una meta y su movimiento asociado.',
      inputSchema: contributeGoalSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) =>
      executeRpcTool({
        token,
        toolName: 'contribute_goal',
        requiredScope: 'mcp:write:goals',
        isWrite: true,
        rpcName: 'mcp_contribute_goal',
        rpcParams: {
          p_grant_id: token.grantId,
          p_idempotency_key: args.idempotency_key ?? null,
          p_goal_id: args.goal_id,
          p_amount: args.amount,
          ...(args.date !== undefined ? { p_date: args.date } : {}),
          ...(args.account_id !== undefined ? { p_account_id: args.account_id } : {}),
        },
        summarize: () => ({ entity_type: 'goal', entity_id: args.goal_id, amount: args.amount }),
      }),
  );

  server.registerTool(
    'record_debt_payment',
    {
      title: 'Registrar Abono de Deuda',
      description: 'Registra un pago o cobro parcial/total en `debt_payments` ligado a una deuda existente.',
      inputSchema: recordDebtPaymentSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) =>
      executeRpcTool({
        token,
        toolName: 'record_debt_payment',
        requiredScope: 'mcp:write:debts',
        isWrite: true,
        rpcName: 'mcp_record_debt_payment',
        rpcParams: {
          p_grant_id: token.grantId,
          p_idempotency_key: args.idempotency_key ?? null,
          p_debt_id: args.debt_id,
          p_amount: args.amount,
          ...(args.date !== undefined ? { p_date: args.date } : {}),
          ...(args.account_id !== undefined ? { p_account_id: args.account_id } : {}),
          ...(args.payment_method !== undefined ? { p_payment_method: args.payment_method } : {}),
          ...(args.note !== undefined ? { p_note: args.note } : {}),
        },
        summarize: () => ({ entity_type: 'debt_payment', entity_id: args.debt_id, amount: args.amount }),
      }),
  );

  server.registerTool(
    'create_goal',
    {
      title: 'Crear Meta de Ahorro',
      description: 'Crea una nueva meta de ahorro con objetivo monetario y fecha opcional.',
      inputSchema: createGoalSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) =>
      executeRpcTool({
        token,
        toolName: 'create_goal',
        requiredScope: 'mcp:write:goals',
        isWrite: true,
        rpcName: 'mcp_create_goal',
        rpcParams: {
          p_grant_id: token.grantId,
          p_idempotency_key: args.idempotency_key ?? null,
          p_name: args.name,
          p_target: args.target,
          ...(args.saved !== undefined ? { p_saved: args.saved } : {}),
          ...(args.deadline !== undefined ? { p_deadline: args.deadline } : {}),
          ...(args.pinned !== undefined ? { p_pinned: args.pinned } : {}),
          ...(args.color !== undefined ? { p_color: args.color } : {}),
        },
        summarize: (res) => ({ entity_type: 'goal', entity_id: res.id, amount: args.target }),
      }),
  );

  server.registerTool(
    'create_debt',
    {
      title: 'Crear Deuda o Préstamo',
      description: 'Crea una deuda nueva. Usa direction="i_owe" cuando el usuario debe dinero (etiqueta [yo_debo]).',
      inputSchema: createDebtSchema,
      annotations: WRITE_ANNOTATIONS,
    },
    async (args) =>
      executeRpcTool({
        token,
        toolName: 'create_debt',
        requiredScope: 'mcp:write:debts',
        isWrite: true,
        rpcName: 'mcp_create_debt',
        rpcParams: {
          p_grant_id: token.grantId,
          p_idempotency_key: args.idempotency_key ?? null,
          p_person: args.person,
          p_concept: args.concept,
          p_amount: args.amount,
          ...(args.direction !== undefined ? { p_direction: args.direction } : {}),
          ...(args.date !== undefined ? { p_date: args.date } : {}),
          ...(args.due_date !== undefined ? { p_due_date: args.due_date } : {}),
          ...(args.account_id !== undefined ? { p_account_id: args.account_id } : {}),
          ...(args.note !== undefined ? { p_note: args.note } : {}),
        },
        summarize: (res) => ({
          entity_type: 'debt',
          entity_id: res.id,
          amount: args.amount,
          direction: args.direction ?? 'owed_to_me',
        }),
      }),
  );

  server.registerTool(
    'prepare_soft_delete',
    {
      title: 'Preparar Envío a Papelera (Paso 1/2)',
      description:
        'Paso 1 de 2 para enviar un registro a la papelera recuperable por 30 días. Genera un token de confirmación válido 120s. Muestra la vista previa al usuario y obtén su confirmación antes de llamar confirm_soft_delete. Las cuentas y movimientos programados están bloqueados.',
      inputSchema: prepareSoftDeleteSchema,
      annotations: DESTRUCTIVE_PREPARE_ANNOTATIONS,
    },
    async (args) => {
      const confirmationToken = generateOpaqueToken(24);
      const tokenHash = sha256Hex(confirmationToken);

      return executeRpcTool({
        token,
        toolName: 'prepare_soft_delete',
        requiredScope: 'mcp:delete:soft',
        isWrite: true,
        rpcName: 'mcp_prepare_soft_delete',
        rpcParams: {
          p_grant_id: token.grantId,
          p_entity_type: args.entity_type,
          p_entity_id: args.entity_id,
          p_token_hash: tokenHash,
        },
        transform: (res) => ({
          ...res,
          confirmation_token: confirmationToken,
          next_step_instruction:
            'Pide confirmación explícita al usuario mostrando el resumen de `preview` antes de llamar `confirm_soft_delete`. El registro podrá recuperarse durante 30 días en Ajustes › Conectores IA › Papelera.',
        }),
        summarize: () => ({ entity_type: args.entity_type, entity_id: args.entity_id, status: 'prepared' }),
      });
    },
  );

  server.registerTool(
    'confirm_soft_delete',
    {
      title: 'Confirmar Envío a Papelera (Paso 2/2)',
      description:
        'Paso 2 de 2: Marca deleted_at en un único registro usando el confirmation_token de prepare_soft_delete tras confirmación del usuario. Recuperable por 30 días.',
      inputSchema: confirmSoftDeleteSchema,
      annotations: DESTRUCTIVE_CONFIRM_ANNOTATIONS,
    },
    async (args) => {
      const tokenHash = sha256Hex(args.confirmation_token);
      return executeRpcTool({
        token,
        toolName: 'confirm_soft_delete',
        requiredScope: 'mcp:delete:soft',
        isWrite: true,
        rpcName: 'mcp_confirm_soft_delete',
        rpcParams: {
          p_grant_id: token.grantId,
          p_token_hash: tokenHash,
          p_idempotency_key: args.idempotency_key ?? null,
        },
        summarize: (res) => ({
          entity_type: res.entity_type,
          entity_id: res.entity_id,
          status: 'soft_deleted',
        }),
      });
    },
  );
}
