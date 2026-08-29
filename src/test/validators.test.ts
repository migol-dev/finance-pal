import { describe, it, expect } from "vitest";
import { validateEntity, sanitizeForLog, accountSchema, transactionSchema } from "../lib/validators";

describe("validators", () => {
  describe("validateEntity", () => {
    it("returns success and data for valid input", () => {
      const validAccount = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "Test Account",
        type: "bank"
      };
      
      const result = validateEntity(accountSchema, validAccount);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validAccount);
      }
    });

    it("returns false and errors for invalid input", () => {
      const invalidAccount = {
        id: "not-a-uuid",
        name: "Test Account",
        type: "unknown-type"
      };
      
      const result = validateEntity(accountSchema, invalidAccount);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe("sanitizeForLog", () => {
    it("returns JSON stringified object if length is within limit", () => {
      const obj = { a: 1 };
      expect(sanitizeForLog(obj)).toBe(JSON.stringify(obj));
    });

    it("truncates string if it exceeds maxLength", () => {
      const obj = { a: "a".repeat(100) };
      const result = sanitizeForLog(obj, 50);
      expect(result.length).toBeLessThan(100);
      expect(result.endsWith("... [truncated]")).toBe(true);
    });

    it("handles circular references gracefully", () => {
      const obj: any = { a: 1 };
      obj.circular = obj;
      expect(sanitizeForLog(obj)).toBe("[unserializable]");
    });
  });
});
