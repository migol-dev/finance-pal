import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Movimientos from "@/pages/Movimientos";
import { MovimientosV2 } from "@/components/movimientos/MovimientosV2";
import type { Account, Transaction, Debt, AppSettings } from "@/lib/finance";

// Mock de ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

const mockAddTx = vi.fn();
const mockUpdateTx = vi.fn();
const mockRemoveTx = vi.fn();
const mockSetSyncFiltersToURL = vi.fn();

let mockState = {
  accounts: [] as Account[],
  transactions: [] as Transaction[],
  debts: [] as Debt[],
  activeYear: 2026,
  activeMonth: 9, // Octubre (0-indexed: 9 = Octubre)
  appSettings: { uiVersion: "v2", accentColor: "emerald" } as AppSettings | undefined,
  syncFiltersToURL: false,
};

vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    accounts: mockState.accounts,
    transactions: mockState.transactions,
    debts: mockState.debts,
    activeYear: mockState.activeYear,
    activeMonth: mockState.activeMonth,
    appSettings: mockState.appSettings,
    uiVersion: mockState.appSettings?.uiVersion ?? "v2",
    addTx: mockAddTx,
    updateTx: mockUpdateTx,
    removeTx: mockRemoveTx,
    syncFiltersToURL: mockState.syncFiltersToURL,
    setSyncFiltersToURL: mockSetSyncFiltersToURL,
  }),
}));

