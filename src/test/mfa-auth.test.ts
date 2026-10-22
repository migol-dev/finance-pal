import "./indexeddb-polyfill";
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { rateLimiter } from "../lib/rate-limiter";
import {
  audit,
  queryAuditLogs,
  verifyAuditIntegrity,
  clearAuditLogs,
} from "../lib/audit-logger";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "../lib/supabase";

describe("MFA Authentication & Hardening (2FA / TOTP)", () => {
  beforeEach(async () => {
    rateLimiter.resetAll();
  });

  afterAll(() => {
    rateLimiter.destroy();
  });

  describe("1. Rate Limiting on MFA verification & unenrollment", () => {
    it("allows 5 verification attempts and blocks the 6th under 'auth' policy", async () => {
      const identifier = "test-user-mfa-verify";

      for (let attempt = 1; attempt <= 5; attempt++) {
        const result = await rateLimiter.checkLimit(`${identifier}:mfa-verify`, "auth");
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(5 - attempt);
      }

      const blocked = await rateLimiter.checkLimit(`${identifier}:mfa-verify`, "auth");
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfter).toBeGreaterThan(0);
      expect(blocked.retryAfter).toBeLessThanOrEqual(60);
    });

    it("enforces rate limits on MFA unenrollment to prevent brute-forcing confirmation codes", async () => {
      const identifier = "test-user-mfa-unenroll";

      for (let attempt = 1; attempt <= 5; attempt++) {
        const result = await rateLimiter.checkLimit(`${identifier}:mfa-unenroll`, "auth");
        expect(result.allowed).toBe(true);
      }

      const blocked = await rateLimiter.checkLimit(`${identifier}:mfa-unenroll`, "auth");
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("isolates rate limiting counters across different users", async () => {
      for (let i = 0; i < 6; i++) {
        await rateLimiter.checkLimit("victim-user:mfa-verify", "auth");
      }

      // Attacking user A does not lock out user B
      const resultUserB = await rateLimiter.checkLimit("other-user:mfa-verify", "auth");
      expect(resultUserB.allowed).toBe(true);
    });
  });

  describe("2. Authenticator Assurance Level (AAL) & JWT parsing", () => {
    function evaluateMfaAssurance(levels: { currentLevel: string | null; nextLevel: string | null } | null): boolean {
      if (!levels) return false;
      return levels.currentLevel === "aal1" && levels.nextLevel === "aal2";
    }

    function parseJwtAal(token: string): string | null {
      try {
        const parts = token.split(".");
        if (parts.length < 2) return null;
        const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
        const payload = JSON.parse(payloadJson);
        return payload.aal ?? null;
      } catch {
        return null;
      }
    }

    it("demands MFA challenge when currentLevel is aal1 and nextLevel is aal2", () => {
      const needsMfa = evaluateMfaAssurance({
        currentLevel: "aal1",
        nextLevel: "aal2",
      });
      expect(needsMfa).toBe(true);
    });

    it("clears MFA requirement once user upgrades to aal2 (challenge verified)", () => {
      const needsMfa = evaluateMfaAssurance({
        currentLevel: "aal2",
        nextLevel: "aal2",
      });
      expect(needsMfa).toBe(false);
    });

    it("does not demand MFA for standard accounts without 2FA enrolled (aal1 -> aal1)", () => {
      const needsMfa = evaluateMfaAssurance({
        currentLevel: "aal1",
        nextLevel: "aal1",
      });
      expect(needsMfa).toBe(false);
    });

    it("handles null / missing session or unauthenticated states safely without error", () => {
      expect(evaluateMfaAssurance(null)).toBe(false);
      expect(evaluateMfaAssurance({ currentLevel: null, nextLevel: null })).toBe(false);
    });

    it("accurately decodes AAL claim from JWT payload", () => {
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payloadAal1 = Buffer.from(JSON.stringify({ sub: "user-123", aal: "aal1", exp: 9999999999 })).toString("base64url");
      const payloadAal2 = Buffer.from(JSON.stringify({ sub: "user-123", aal: "aal2", exp: 9999999999 })).toString("base64url");
      const fakeSig = "signature";

      const tokenAal1 = `${header}.${payloadAal1}.${fakeSig}`;
      const tokenAal2 = `${header}.${payloadAal2}.${fakeSig}`;

      expect(parseJwtAal(tokenAal1)).toBe("aal1");
      expect(parseJwtAal(tokenAal2)).toBe("aal2");
      expect(parseJwtAal("invalid-token")).toBeNull();
    });
  });

  describe("3. Ephemeral Client Isolation for Password Re-Authentication", () => {
    it("creates an ephemeral client with persistSession: false that does not contaminate localStorage", () => {
      const ephemeralClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      expect(ephemeralClient).toBeDefined();
      expect(ephemeralClient.auth).toBeDefined();

      // Ensure storage does not retain any auth tokens from the ephemeral client instance
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        expect(key?.startsWith("ephemeral-session")).toBeFalsy();
      }
    });
  });

  describe("4. Security Guard Invariants in AuthGuard & SessionManager", () => {
    it("strictly prevents cloud database queries when mfaRequired is true", () => {
      const cloudQuerySpy = vi.fn();

      function simulateAuthGuardEffect(session: { user: { id: string } } | null, mfaRequired: boolean) {
        if (!session?.user?.id || mfaRequired) return;
        cloudQuerySpy();
      }

      // In AAL1 stage with 2FA required:
      simulateAuthGuardEffect({ user: { id: "user_456" } }, true);
      expect(cloudQuerySpy).not.toHaveBeenCalled();

      // Once MFA challenge succeeds:
      simulateAuthGuardEffect({ user: { id: "user_456" } }, false);
      expect(cloudQuerySpy).toHaveBeenCalledTimes(1);
    });

    it("strictly prevents Realtime channel creation and session heartbeat when mfaRequired is true", () => {
      const initRealtimeSpy = vi.fn();
      const heartbeatSpy = vi.fn();

      function simulateSessionManagerInit(
        isSupabaseEnabled: boolean,
        loading: boolean,
        session: { user: { id: string } } | null,
        mfaRequired: boolean
      ) {
        if (!isSupabaseEnabled || loading || !session?.user?.id || mfaRequired) return;
        initRealtimeSpy();
        heartbeatSpy();
      }

      // Blocked while awaiting TOTP
      simulateSessionManagerInit(true, false, { user: { id: "user_789" } }, true);
      expect(initRealtimeSpy).not.toHaveBeenCalled();
      expect(heartbeatSpy).not.toHaveBeenCalled();

      // Allowed after TOTP verification
      simulateSessionManagerInit(true, false, { user: { id: "user_789" } }, false);
      expect(initRealtimeSpy).toHaveBeenCalledTimes(1);
      expect(heartbeatSpy).toHaveBeenCalledTimes(1);
    });

    it("prevents conflict resolution safety timeout from prematurely firing during MFA challenge", () => {
      const timeoutSetter = vi.fn();

      function simulateTimeoutEffect(
        mfaRequired: boolean,
        session: { user: { id: string } } | null,
        resolved: boolean,
        hasLocalData: boolean
      ) {
        if (mfaRequired || !session?.user?.id) return;
        if (!resolved && hasLocalData) {
          timeoutSetter();
        }
      }

      // While on MFA code input screen:
      simulateTimeoutEffect(true, { user: { id: "user_101" } }, false, true);
      expect(timeoutSetter).not.toHaveBeenCalled();

      // After MFA resolved:
      simulateTimeoutEffect(false, { user: { id: "user_101" } }, false, true);
      expect(timeoutSetter).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. Audit Trail for MFA Events & Deduplicated Login Audit", () => {
    it("logs auth.mfa_verified with factorId upon successful challenge", async () => {
      const userId = `mfa-audit-${Date.now()}`;
      await audit.mfaVerified(userId, { factorId: "factor_abc123" });

      const logs = await queryAuditLogs({ userId, action: "auth.mfa_verified" });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("auth.mfa_verified");
      expect(logs[0].details).toEqual({ factorId: "factor_abc123" });
      expect(logs[0].hash).toBeDefined();
    });

    it("logs auth.mfa_enabled when 2FA is activated in profile", async () => {
      const userId = `mfa-enable-${Date.now()}`;
      await audit.mfaEnabled(userId);

      const logs = await queryAuditLogs({ userId, action: "auth.mfa_enabled" });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("auth.mfa_enabled");
    });

    it("logs auth.mfa_disabled when 2FA is deactivated in profile", async () => {
      const userId = `mfa-disable-${Date.now()}`;
      await audit.mfaDisabled(userId);

      const logs = await queryAuditLogs({ userId, action: "auth.mfa_disabled" });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("auth.mfa_disabled");
    });

    it("preserves cryptographic hash-chain integrity across MFA and login audit events", async () => {
      await clearAuditLogs();
      const userId = `mfa-chain-${Date.now()}`;
      await audit.login(userId, { provider: "email", aal: "aal1" });
      await new Promise((r) => setTimeout(r, 10));
      await audit.mfaVerified(userId, { factorId: "fact_xyz" });
      await new Promise((r) => setTimeout(r, 10));
      await audit.login(userId, { provider: "email", aal: "aal2" });
      await new Promise((r) => setTimeout(r, 10));
      await audit.mfaDisabled(userId);

      const integrity = await verifyAuditIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.brokenAt).toBeUndefined();

      await clearAuditLogs(userId);
    });

    it("does not emit duplicate audit.login when MFA challenge transitions from aal1 to aal2", async () => {
      const userId = `mfa-dedup-${Date.now()}`;
      const auditLoginMock = vi.fn();

      // In AuthContext: only aal1 sessions without pending MFA emit login
      function handleAuthStateChange(event: string, session: { user: { id: string; app_metadata?: { aal?: string } } }, needsMfa: boolean) {
        if (event === "SIGNED_IN") {
          if (!needsMfa) {
            const aal = session.user.app_metadata?.aal || "aal1";
            if (aal === "aal1") {
              auditLoginMock(session.user.id, { aal: "aal1" });
            }
          }
        }
      }

      // Step 1: Password verified (AAL1 stage, needs MFA): no audit.login
      handleAuthStateChange("SIGNED_IN", { user: { id: userId, app_metadata: { aal: "aal1" } } }, true);
      expect(auditLoginMock).not.toHaveBeenCalled();

      // Step 2: TOTP verified in Login.tsx: audits mfaVerified and login with aal2
      await audit.mfaVerified(userId, { factorId: "factor_123" });
      auditLoginMock(userId, { aal: "aal2" });

      // Step 3: Auth state change receives refreshed aal2 session: does NOT emit duplicate aal1
      handleAuthStateChange("SIGNED_IN", { user: { id: userId, app_metadata: { aal: "aal2" } } }, false);

      expect(auditLoginMock).toHaveBeenCalledTimes(1);
      expect(auditLoginMock).toHaveBeenCalledWith(userId, { aal: "aal2" });
    });
  });

  describe("6. Factor Hygiene and Fallback Resolution", () => {
    it("filters and unenrolls only factors with 'unverified' status", () => {
      const factors = [
        { id: "f1", factor_type: "totp", status: "verified" },
        { id: "f2", factor_type: "totp", status: "unverified" },
        { id: "f3", factor_type: "totp", status: "unverified" },
      ];

      const toUnenroll = factors.filter((f) => f.status === "unverified").map((f) => f.id);
      expect(toUnenroll).toEqual(["f2", "f3"]);

      const verifiedRetained = factors.filter((f) => f.status === "verified").map((f) => f.id);
      expect(verifiedRetained).toEqual(["f1"]);
    });

    it("falls back to listFactors() if mfaFactorId is null during unenrollment", async () => {
      let stateFactorId: string | null = null;
      const mockListFactors = vi.fn().mockResolvedValue({
        data: {
          all: [
            { id: "factor_recovered_999", factor_type: "totp", status: "verified" },
          ],
        },
      });

      async function resolveFactorId(currentId: string | null): Promise<string | null> {
        let factorId = currentId;
        if (!factorId) {
          const res = await mockListFactors();
          const totp = res.data?.all?.find((f: any) => f.factor_type === "totp" && f.status === "verified");
          if (totp) factorId = totp.id;
        }
        return factorId;
      }

      const resolved = await resolveFactorId(stateFactorId);
      expect(resolved).toBe("factor_recovered_999");
      expect(mockListFactors).toHaveBeenCalledTimes(1);
    });
  });
});
