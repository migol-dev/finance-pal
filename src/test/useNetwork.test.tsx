import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useNetwork } from "@/hooks/useNetwork";
import { Network } from "@capacitor/network";

vi.mock("@capacitor/network", () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

describe("useNetwork", () => {
  it("initializes with online status", async () => {
    const { result } = renderHook(() => useNetwork());
    // Initially the state is true before useEffect completes, or after it completes
    expect(result.current.isOnline).toBe(true);
  });
});
