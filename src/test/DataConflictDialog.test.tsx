import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataConflictDialog } from "@/components/app/DataConflictDialog";
import { useAuth } from "@/context/AuthContext";
import { useFinance } from "@/store/finance-store";

vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/store/finance-store", () => ({
  useFinance: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

vi.mock("@/store/sync-store", () => ({
  useSyncStore: {
    getState: () => ({ clearQueue: vi.fn() }),
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("DataConflictDialog", () => {
  const onUpload = vi.fn();
  const onDownload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      session: { user: { id: "123" } },
    });
    (useFinance.getState as any).mockReturnValue({
      transactions: [],
      fixedItems: [],
      goals: [],
      debts: [],
    });
  });

  it("renders correctly", () => {
    render(<DataConflictDialog onUpload={onUpload} onDownload={onDownload} />);
    expect(screen.getByText("Datos en conflicto")).toBeInTheDocument();
    expect(screen.getByText("Sobrescribir nube")).toBeInTheDocument();
    expect(screen.getByText("Usar datos de la nube")).toBeInTheDocument();
  });

  it("calls onUpload when upload is clicked", () => {
    render(<DataConflictDialog onUpload={onUpload} onDownload={onDownload} />);
    const uploadBtn = screen.getByText("Sobrescribir nube");
    fireEvent.click(uploadBtn);
    expect(onUpload).toHaveBeenCalled();
  });
});
