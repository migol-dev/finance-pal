import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Anual from "@/pages/Anual";
import Historial from "@/pages/Historial";
import { Ajustes } from "@/pages/Ajustes";
import Login from "@/pages/Login";
import {
  isValidRedirectUri,
  calculatePasswordStrength,
  getSafeAuthError,
} from "@/pages/login/auth-helpers";
import type {
  Transaction,
  FixedItem,
  Goal,
  Debt,
  Account,
  AppSettings,
  Profile,
  ChangeLogEntry,
} from "@/lib/finance";

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

const mockSetActive = vi.fn();
const mockClearChangeLog = vi.fn();

let mockState = {
  fixedItems: [] as FixedItem[],
  transactions: [] as Transaction[],
  debts: [] as Debt[],
  goals: [] as Goal[],
  accounts: [] as Account[],
  profile: { name: "Usuario Prueba", currency: "MXN" } as Profile,
  activeYear: 2026,
  activeMonth: 9,
  changeLog: [] as ChangeLogEntry[],
  appSettings: { uiVersion: "v2", accentColor: "emerald" } as AppSettings | undefined,
};

vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    fixedItems: mockState.fixedItems,
    transactions: mockState.transactions,
    debts: mockState.debts,
    goals: mockState.goals,
    accounts: mockState.accounts,
    profile: mockState.profile,
    activeYear: mockState.activeYear,
    activeMonth: mockState.activeMonth,
    changeLog: mockState.changeLog,
    appSettings: mockState.appSettings,
    uiVersion: mockState.appSettings?.uiVersion ?? "v2",
    setActive: mockSetActive,
    clearChangeLog: mockClearChangeLog,
  }),
}));

const mockSignOut = vi.fn();
const mockCheckMfaStatus = vi.fn().mockResolvedValue(false);
const mockRefreshSession = vi.fn();

