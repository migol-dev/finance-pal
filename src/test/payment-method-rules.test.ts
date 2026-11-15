import { describe, it, expect } from "vitest";
import {
  allowedMethodsForAccount,
  buildExternalPayee,
  isAutoCashAccount,
  resolvePaymentMethodForAccount,
  supportsTransferDetails,
  validateClabeOrLast4,
} from "@/lib/payment-method-rules";

describe("payment-method-rules", () => {
  it("restringe cuentas cash a ['cash'] y resuelve automáticamente a 'cash'", () => {
    expect(allowedMethodsForAccount({ type: "cash" })).toEqual(["cash"]);
    expect(isAutoCashAccount({ type: "cash" })).toBe(true);
    expect(resolvePaymentMethodForAccount({ type: "cash" }, "transfer")).toBe("cash");
    expect(resolvePaymentMethodForAccount({ type: "cash" }, "card")).toBe("cash");
  });

  it("permite card y transfer en cuentas bank y conserva selección válida", () => {
    expect(allowedMethodsForAccount({ type: "bank" })).toEqual(["card", "transfer"]);
    expect(isAutoCashAccount({ type: "bank" })).toBe(false);
    expect(resolvePaymentMethodForAccount({ type: "bank" }, "cash")).toBe("card");
    expect(resolvePaymentMethodForAccount({ type: "bank" }, "transfer")).toBe("transfer");
  });

  it("permite card, transfer y other en cuentas other", () => {
    expect(allowedMethodsForAccount({ type: "other" })).toEqual(["card", "transfer", "other"]);
    expect(resolvePaymentMethodForAccount({ type: "other" }, "cash")).toBe("card");
    expect(resolvePaymentMethodForAccount({ type: "other" }, "other")).toBe("other");
  });

  it("identifica cuándo se habilitan detalles de transferencia", () => {
    expect(supportsTransferDetails("transfer")).toBe(true);
    expect(supportsTransferDetails("card")).toBe(false);
    expect(supportsTransferDetails("cash")).toBe(false);
  });

  it("valida CLABE de 18 dígitos o últimos 4 dígitos e ignora espacios/guiones", () => {
    expect(validateClabeOrLast4("")).toEqual({ valid: true, normalized: undefined });
    expect(validateClabeOrLast4("48 21")).toEqual({ valid: true, normalized: "4821" });
    expect(validateClabeOrLast4("0121 8000 1234 5678 90")).toEqual({
      valid: true,
      normalized: "012180001234567890",
    });
    expect(validateClabeOrLast4("1234567").valid).toBe(false);
    expect(validateClabeOrLast4("12ab").valid).toBe(false);
  });

  it("construye externalPayee limpio o undefined si está vacío", () => {
    expect(buildExternalPayee({ name: "  ", bank: "", clabe: "" })).toBeUndefined();
    expect(
      buildExternalPayee({
        name: " Juan Pérez ",
        bank: " BBVA ",
        clabe: "4321",
      })
    ).toEqual({
      name: "Juan Pérez",
      bank: "BBVA",
      clabe: "4321",
    });
  });
});
