import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Ajustes } from "@/pages/Ajustes";
import { useFinance } from "@/store/finance-store";

// Polyfill ResizeObserver for Radix UI Slider in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    session: null,
    user: null,
    profile: null,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function renderWithProviders(initialEntry: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Ajustes />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Ajustes Modular Page", () => {
  beforeEach(() => {
    useFinance.getState().resetAll();
    window.scrollTo = vi.fn();
  });

  it("renders the Ajustes Hub with all category cards by default", () => {
    renderWithProviders("/ajustes");

    // Verify main header and section cards
    expect(screen.getByRole("heading", { name: "Ajustes" })).toBeInTheDocument();
    expect(screen.getByText("Perfil y Cuenta")).toBeInTheDocument();
    expect(screen.getByText("Cuentas y Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Conceptos Fijos")).toBeInTheDocument();
    expect(screen.getByText("Apariencia")).toBeInTheDocument();
    expect(screen.getByText("Accesibilidad")).toBeInTheDocument();
    expect(screen.getByText("Notificaciones")).toBeInTheDocument();
    expect(screen.getByText("Nube y Respaldos")).toBeInTheDocument();
    expect(screen.getByText("Seguridad y Sistema")).toBeInTheDocument();
  });

  it("navigates into Accesibilidad section when clicking on its card", async () => {
    renderWithProviders("/ajustes");

    const a11yCard = screen.getByText("Accesibilidad");
    fireEvent.click(a11yCard);

    // Section header should now be visible with back button
    expect(await screen.findByRole("button", { name: /Volver al menú de Ajustes/i })).toBeInTheDocument();
    expect(screen.getByText("Tamaño del texto")).toBeInTheDocument();
    expect(screen.getByText("Alto contraste (WCAG AAA)")).toBeInTheDocument();
    expect(screen.getByText("Tipografía adaptada para dislexia")).toBeInTheDocument();
  });

  it("returns back to Ajustes Hub when clicking back button", async () => {
    renderWithProviders("/ajustes?seccion=accesibilidad");

    const backButton = screen.getByRole("button", { name: /Volver al menú de Ajustes/i });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);

    // Should return to Hub
    expect(await screen.findByText("Categorías de configuración")).toBeInTheDocument();
  });
});
