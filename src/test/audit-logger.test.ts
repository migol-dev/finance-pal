import "./indexeddb-polyfill";
import { describe, it, expect, beforeEach } from "vitest";
import {
  logAudit,
  queryAuditLogs,
  verifyAuditIntegrity,
  audit,
  maskEmail,
  redactAuditDetails,
  clearAuditLogs,
} from "../lib/audit-logger";

describe("audit-logger", () => {
  beforeEach(async () => {
    // skip deleteDatabase as it hangs in fake-indexeddb if not closed
  });

  it("should log an audit entry and retrieve it", async () => {
    await logAudit({
      userId: "user123",
      action: "auth.login",
      resource: "session",
      details: { ip: "127.0.0.1" }
    });

    const logs = await queryAuditLogs({ userId: "user123" });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("auth.login");
    expect(logs[0].userId).toBe("user123");
    expect(logs[0].details).toEqual({ ip: "127.0.0.1" });
    expect(logs[0].hash).toBeDefined();
    expect(logs[0].prevHash).toBeDefined();
  });

  it("should verify audit integrity successfully", async () => {
    await audit.login("user1", { browser: "Chrome" });
    await audit.logout("user1", {});

    const integrity = await verifyAuditIntegrity();
    expect(integrity.valid).toBe(true);
    expect(integrity.brokenAt).toBeUndefined();
  });

  it("should filter logs correctly", async () => {
    const u1 = "u" + Date.now();
    const u2 = "u" + Date.now() + "2";
    await audit.login(u1, {});
    await audit.mfaEnabled(u2, {});

    const user1Logs = await queryAuditLogs({ userId: u1 });
    expect(user1Logs).toHaveLength(1);
    expect(user1Logs[0].action).toBe("auth.login");

    const mfaLogs = await queryAuditLogs({ action: "auth.mfa_enabled" });
    // Since there could be other mfa logs, we filter by u2 to be safe or just find it
    const u2Mfa = mfaLogs.filter(l => l.userId === u2);
    expect(u2Mfa).toHaveLength(1);
  });

  it("masks emails and redacts sensitive fields before persisting (F10-B)", async () => {
    const userId = `pii-${Date.now()}`;

    await logAudit({
      userId,
      action: "auth.email_changed",
      resource: "credentials",
      details: {
        email: "user@example.com",
        newEmail: "new@example.com",
        note: "contact old@example.com",
        token: "super-secret-token",
        nested: { oldEmail: "nested@example.com", access_token: "abc123" },
      },
    });

    const logs = await queryAuditLogs({ userId });
    expect(logs).toHaveLength(1);
    expect(logs[0].details).toMatchObject({
      email: "u***@example.com",
      newEmail: "n***@example.com",
      note: "contact o***@example.com",
      token: "[REDACTED]",
      nested: {
        oldEmail: "n***@example.com",
        access_token: "[REDACTED]",
      },
    });

    expect(maskEmail("user@example.com")).toBe("u***@example.com");
    expect(redactAuditDetails({ email: "a@b.com" })).toEqual({ email: "a***@b.com" });
    expect(redactAuditDetails(undefined)).toBeUndefined();
  });

  it("clears audit logs for a single user without touching others", async () => {
    const userA = `clear-a-${Date.now()}`;
    const userB = `clear-b-${Date.now()}`;
    await audit.login(userA, {});
    await audit.login(userB, {});

    await clearAuditLogs(userA);

    await expect(queryAuditLogs({ userId: userA })).resolves.toHaveLength(0);
    const remaining = await queryAuditLogs({ userId: userB });
    expect(remaining.length).toBeGreaterThan(0);
  });

  it("clears the entire audit store on device logout (SEC-015)", async () => {
    await audit.login(`purge-${Date.now()}`, {});

    await clearAuditLogs();

    await expect(queryAuditLogs({ limit: 10000 })).resolves.toHaveLength(0);
  });
});
