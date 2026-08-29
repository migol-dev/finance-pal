import { render } from "@testing-library/react";
import Dashboard from "@/pages/Dashboard";
import { BottomNav } from "@/components/app/BottomNav";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";

// Mock zustand store to provide consistent state
vi.mock("@/store/finance-store", () => {
  const state = {
    transactions: [],
    goals: [],
    debts: [],
    accounts: [],
    fixedItems: [],
    theme: "light",
    accentColor: "indigo",
    currency: "MXN",
    setMonth: vi.fn(),
    profile: { name: "Test User" },
  };
  return {
    useFinance: (selector: any) => selector ? selector(state) : state,
  };
});

vi.mock("@/store/sync-store", () => ({
  useSyncStore: () => ({
    isOnline: true,
    lastSync: new Date().toISOString(),
  })
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    session: { user: { id: "test-user" } },
  })
}));

// react-query is not mocked to avoid Provider issues

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("UI Snapshots", () => {
  it("renders Dashboard snapshot", () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(container).toMatchSnapshot();
  });

  it("renders BottomNav snapshot", () => {
    const { container } = render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(container).toMatchSnapshot();
  });
});