describe("Sprint 4 — MovimientosV2 & Dual Dispatcher Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      accounts: [
        {
          id: "acc-1",
          name: "BBVA Nómina",
          type: "bank",
          initialBalance: 20000,
          color: "blue",
        },
        {
          id: "acc-2",
          name: "Cartera Efectivo",
          type: "cash",
          initialBalance: 2500,
          color: "emerald",
        },
      ],
      transactions: [
        {
          id: "tx-1",
          concept: "Nómina Quincenal",
          amount: 15000,
          type: "income",
          date: "2026-10-15T12:00:00.000Z",
          category: "Trabajo",
          accountId: "acc-1",
          paymentMethod: "transfer",
        },
        {
          id: "tx-2",
          concept: "Supermercado Semanal",
          amount: 3200,
          type: "expense",
          date: "2026-10-16T12:00:00.000Z",
          category: "Alimentación",
          accountId: "acc-1",
          paymentMethod: "card",
        },
        {
          id: "tx-3",
          concept: "Café de Especialidad",
          amount: 120,
          type: "expense",
          date: "2026-10-16T15:30:00.000Z",
          category: "Alimentación",
          accountId: "acc-2",
          paymentMethod: "cash",
        },
      ],
      debts: [
        {
          id: "debt-1",
          person: "Carlos Méndez",
          concept: "Préstamo emergente",
          amount: 1000,
          date: "2026-10-16T10:00:00.000Z",
          accountId: "acc-1",
          payments: [],
        },
      ],
      activeYear: 2026,
      activeMonth: 9, // Octubre
      appSettings: { uiVersion: "v2", accentColor: "emerald" },
      syncFiltersToURL: false,
    };
  });

  // 1. Despachador dual
  it("renderiza MovimientosV2 cuando appSettings.uiVersion es 'v2'", () => {
    mockState.appSettings = { uiVersion: "v2" };
    render(
      <MemoryRouter>
        <Movimientos />
      </MemoryRouter>
    );

    // MovimientosV2 incluye el botón "Nuevo movimiento" y el selector de rango temporal "Mes activo"
    expect(screen.getAllByRole("button", { name: /nuevo movimiento/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Mes activo")).toBeInTheDocument();
  });

  it("renderiza MovimientosClassic cuando appSettings.uiVersion es 'classic'", () => {
    mockState.appSettings = { uiVersion: "classic" };
    render(
      <MemoryRouter>
        <Movimientos />
      </MemoryRouter>
    );

    // En MovimientosClassic el botón se titula "Nuevo" con icono Plus
    expect(screen.getByRole("button", { name: /nuevo/i })).toBeInTheDocument();
    expect(screen.getByText("Todo")).toBeInTheDocument();
  });

  it("renderiza MovimientosClassic cuando appSettings es undefined (compatibilidad de snapshots)", () => {
    mockState.appSettings = undefined;
    render(
      <MemoryRouter>
        <Movimientos />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /nuevo/i })).toBeInTheDocument();
  });

  // 2. Agrupación por días y subtotales diarios
  it("agrupa transacciones por día y calcula los subtotales diarios en números tabulares", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    // Comprobar cabecera de días
    expect(screen.getByText(/15 de octubre, 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/16 de octubre, 2026/i)).toBeInTheDocument();

    // Comprobar conceptos renderizados
    expect(screen.getByText("Nómina Quincenal")).toBeInTheDocument();
    expect(screen.getByText("Supermercado Semanal")).toBeInTheDocument();
    expect(screen.getByText("Café de Especialidad")).toBeInTheDocument();

    // En el día 15 sólo hay ingreso de $15,000 -> Subtotal: +$15,000
    expect(screen.getAllByText("+$15,000").length).toBeGreaterThanOrEqual(2);

    // En el día 16 hay gastos: $3,200 (Super), $120 (Café) y préstamo virtual $1,000 (Deuda) -> Total -$4,320
    expect(screen.getByText("-$4,320")).toBeInTheDocument();
  });

  // 3. Filtrado interactivo
  it("filtra transacciones por tipo al hacer clic en las píldoras de tipo", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    // Inicialmente se muestran ingresos y gastos
    expect(screen.getByText("Nómina Quincenal")).toBeInTheDocument();
    expect(screen.getByText("Supermercado Semanal")).toBeInTheDocument();

    // Filtrar sólo gastos
    const gastosPill = screen.getByRole("button", { name: "Gastos" });
    fireEvent.click(gastosPill);

    expect(screen.queryByText("Nómina Quincenal")).not.toBeInTheDocument();
    expect(screen.getByText("Supermercado Semanal")).toBeInTheDocument();
    expect(screen.getByText("Café de Especialidad")).toBeInTheDocument();

    // Filtrar sólo ingresos
    const ingresosPill = screen.getByRole("button", { name: "Ingresos" });
    fireEvent.click(ingresosPill);

    expect(screen.getByText("Nómina Quincenal")).toBeInTheDocument();
    expect(screen.queryByText("Supermercado Semanal")).not.toBeInTheDocument();
  });

  it("filtra transacciones mediante búsqueda por texto reactiva", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/buscar por concepto, categoría o método/i);
    fireEvent.change(searchInput, { target: { value: "Café" } });

    expect(screen.getByText("Café de Especialidad")).toBeInTheDocument();
    expect(screen.queryByText("Nómina Quincenal")).not.toBeInTheDocument();
    expect(screen.queryByText("Supermercado Semanal")).not.toBeInTheDocument();
  });

  it("muestra el botón de limpiar filtros y restaura todos los movimientos", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText(/buscar por concepto, categoría o método/i);
    fireEvent.change(searchInput, { target: { value: "Nómina" } });

    const clearButton = screen.getByRole("button", { name: /limpiar filtros/i });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(screen.getByText("Nómina Quincenal")).toBeInTheDocument();
    expect(screen.getByText("Supermercado Semanal")).toBeInTheDocument();
    expect(screen.getByText("Café de Especialidad")).toBeInTheDocument();
  });

  // 4. Arquitectura espacial Master-Detail en PC
  it("selecciona una transacción y muestra sus detalles en el panel inspector", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    // Al inicio, el inspector muestra el estado desocupado
    expect(screen.getByText("Detalle de Movimiento")).toBeInTheDocument();

    // Seleccionar 'Nómina Quincenal'
    const row = screen.getByText("Nómina Quincenal");
    fireEvent.click(row);

    // El panel inspector se actualiza con los detalles
    expect(screen.getByText("Inspector de Movimiento")).toBeInTheDocument();
    const inspector = screen.getByRole("complementary", { name: /inspector de detalle/i });
    expect(within(inspector).getByText("Nómina Quincenal")).toBeInTheDocument();
    expect(within(inspector).getByText("+$15,000")).toBeInTheDocument();
    expect(within(inspector).getByText("BBVA Nómina")).toBeInTheDocument();
    expect(within(inspector).getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  it("permite entrar a modo edición en el inspector y llamar a updateTx al guardar", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    // Seleccionar 'Supermercado Semanal'
    fireEvent.click(screen.getByText("Supermercado Semanal"));

    const inspector = screen.getByRole("complementary", { name: /inspector de detalle/i });
    const editBtn = within(inspector).getByRole("button", { name: /editar/i });
    fireEvent.click(editBtn);

    // Modificar concepto
    const conceptInput = within(inspector).getByDisplayValue("Supermercado Semanal");
    fireEvent.change(conceptInput, { target: { value: "Supermercado Grande" } });

    // Guardar cambios
    const saveBtn = within(inspector).getByRole("button", { name: /guardar cambios/i });
    fireEvent.click(saveBtn);

    expect(mockUpdateTx).toHaveBeenCalledTimes(1);
    expect(mockUpdateTx).toHaveBeenCalledWith(
      "tx-2",
      expect.objectContaining({
        concept: "Supermercado Grande",
        amount: 3200,
      })
    );
  });

  it("permite eliminar una transacción con confirmación llamando a removeTx", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    // Seleccionar 'Café de Especialidad'
    fireEvent.click(screen.getByText("Café de Especialidad"));

    const inspector = screen.getByRole("complementary", { name: /inspector de detalle/i });
    const deleteBtn = within(inspector).getByRole("button", { name: /eliminar movimiento/i });
    fireEvent.click(deleteBtn);

    // Diálogo de confirmación
    const confirmDeleteBtn = screen.getByRole("button", { name: "Eliminar" });
    fireEvent.click(confirmDeleteBtn);

    expect(mockRemoveTx).toHaveBeenCalledTimes(1);
    expect(mockRemoveTx).toHaveBeenCalledWith("tx-3");
  });

  // 5. Soporte de filas virtuales de deuda
  it("muestra transacciones de deuda con badge y botón de navegación", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    expect(screen.getByText("Préstamo a Carlos Méndez")).toBeInTheDocument();
    expect(screen.getByText("Deuda")).toBeInTheDocument();

    // Al seleccionar la deuda virtual
    fireEvent.click(screen.getByText("Préstamo a Carlos Méndez"));

    const inspector = screen.getByRole("complementary", { name: /inspector de detalle/i });
    expect(within(inspector).getByText(/este movimiento está vinculado al módulo de deudas/i)).toBeInTheDocument();
    expect(within(inspector).getByRole("button", { name: /ver en deudas/i })).toBeInTheDocument();
    // No debe permitir edición directa en el inspector para deudas virtuales
    expect(within(inspector).queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
  });

  // 6. Estado vacío cuando no hay transacciones
  it("muestra el estado vacío cuando no existen transacciones", () => {
    mockState.transactions = [];
    mockState.debts = [];

    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    expect(screen.getByText("Sin movimientos registrados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear primer movimiento/i })).toBeInTheDocument();
  });

  // 7. Registro de nuevo movimiento
  it("registra un nuevo movimiento exitosamente al abrir el modal y llamar a addTx", () => {
    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    // Abrir modal de nuevo movimiento
    const newBtns = screen.getAllByRole("button", { name: /nuevo movimiento/i });
    fireEvent.click(newBtns[0]);

    // Verificar que el diálogo se abre
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Registra un gasto, ingreso, ahorro o traspaso en tu cuenta.")).toBeInTheDocument();

    // Llenar formulario
    const conceptInput = screen.getByPlaceholderText(/ej\. compra de despensa/i);
    fireEvent.change(conceptInput, { target: { value: "Gasolina fin de semana" } });

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "650" } });

    // Guardar
    const saveBtn = screen.getByRole("button", { name: /registrar movimiento/i });
    fireEvent.click(saveBtn);

    expect(mockAddTx).toHaveBeenCalledTimes(1);
    expect(mockAddTx).toHaveBeenCalledWith(
      expect.objectContaining({
        concept: "Gasolina fin de semana",
        amount: 650,
      })
    );
  });

  // 8. Traspaso entre cuentas
  it("maneja traspasos entre cuentas mostrando indicador ⇄ y cuentas origen y destino", () => {
    mockState.transactions.push({
      id: "tx-transfer",
      concept: "Traspaso de nómina a ahorros",
      amount: 5000,
      type: "transfer",
      date: "2026-10-18T12:00:00.000Z",
      category: "Otros",
      accountId: "acc-1",
      transferToAccountId: "acc-2",
      paymentMethod: "transfer",
    });

    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    // Debe mostrar la fila del traspaso con símbolo ⇄
    expect(screen.getByText("Traspaso de nómina a ahorros")).toBeInTheDocument();
    expect(screen.getByText("⇄$5,000")).toBeInTheDocument();

    // Al seleccionarlo, el inspector muestra ambas cuentas
    fireEvent.click(screen.getByText("Traspaso de nómina a ahorros"));
    const inspector = screen.getByRole("complementary", { name: /inspector de detalle/i });
    expect(within(inspector).getByText("Cuenta destino")).toBeInTheDocument();
    expect(within(inspector).getByText("Cartera Efectivo")).toBeInTheDocument();
  });

  // 9. Drawer móvil en pantallas pequeñas
  it("abre el drawer móvil al hacer tap en una transacción cuando la pantalla es móvil", () => {
    // Simular viewport móvil
    window.innerWidth = 375;

    render(
      <MemoryRouter>
        <MovimientosV2 />
      </MemoryRouter>
    );

    const row = screen.getByText("Nómina Quincenal");
    fireEvent.click(row);

    // En móvil, se abre el drawer con rol dialog o drawer title
    expect(screen.getByText("Inspecciona o edita los detalles de la transacción.")).toBeInTheDocument();
  });
});

