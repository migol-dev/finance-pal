import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { logAudit, queryAuditLogs, verifyAuditIntegrity, audit } from "../lib/audit-logger";

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
});
