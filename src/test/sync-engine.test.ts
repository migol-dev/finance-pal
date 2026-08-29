import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client and isSupabaseEnabled
vi.mock("@/lib/supabase", () => {
  return {
    isSupabaseEnabled: true,
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "user-123" } } }
        })
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ error: null }),
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        })),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        }))
      }))
    }
  };
});

// Mock sync store
let mockSyncQueue: any[] = [];
const mockSetSyncing = vi.fn();
const mockRemoveMutation = vi.fn((id: string) => {
  mockSyncQueue = mockSyncQueue.filter(m => m.id !== id);
});
const mockAddMutation = vi.fn();

vi.mock("@/store/sync-store", () => {
  return {
    useSyncStore: {
      getState: () => ({
        syncQueue: mockSyncQueue,
        setSyncing: mockSetSyncing,
        removeMutation: mockRemoveMutation,
        addMutation: mockAddMutation,
      }),
      subscribe: vi.fn()
    }
  };
});

// Mock rate limiter
vi.mock("@/lib/rate-limiter", () => ({
  rateLimiter: {
    checkLimit: vi.fn().mockResolvedValue({ allowed: true })
  },
  getClientIdentifier: () => "client-id"
}));

import { processSyncQueue } from "../lib/sync-engine";

describe("sync-engine", () => {
  beforeEach(() => {
    mockSyncQueue = [];
    vi.clearAllMocks();
  });

  it("should process queue and remove successful mutations", async () => {
    mockSyncQueue = [
      { id: "m1", table: "accounts", action: "INSERT", recordId: "a1", payload: { name: "Test" } },
      { id: "m2", table: "accounts", action: "UPDATE", recordId: "a1", payload: { name: "Test 2" } }
    ];

    await processSyncQueue();

    expect(mockSetSyncing).toHaveBeenCalledWith(true);
    // Queue should be cleared because removeMutation was called for each
    expect(mockRemoveMutation).toHaveBeenCalledTimes(2);
    expect(mockSetSyncing).toHaveBeenCalledWith(false);
  });

  it("should deduplicate mutations", async () => {
    mockSyncQueue = [
      { id: "m1", table: "goals", action: "INSERT", recordId: "g1", payload: { name: "Goal 1" } },
      { id: "m2", table: "goals", action: "UPDATE", recordId: "g1", payload: { name: "Goal 2" } },
      { id: "m3", table: "goals", action: "DELETE", recordId: "g1" },
    ];

    await processSyncQueue();

    // Eventually processed. Dedup means it will just DELETE g1
    expect(mockRemoveMutation).toHaveBeenCalledTimes(3);
  });
});
