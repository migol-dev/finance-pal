import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHybridData } from "@/hooks/useHybridData";
import { useAuth } from "@/context/AuthContext";
import { useFinance } from "@/store/finance-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/store/finance-store", () => ({
  useFinance: vi.fn(),
}));

vi.mock("@/hooks/useSupabaseQueries", () => ({
  useAccounts: () => ({ data: [], isLoading: false }),
  useTransactions: () => ({ data: [], isLoading: false }),
  useFixedItems: () => ({ data: [], isLoading: false }),
  useGoals: () => ({ data: [], isLoading: false }),
  useGoalFolders: () => ({ data: [], isLoading: false }),
  useDebts: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseEnabled: true,
}));

describe("useHybridData", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    (useAuth as any).mockReturnValue({
      session: { user: { id: "user123" } },
    });
    (useFinance as any).mockReturnValue({
      accounts: [],
      transactions: [],
      fixedItems: [],
      goals: [],
      goalFolders: [],
      debts: [],
      theme: "system",
      addAccount: vi.fn(),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("returns hybrid data structure", () => {
    const { result } = renderHook(() => useHybridData(), { wrapper });
    
    expect(result.current.accounts).toEqual([]);
    expect(result.current.transactions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSupabaseEnabled).toBe(true);
  });
});
