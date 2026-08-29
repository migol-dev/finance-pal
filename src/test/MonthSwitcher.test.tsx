import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MonthSwitcher } from "@/components/app/MonthSwitcher";
import { useFinance } from "@/store/finance-store";

vi.mock("@/store/finance-store", () => ({
  useFinance: vi.fn(),
}));

describe("MonthSwitcher", () => {
  const setActiveMock = vi.fn();
  const resetToTodayMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useFinance as any).mockReturnValue({
      activeYear: 2023,
      activeMonth: 5, // Junio
      setActive: setActiveMock,
      resetToToday: resetToTodayMock,
    });
  });

  it("renders the current month and year", () => {
    render(<MonthSwitcher />);
    const button = screen.getByRole("button", { name: /Junio\s*2023/i });
    expect(button).toBeInTheDocument();
  });

  it("navigates to the previous month", () => {
    render(<MonthSwitcher />);
    const prevButton = screen.getByLabelText("Mes anterior");
    fireEvent.click(prevButton);
    expect(setActiveMock).toHaveBeenCalledWith(2023, 4);
  });

  it("navigates to the next month", () => {
    render(<MonthSwitcher />);
    const nextButton = screen.getByLabelText("Mes siguiente");
    fireEvent.click(nextButton);
    expect(setActiveMock).toHaveBeenCalledWith(2023, 6);
  });
});
