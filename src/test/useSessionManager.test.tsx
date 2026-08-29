import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSessionManager } from "@/hooks/useSessionManager";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseEnabled: true,
  supabase: {
    from: () => ({
      delete: () => ({
        eq: () => ({
          lt: vi.fn(),
          eq: vi.fn(),
        })
      }),
      insert: () => ({
        select: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'session-123' }, error: null })
        })
      }),
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: vi.fn().mockResolvedValue({ data: [] })
          })
        })
      })
    })
  }
}));

describe("useSessionManager", () => {
  beforeEach(() => {
    (useAuth as any).mockReturnValue({
      session: { user: { id: "user123" } },
      loading: false,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes without paused state", () => {
    const { result } = renderHook(() => useSessionManager());
    expect(result.current.paused).toBe(false);
  });

  it("can resume session", () => {
    const { result } = renderHook(() => useSessionManager());
    
    // Mock window reload
    const originalReload = window.location.reload;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: vi.fn() }
    });

    act(() => {
      result.current.resume();
    });

    expect(result.current.paused).toBe(false);
    expect(window.location.reload).toHaveBeenCalled();

    window.location.reload = originalReload;
  });
});
