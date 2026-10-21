import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { checkHibpPwnedPassword, rateLimiter, validatePasswordStrength } from "../lib/rate-limiter";

describe("validatePasswordStrength (SEC-008 / T11)", () => {
  it("rejects passwords shorter than 12 characters", () => {
    const result = validatePasswordStrength("Abc123!xyz");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/12/);
  });

  it("rejects passwords without a lowercase letter", () => {
    expect(validatePasswordStrength("ABCDEFGH1234!").valid).toBe(false);
  });

  it("rejects passwords without an uppercase letter", () => {
    expect(validatePasswordStrength("abcdefgh1234!").valid).toBe(false);
  });

  it("rejects passwords without a digit even when they contain a symbol", () => {
    expect(validatePasswordStrength("Abcdefghijkl!").valid).toBe(false);
  });

  it("accepts a strong 12+ character password with a digit", () => {
    expect(validatePasswordStrength("StrongPass12").valid).toBe(true);
  });

  it("accepts a strong 12+ character password with digits and symbols", () => {
    expect(validatePasswordStrength("StrongPass1!").valid).toBe(true);
  });
});

describe("rateLimiter auth policy (SEC-008 / T11)", () => {
  beforeEach(() => {
    rateLimiter.resetAll();
  });

  afterAll(() => {
    rateLimiter.destroy();
  });

  it("allows 5 attempts and blocks the 6th within the 60s window", async () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const result = await rateLimiter.checkLimit("auth-test-user", "auth");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5 - attempt);
    }

    const blocked = await rateLimiter.checkLimit("auth-test-user", "auth");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("keeps identifiers isolated", async () => {
    for (let attempt = 1; attempt <= 6; attempt++) {
      await rateLimiter.checkLimit("user-a", "auth");
    }

    const otherUser = await rateLimiter.checkLimit("user-b", "auth");
    expect(otherUser.allowed).toBe(true);
  });

  it("can be reset for a single identifier", async () => {
    for (let attempt = 1; attempt <= 6; attempt++) {
      await rateLimiter.checkLimit("user-c", "auth");
    }

    rateLimiter.reset("user-c", "auth");

    const afterReset = await rateLimiter.checkLimit("user-c", "auth");
    expect(afterReset.allowed).toBe(true);
  });
});

describe("checkHibpPwnedPassword k-Anonymity (SEC-008)", () => {
  it("flags a password when its SHA-1 suffix appears in the HIBP range response", async () => {
    const encoded = new TextEncoder().encode("Password123456");
    const digest = await crypto.subtle.digest("SHA-1", encoded);
    const sha1Hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefix = sha1Hex.slice(0, 5);
    const suffix = sha1Hex.slice(5);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(`00000000000000000000000000000000000:0\r\n${suffix}:4821\r\n`, { status: 200 }),
    );

    const res = await checkHibpPwnedPassword("Password123456");
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      expect.objectContaining({ headers: { "Add-Padding": "true" } }),
    );
    expect(res.pwned).toBe(true);
    expect(res.count).toBe(4821);
    fetchSpy.mockRestore();
  });

  it("fails open when offline or HIBP API is unreachable", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const res = await checkHibpPwnedPassword("UniquePass987654!");
    expect(res.pwned).toBe(false);
    fetchSpy.mockRestore();
  });
});
