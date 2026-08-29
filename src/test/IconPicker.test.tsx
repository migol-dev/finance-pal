import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { IconPicker } from "@/components/app/IconPicker";

// Mock resize observer which might be needed by dialogs/cropper
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("IconPicker", () => {
  it("renders with default emoji", () => {
    render(<IconPicker onChange={vi.fn()} />);
    expect(screen.getByText("Cambiar icono")).toBeInTheDocument();
  });

  it("opens dialog on click", () => {
    render(<IconPicker onChange={vi.fn()} />);
    const btn = screen.getByText("Cambiar icono");
    fireEvent.click(btn);
    expect(screen.getByText("Elige un icono")).toBeInTheDocument();
  });
});
