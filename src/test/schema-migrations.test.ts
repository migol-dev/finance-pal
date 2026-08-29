import { describe, it, expect } from "vitest";
import { migrateData, CURRENT_SCHEMA_VERSION, mergeLocalCloudData, sanitizeMigratedData } from "../lib/schema-migrations";

describe("schema-migrations", () => {
  describe("migrateData", () => {
    it("migrates from v1 to current version", async () => {
      const v1Data = {
        _meta: { schemaVersion: 1 },
        accounts: [],
        transactions: []
      };

      const ctx = { isNative: false, timestamp: new Date().toISOString() };
      const { data, result } = await migrateData(v1Data, ctx);

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(true);
      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(data._meta.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(data.appSettings).toBeDefined();
    });

    it("does not migrate if already at current version", async () => {
      const currentData = {
        _meta: { schemaVersion: CURRENT_SCHEMA_VERSION },
      };

      const ctx = { isNative: false, timestamp: new Date().toISOString() };
      const { data, result } = await migrateData(currentData, ctx);

      expect(result.success).toBe(true);
      expect(result.migrated).toBe(false);
      expect(data._meta.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
  });

  describe("mergeLocalCloudData", () => {
    it("merges arrays by id, preferring local by default", () => {
      const local = [{ id: "1", val: "local1" }, { id: "2", val: "local2" }];
      const cloud = [{ id: "1", val: "cloud1" }, { id: "3", val: "cloud3" }];

      const merged = mergeLocalCloudData(local, cloud);
      expect(merged).toHaveLength(3);
      
      const item1 = merged.find(i => i.id === "1");
      expect(item1?.val).toBe("local1");

      const item3 = merged.find(i => i.id === "3");
      expect(item3?.val).toBe("cloud3");
    });
  });

  describe("sanitizeMigratedData", () => {
    it("ensures arrays exist and basic structure", () => {
      const raw = {
        goals: [{ id: "g1", folder_id: "f1", saved: "not-a-number" }]
      };

      const sanitized = sanitizeMigratedData(raw);
      expect(sanitized.accounts).toEqual([]);
      expect(sanitized.transactions).toEqual([]);
      expect(sanitized.goals[0].folderId).toBe("f1");
      expect(sanitized.goals[0].saved).toBe(0);
      expect(sanitized.appSettings).toBeDefined();
      expect(sanitized.theme).toBe("light");
    });
  });
});
