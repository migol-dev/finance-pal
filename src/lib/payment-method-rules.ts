import type { Account, PaymentMethod, Transaction } from "./finance";

/**
 * Determina los métodos de pago válidos para el tipo de cuenta seleccionada.
 * - Efectivo (`cash`): único método automático `cash` ("Efectivo · Automático").
 * - Banco (`bank`): `card` (Tarjeta) o `transfer` (Transferencia).
 * - Otra (`other`): `card`, `transfer` u `other`.
 * - Sin cuenta: cualquier método disponible.
 */
export function allowedMethodsForAccount(
  account?: Pick<Account, "type"> | null
): PaymentMethod[] {
  if (!account) return ["cash", "card", "transfer", "other"];
  if (account.type === "cash") return ["cash"];
  if (account.type === "bank") return ["card", "transfer"];
  return ["card", "transfer", "other"];
}

/**
 * Resuelve el método de pago al cambiar de cuenta, conservando la selección previa
 * si sigue siendo válida para la nueva cuenta o eligiendo el predeterminado.
 */
export function resolvePaymentMethodForAccount(
  account: Pick<Account, "type"> | null | undefined,
  current?: PaymentMethod
): PaymentMethod {
  const allowed = allowedMethodsForAccount(account);
  if (current && allowed.includes(current)) {
    return current;
  }
  return allowed[0];
}

export function isAutoCashAccount(account?: Pick<Account, "type"> | null): boolean {
  return account?.type === "cash";
}

export function supportsTransferDetails(method: PaymentMethod): boolean {
  return method === "transfer";
}

export interface ClabeValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Valida que el campo opcional de cuenta destino/origen acepte:
 * - vacío (opcional)
 * - 4 dígitos (últimos 4 dígitos)
 * - 18 dígitos (CLABE interbancaria)
 */
export function validateClabeOrLast4(rawValue: string): ClabeValidationResult {
  const compact = rawValue.replace(/[\s-]+/g, "").trim();
  if (!compact) {
    return { valid: true, normalized: undefined };
  }
  if (!/^\d+$/.test(compact)) {
    return {
      valid: false,
      error: "Solo se permiten números (4 últimos dígitos o CLABE de 18 dígitos).",
    };
  }
  if (compact.length !== 4 && compact.length !== 18) {
    return {
      valid: false,
      error: "Ingresa exactamente 4 últimos dígitos o una CLABE de 18 dígitos.",
    };
  }
  return { valid: true, normalized: compact };
}

/**
 * Construye el objeto `externalPayee` limpio (sin clave de rastreo ni referencia).
 * Devuelve `undefined` si todos los campos están vacíos.
 */
export function buildExternalPayee(input: {
  name?: string;
  bank?: string;
  clabe?: string;
}): Transaction["externalPayee"] {
  const name = input.name?.trim() || undefined;
  const bank = input.bank?.trim() || undefined;
  const clabeCheck = validateClabeOrLast4(input.clabe ?? "");
  const clabe = clabeCheck.valid ? clabeCheck.normalized : undefined;

  if (!name && !bank && !clabe) {
    return undefined;
  }
  return {
    ...(name ? { name } : {}),
    ...(bank ? { bank } : {}),
    ...(clabe ? { clabe } : {}),
  };
}
