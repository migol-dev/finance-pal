import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncIndicator } from "@/components/app/SyncIndicator";
import { useNetwork } from "@/hooks/useNetwork";
import { useSyncStore } from "@/store/sync-store";

vi.mock("@/hooks/useNetwork", () => ({
  useNetwork: vi.fn(),
}));

vi.mock("@/store/sync-store", () => ({
  useSyncStore: vi.fn(),
}));

// Mock Capacitor to avoid issues
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));

describe("SyncIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows offline state", () => {
    (useNetwork as any).mockReturnValue({ isOnline: false });
    (useSyncStore as any).mockImplementation((selector: any) => {
      return selector({ syncQueue: [], isSyncing: false });
    });

    render(<SyncIndicator />);
    expect(screen.getByText("Sin conexión")).toBeInTheDocument();
  });

  it("shows synced state", () => {
    (useNetwork as any).mockReturnValue({ isOnline: true });
    (useSyncStore as any).mockImplementation((selector: any) => {
      const state = { syncQueue: [], isSyncing: false };
      return typeof selector === 'function' ? selector(state) : state;
    });

    render(<SyncIndicator />);
    expect(screen.getByText("Sincronizado")).toBeInTheDocument();
  });

  it("shows pending state", () => {
    (useNetwork as any).mockReturnValue({ isOnline: true });
    (useSyncStore as any).mockImplementation((selector: any) => {
      const state = { syncQueue: [{ id: 1 }], isSyncing: false };
      return typeof selector === 'function' ? selector(state) : state;
    });

    render(<SyncIndicator />);
    expect(screen.getByText("Pendiente (1) - Clic para reintentar")).toBeInTheDocument();
  });
});