let mockAuthState = {
  session: null as any,
  mfaRequired: false,
};

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    session: mockAuthState.session,
    mfaRequired: mockAuthState.mfaRequired,
    signOut: mockSignOut,
    checkMfaStatus: mockCheckMfaStatus,
    refreshSession: mockRefreshSession,
    user: mockAuthState.session?.user ?? null,
    profile: null,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { all: [] }, error: null }),
        challenge: vi.fn(),
        verify: vi.fn(),
      },
    },
  },
  isSupabaseEnabled: false,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement, initialEntry = "/") {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Sprint 6 — Vistas Secundarias & Despachadores Duales Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.innerWidth = 1200;

    if (typeof URL.createObjectURL !== "function") {
      URL.createObjectURL = vi.fn().mockReturnValue("blob:mock");
    }
    if (typeof URL.revokeObjectURL !== "function") {
      URL.revokeObjectURL = vi.fn();
    }

    mockAuthState = {
      session: null,
      mfaRequired: false,
    };

    mockState = {
      activeYear: 2026,
      activeMonth: 9,
      profile: { name: "Usuario Prueba", currency: "MXN" },
      accounts: [
        {
          id: "acc-1",
          name: "Cuenta Principal",
          type: "bank",
          currency: "MXN",
          initialBalance: 20000,
          color: "blue",
          isDefault: true,
          showInSummary: true,
          order: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      fixedItems: [
        {
          id: "fix-1",
          concept: "Nómina",
          amount: 30000,
          type: "income_fixed",
          category: "Trabajo",
          frequency: "monthly",
          startYear: 2026,
          startMonth: 0,
          paymentMethod: "transfer",
          accountId: "acc-1",
        },
        {
          id: "fix-2",
          concept: "Renta",
          amount: 8000,
          type: "expense_fixed",
          category: "Vivienda",
          frequency: "monthly",
          startYear: 2026,
          startMonth: 0,
          paymentMethod: "transfer",
          accountId: "acc-1",
        },
      ],
      transactions: [
        {
          id: "tx-1",
          concept: "Supermercado",
          amount: 2500,
          type: "expense",
          category: "Comida",
          date: "2026-10-15T12:00:00.000Z",
          paymentMethod: "card",
          accountId: "acc-1",
        },
      ],
      debts: [
        {
          id: "debt-1",
          person: "Hermano",
          concept: "Préstamo",
          amount: 4000,
          date: "2026-05-10T12:00:00.000Z",
          type: "me_deben",
          payments: [
            {
              id: "p-1",
              amount: 1500,
              date: "2026-06-10T12:00:00.000Z",
              paymentMethod: "transfer",
            },
          ],
        },
      ],
      goals: [
        {
          id: "goal-1",
          name: "Fondo Emergencia",
          target: 50000,
          saved: 25000,
          color: "emerald",
          category: "Seguridad",
          contributions: [
            { id: "c-1", amount: 5000, date: "2026-08-01T00:00:00.000Z" },
          ],
        },
      ],
      changeLog: [
        {
          id: "log-1",
          at: "2026-10-24T18:00:00.000Z",
          entity: "transaction",
          entityId: "tx-1",
          action: "create",
          label: "Gasto de Supermercado $2,500",
          changes: [{ field: "amount", from: null, to: 2500 }],
        },
        {
          id: "log-2",
          at: "2026-10-23T15:30:00.000Z",
          entity: "goal",
          entityId: "goal-1",
          action: "update",
          label: "Aporte a Fondo Emergencia $5,000",
          changes: [{ field: "saved", from: 20000, to: 25000 }],
        },
      ],
      appSettings: { uiVersion: "v2", accentColor: "emerald" },
    };
  });

  /* ─────────────────────────────────────────────────────────────
     1. DESPACHADORES DUALES & PRESERVACIÓN DE SNAPSHOTS
     ───────────────────────────────────────────────────────────── */
  describe("Despachadores Duales (Anual, Historial, Ajustes, Login)", () => {
    it("renderiza AnualV2 cuando uiVersion === 'v2'", () => {
      mockState.appSettings = { uiVersion: "v2", accentColor: "emerald" };
      renderWithProviders(<Anual />);
      expect(screen.getByRole("heading", { name: /Resumen Anual/i })).toBeInTheDocument();
      expect(screen.getByText(/SUPERÁVIT \/ FLUJO NETO ACUMULADO/i)).toBeInTheDocument();
    });

    it("renderiza AnualClassic cuando uiVersion === 'classic'", () => {
      mockState.appSettings = { uiVersion: "classic", accentColor: "emerald" };
      renderWithProviders(<Anual />);
      expect(screen.getByRole("heading", { name: /Resumen anual/i })).toBeInTheDocument();
      expect(screen.getByText(/Neto del año/i)).toBeInTheDocument();
    });

    it("preserva AnualClassic cuando appSettings es indefinido", () => {
      mockState.appSettings = undefined;
      renderWithProviders(<Anual />);
      expect(screen.getByText(/Neto del año/i)).toBeInTheDocument();
    });

    it("renderiza HistorialV2 cuando uiVersion === 'v2'", () => {
      mockState.appSettings = { uiVersion: "v2", accentColor: "emerald" };
      renderWithProviders(<Historial />);
      expect(screen.getByRole("heading", { name: /Historial/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Buscar por concepto, campo/i)).toBeInTheDocument();
    });

    it("renderiza HistorialClassic cuando uiVersion === 'classic'", () => {
      mockState.appSettings = { uiVersion: "classic", accentColor: "emerald" };
      renderWithProviders(<Historial />);
      expect(screen.getByRole("heading", { name: /Historial/i })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Buscar por concepto, campo/i)).toBeNull();
    });

    it("preserva HistorialClassic cuando appSettings es indefinido", () => {
      mockState.appSettings = undefined;
      renderWithProviders(<Historial />);
      expect(screen.queryByPlaceholderText(/Buscar por concepto, campo/i)).toBeNull();
    });

    it("renderiza AjustesV2 cuando uiVersion === 'v2'", () => {
      mockState.appSettings = { uiVersion: "v2", accentColor: "emerald" };
      renderWithProviders(<Ajustes />);
      expect(screen.getByRole("heading", { name: "Ajustes" })).toBeInTheDocument();
      expect(screen.getByText("Categorías de configuración")).toBeInTheDocument();
      expect(screen.getByText("01")).toBeInTheDocument();
    });

    it("renderiza AjustesClassic cuando uiVersion === 'classic'", () => {
      mockState.appSettings = { uiVersion: "classic", accentColor: "emerald" };
      renderWithProviders(<Ajustes />);
      expect(screen.getByRole("heading", { name: "Ajustes" })).toBeInTheDocument();
      expect(screen.queryByText("01")).toBeNull();
    });

    it("preserva AjustesClassic cuando appSettings es indefinido", () => {
      mockState.appSettings = undefined;
      renderWithProviders(<Ajustes />);
      expect(screen.queryByText("01")).toBeNull();
    });

    it("renderiza LoginV2 cuando uiVersion === 'v2'", () => {
      mockState.appSettings = { uiVersion: "v2", accentColor: "emerald" };
      renderWithProviders(<Login />);
      expect(screen.getByText(/WARM EDITORIAL WEALTH/i)).toBeInTheDocument();
      expect(screen.getByText(/01 \/ PRIVACIDAD LOCAL-FIRST/i)).toBeInTheDocument();
    });

    it("renderiza LoginClassic cuando uiVersion === 'classic'", () => {
      mockState.appSettings = { uiVersion: "classic", accentColor: "emerald" };
      renderWithProviders(<Login />);
      expect(screen.getByText(/Bienvenido de nuevo/i)).toBeInTheDocument();
      expect(screen.queryByText(/01 \/ PRIVACIDAD LOCAL-FIRST/i)).toBeNull();
    });

    it("preserva LoginClassic cuando appSettings es indefinido", () => {
      mockState.appSettings = undefined;
      renderWithProviders(<Login />);
      expect(screen.queryByText(/01 \/ PRIVACIDAD LOCAL-FIRST/i)).toBeNull();
    });
  });

  /* ─────────────────────────────────────────────────────────────
     2. ANUAL V2 — INTERACCIONES Y MACROECONOMÍA
     ───────────────────────────────────────────────────────────── */
  describe("AnualV2 — Interacciones & Métricas", () => {
    it("despliega métricas de ingresos, gastos, ahorro y tasa calculada", () => {
      renderWithProviders(<Anual />);
      expect(screen.getByText("EJERCICIO FISCAL")).toBeInTheDocument();
      expect(screen.getAllByText("2026").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Tasa de ahorro:")).toBeInTheDocument();
    });

    it("permite navegar al año anterior y siguiente con chevron", () => {
      renderWithProviders(<Anual />);
      const prevBtn = screen.getByRole("button", { name: /Año anterior/i });
      fireEvent.click(prevBtn);
      expect(mockSetActive).toHaveBeenCalledWith(2025, 9);

      const nextBtn = screen.getByRole("button", { name: /Año siguiente/i });
      fireEvent.click(nextBtn);
      expect(mockSetActive).toHaveBeenCalledWith(2027, 9);
    });

    it("cambia entre pestañas de Categorías, Métodos y Metas", () => {
      renderWithProviders(<Anual />);
      const catTab = screen.getByRole("tab", { name: /categor[íi]as/i });
      fireEvent.click(catTab);
      expect(screen.getByText(/Gasto por Categoría en 2026/i)).toBeInTheDocument();

      const metodosTab = screen.getByRole("tab", { name: /m[ée]todos/i });
      fireEvent.click(metodosTab);
      expect(screen.getByText(/Distribución por Método de Pago/i)).toBeInTheDocument();

      const metasTab = screen.getByRole("tab", { name: /metas/i });
      fireEvent.click(metasTab);
      expect(screen.getByText(/Aportaciones y Conquistas en 2026/i)).toBeInTheDocument();
    });

    it("ejecuta exportación a CSV al hacer clic en el botón de descarga", () => {
      renderWithProviders(<Anual />);
      const downloadBtn = screen.getByRole("button", { name: /Exportar CSV/i });
      fireEvent.click(downloadBtn);
      // No debe lanzar errores y se procesa la descarga
      expect(downloadBtn).toBeInTheDocument();
    });
  });

  /* ─────────────────────────────────────────────────────────────
     3. HISTORIAL V2 — FILTROS, REACTIVIDAD Y AUDITORÍA
     ───────────────────────────────────────────────────────────── */
  describe("HistorialV2 — Búsqueda, Filtros y Paginación", () => {
    it("muestra las entradas agrupadas y formateadas", () => {
      renderWithProviders(<Historial />);
      expect(screen.getByText("Gasto de Supermercado $2,500")).toBeInTheDocument();
      expect(screen.getByText("Aporte a Fondo Emergencia $5,000")).toBeInTheDocument();
      expect(screen.getByText("Creado")).toBeInTheDocument();
      expect(screen.getByText("Editado")).toBeInTheDocument();
    });

    it("filtra reactivamente cuando el usuario introduce texto en el buscador", () => {
      renderWithProviders(<Historial />);
      const searchInput = screen.getByPlaceholderText(/Buscar por concepto, campo/i);
      fireEvent.change(searchInput, { target: { value: "Supermercado" } });

      expect(screen.getByText("Gasto de Supermercado $2,500")).toBeInTheDocument();
      expect(screen.queryByText("Aporte a Fondo Emergencia $5,000")).toBeNull();
    });

    it("filtra por entidad seleccionando una píldora (e.g. Metas)", () => {
      renderWithProviders(<Historial />);
      const metasPill = screen.getByRole("button", { name: "Metas" });
      fireEvent.click(metasPill);

      expect(screen.queryByText("Gasto de Supermercado $2,500")).toBeNull();
      expect(screen.getByText("Aporte a Fondo Emergencia $5,000")).toBeInTheDocument();
    });

    it("filtra por acción seleccionando píldora (e.g. Creados)", () => {
      renderWithProviders(<Historial />);
      const creadosPill = screen.getByRole("button", { name: "Creados" });
      fireEvent.click(creadosPill);

      expect(screen.getByText("Gasto de Supermercado $2,500")).toBeInTheDocument();
      expect(screen.queryByText("Aporte a Fondo Emergencia $5,000")).toBeNull();
    });

    it("abre diálogo de confirmación y llama a clearChangeLog", async () => {
      renderWithProviders(<Historial />);
      const clearBtn = screen.getByRole("button", { name: /Limpiar historial/i });
      fireEvent.click(clearBtn);

      expect(screen.getByText(/¿Borrar historial de auditoría\?/i)).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: /Eliminar|Confirmar/i });
      fireEvent.click(confirmBtn);

      expect(mockClearChangeLog).toHaveBeenCalled();
    });
  });

  /* ─────────────────────────────────────────────────────────────
     4. AJUSTES V2 — MASTER-DETAIL Y NAVEGACIÓN
     ───────────────────────────────────────────────────────────── */
  describe("AjustesV2 — Master-Detail & Navegación", () => {
    it("despliega el índice completo con códigos y metadatos", () => {
      renderWithProviders(<Ajustes />);
      expect(screen.getByText("01")).toBeInTheDocument();
      expect(screen.getByText("02")).toBeInTheDocument();
      expect(screen.getByText("03")).toBeInTheDocument();
      expect(screen.getByText("04")).toBeInTheDocument();
      expect(screen.getByText("05")).toBeInTheDocument();
      expect(screen.getByText("06")).toBeInTheDocument();
      expect(screen.getByText("07")).toBeInTheDocument();
      expect(screen.getByText("08")).toBeInTheDocument();
      expect(screen.getByText("Panel de Configuración")).toBeInTheDocument();
    });

    it("navega a una sección activa y renderiza sus controles específicos", async () => {
      renderWithProviders(<Ajustes />, "/ajustes?seccion=cuentas");
      expect(screen.getByRole("heading", { name: "Cuentas y Efectivo" })).toBeInTheDocument();
      expect(screen.getByText("Cuenta Principal")).toBeInTheDocument();
    });
  });

  /* ─────────────────────────────────────────────────────────────
     5. LOGIN V2 & SEGURIDAD / MFA
     ───────────────────────────────────────────────────────────── */
  describe("LoginV2 & Auth Helpers", () => {
    it("valida URIs de redirección permitidas y bloquea orígenes externos no autorizados", () => {
      // Nativas
      expect(isValidRedirectUri("app.financepal.com://auth/callback")).toBe(true);
      expect(isValidRedirectUri("financepal://auth/callback")).toBe(true);

      // Producción
      expect(isValidRedirectUri("https://finance-pal.app/auth/callback")).toBe(true);
      expect(isValidRedirectUri("https://financepal-web.vercel.app/auth/callback")).toBe(true);

      // Ataques o URLs no autorizadas
      expect(isValidRedirectUri("https://malicious-site.com/auth/callback")).toBe(false);
      expect(isValidRedirectUri("https://finance-pal.app/phishing")).toBe(false);
      expect(isValidRedirectUri("not-a-valid-url")).toBe(false);
    });

    it("calcula la robustez de contraseña correctamente", () => {
      const weak = calculatePasswordStrength("123456");
      expect(weak.score).toBe(0);

      const med = calculatePasswordStrength("12345");
      expect(med.score).toBe(1);

      const strong = calculatePasswordStrength("MiClaveSegura#2026!");
      expect(strong.score).toBeGreaterThanOrEqual(4);
      expect(strong.label).toMatch(/Fuerte|Muy fuerte/);
    });

    it("sanitiza errores de backend sin filtrar información confidencial", () => {
      expect(getSafeAuthError(new Error("Invalid login credentials"), "Error")).toBe(
        "Credenciales inválidas"
      );
      expect(getSafeAuthError(new Error("Email not confirmed"), "Error")).toBe(
        "Debes confirmar tu correo antes de iniciar sesión"
      );
      expect(getSafeAuthError(new Error("Database connection failed"), "Fallo general")).toBe(
        "Fallo general"
      );
    });

    it("permite alternar entre Iniciar Sesión y Registro", () => {
      renderWithProviders(<Login />);
      const toggleBtn = screen.getByRole("button", {
        name: /¿No tienes una cuenta aún\? Regístrate aquí/i,
      });
      fireEvent.click(toggleBtn);

      expect(screen.getByRole("heading", { name: "Crear una Cuenta" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Crear Cuenta/i })).toBeInTheDocument();
    });

    it("despliega pantalla de verificación 2FA cuando mfaRequired es true", () => {
      mockAuthState = {
        session: { user: { id: "user-123" } },
        mfaRequired: true,
      };
      renderWithProviders(<Login />);

      expect(screen.getByRole("heading", { name: "Verificación 2FA" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("123456")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Verificar código/i })).toBeInTheDocument();
    });
  });

  /* ─────────────────────────────────────────────────────────────
     6. CASOS LÍMITE & ACCESIBILIDAD (EDGE CASES & A11Y AUDIT)
     ───────────────────────────────────────────────────────────── */
  describe("Casos Límite & Accesibilidad (A11y & Edge Cases)", () => {
    it("AnualV2 maneja serie anual con ingresos = 0 y gastos > 0 sin mostrar NaN%", () => {
      mockState.transactions = [
        {
          id: "tx-gasto",
          concept: "Gasto sin ingreso",
          amount: 5000,
          type: "expense",
          category: "Servicios",
          date: "2026-03-10T10:00:00.000Z",
          paymentMethod: "card",
          accountId: "acc-1",
        },
      ];
      mockState.fixedItems = [];
      mockState.debts = [];
      mockState.goals = [];

      renderWithProviders(<Anual />);
      expect(screen.queryByText(/NaN/i)).toBeNull();
      expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("AnualV2 permite activar fila mensual con teclado (Enter)", () => {
      renderWithProviders(<Anual />);
      const octRow = screen.getByRole("button", { name: /Ver detalle mensual de Oct/i });
      fireEvent.keyDown(octRow, { key: "Enter", code: "Enter" });
      expect(mockSetActive).toHaveBeenCalledWith(2026, 9);
    });

    it("HistorialV2 maneja objetos circulares en 'from' y 'to' sin lanzar excepción", () => {
      const circularObj: any = { field: "meta" };
      circularObj.self = circularObj;

      mockState.changeLog = [
        {
          id: "log-circular",
          at: "2026-10-24T19:00:00.000Z",
          entity: "goal",
          entityId: "goal-1",
          action: "update",
          label: "Cambio con estructura circular",
          changes: [{ field: "meta_data", from: circularObj, to: circularObj }],
        },
      ];

      renderWithProviders(<Historial />);
      expect(screen.getByText("Cambio con estructura circular")).toBeInTheDocument();
      expect(screen.getAllByText("[Objeto]").length).toBeGreaterThanOrEqual(1);
    });

    it("HistorialV2 refleja estado aria-pressed en las píldoras de filtro", () => {
      renderWithProviders(<Historial />);
      const movimientosPill = screen.getByRole("button", { name: "Movimientos" });
      expect(movimientosPill).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(movimientosPill);
      expect(movimientosPill).toHaveAttribute("aria-pressed", "true");
    });

    it("HistorialV2 permite paginar con el botón 'Cargar más registros'", () => {
      // Generar 50 registros para forzar paginación (PAGE_SIZE = 40)
      const manyLogs: ChangeLogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        id: `log-batch-${i}`,
        at: new Date(2026, 9, 20, 10, i).toISOString(),
        entity: "transaction",
        entityId: `tx-${i}`,
        action: "create",
        label: `Movimiento generado ${i}`,
        changes: [],
      }));
      mockState.changeLog = manyLogs;

      renderWithProviders(<Historial />);
      const loadMoreBtn = screen.getByRole("button", { name: /Cargar más registros/i });
      expect(loadMoreBtn).toBeInTheDocument();
      expect(loadMoreBtn).toHaveTextContent("40 de 50");

      fireEvent.click(loadMoreBtn);
      // Al cargar más, todos los 50 se muestran y el botón desaparece
      expect(screen.queryByRole("button", { name: /Cargar más registros/i })).toBeNull();
      expect(screen.getByText("Movimiento generado 49")).toBeInTheDocument();
    });

    it("AjustesV2 se renderiza limpiamente cuando appSettings tiene propiedades parciales", () => {
      mockState.appSettings = { uiVersion: "v2" } as any;
      renderWithProviders(<Ajustes />);
      expect(screen.getByRole("heading", { name: "Ajustes" })).toBeInTheDocument();
      expect(screen.getByText("01")).toBeInTheDocument();
    });
  });
});
