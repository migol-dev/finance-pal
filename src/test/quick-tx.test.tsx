import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuickTransactionSheet } from "@/components/app/QuickTransactionSheet";
import { useQuickTxModal } from "@/store/ui-quick-tx-store";
import type { Account } from "@/lib/finance";

if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
}

const { mockAddTransaction, mockUploadReceipt, mockPrepareReceiptImage } = vi.hoisted(() => ({
  mockAddTransaction: vi.fn(),
  mockUploadReceipt: vi.fn(),
  mockPrepareReceiptImage: vi.fn(),
}));

let mockAccounts: Account[] = [];

vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    accounts: mockAccounts,
    customCategories: [],
    addTx: mockAddTransaction,
    addTransaction: mockAddTransaction,
    uploadReceipt: mockUploadReceipt,
    addCustomCategory: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseEnabled: true,
}));

vi.mock("@/lib/receipt-pipeline", () => ({
  prepareReceiptImage: mockPrepareReceiptImage,
}));

function renderSheet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <QuickTransactionSheet />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("QuickTransactionSheet — Smart Payment Method & Transfer Details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddTransaction.mockResolvedValue("tx-created-1");
    mockUploadReceipt.mockResolvedValue({
      storagePath: "u1/tx-created-1.webp",
      receiptRef: "sb:receipts/u1/tx-created-1.webp",
      publicUrl: "https://cdn.test/receipt.webp",
    });
    mockPrepareReceiptImage.mockResolvedValue({
      dataUrl: "data:image/webp;base64,QUFB",
      blob: new Blob(["ok"], { type: "image/webp" }),
      mimeType: "image/webp",
      width: 400,
      height: 300,
      originalSize: 100,
      compressedSize: 40,
    });
    mockAccounts = [
      { id: "acc-cash", name: "Dinero Físico", type: "cash", initialBalance: 500, currency: "MXN" },
      { id: "acc-bank", name: "Santander", type: "bank", initialBalance: 2500, currency: "MXN" },
    ];
    act(() => {
      useQuickTxModal.getState().closeQuickTx();
    });
  });

  it("selecciona automáticamente 'cash' para cuentas de efectivo y oculta detalles de transferencia", async () => {
    act(() => {
      useQuickTxModal.getState().openQuickTx("expense");
    });
    renderSheet();

    expect(screen.getByTestId("quick-tx-auto-cash")).toHaveTextContent(/Efectivo · Automático/i);
    expect(screen.queryByRole("radiogroup", { name: "Método de pago" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Configurar detalles/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "85" } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Supermercado/), {
      target: { value: "Tacos" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Guardar Gasto/i }));
    });

    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-cash",
        paymentMethod: "cash",
        amount: 85,
        concept: "Tacos",
      })
    );
  });

  it("habilita Tarjeta y Transferencia en cuenta bancaria, despliega detalles (Remitente/Destinatario) y adjunta comprobante", async () => {
    const user = userEvent.setup();
    mockAccounts = [
      { id: "acc-bank", name: "Santander", type: "bank", initialBalance: 2500, currency: "MXN" },
      { id: "acc-cash", name: "Dinero Físico", type: "cash", initialBalance: 500, currency: "MXN" },
    ];

    act(() => {
      useQuickTxModal.getState().openQuickTx("income");
    });
    renderSheet();

    const radioGroup = screen.getByRole("radiogroup", { name: "Método de pago" });
    expect(radioGroup).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Tarjeta/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText(/Configurar detalles/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Transferencia/i }));
    const configBtn = screen.getByRole("button", { name: /Configurar detalles/i });
    expect(configBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(configBtn);
    expect(configBtn).toHaveAttribute("aria-expanded", "true");

    // En modo ingreso, la etiqueta debe decir Remitente
    expect(screen.getByLabelText("Remitente")).toBeInTheDocument();
    // Si cambiamos a Gasto, la etiqueta cambia a Destinatario
    await user.click(screen.getByRole("button", { name: /^Gasto$/i }));
    expect(screen.getByLabelText("Destinatario")).toBeInTheDocument();
    // Volvemos a Ingreso para guardar
    await user.click(screen.getByRole("button", { name: /^Ingreso$/i }));

    await user.type(screen.getByLabelText("Remitente"), "Nómina ACME");
    await user.type(screen.getByLabelText("Banco"), "BBVA");
    await user.type(screen.getByLabelText("CLABE o últimos 4 dígitos"), "4821");

    const fileInput = screen.getByLabelText(/Adjuntar comprobante/i) as HTMLInputElement;
    const pngFile = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "recibo.png", {
      type: "image/png",
    });
    await user.upload(fileInput, pngFile);

    await waitFor(() => expect(mockPrepareReceiptImage).toHaveBeenCalledTimes(1));
    expect(await screen.findByAltText("Comprobante adjunto")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "4200" } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Nómina/), {
      target: { value: "Pago quincenal" },
    });

    await user.click(screen.getByRole("button", { name: /Guardar Ingreso/i }));

    await waitFor(() => expect(mockAddTransaction).toHaveBeenCalledTimes(1));
    expect(mockAddTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "income",
        accountId: "acc-bank",
        paymentMethod: "transfer",
        externalPayee: {
          name: "Nómina ACME",
          bank: "BBVA",
          clabe: "4821",
        },
        receipt: "data:image/webp;base64,QUFB",
      })
    );
    await waitFor(() =>
      expect(mockUploadReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: "tx-created-1",
          mimeType: "image/webp",
        })
      )
    );
  });

  it("rechaza guardado si CLABE/terminación tiene longitud inválida diferente de 4 o 18 dígitos", async () => {
    const user = userEvent.setup();
    mockAccounts = [
      { id: "acc-bank", name: "Santander", type: "bank", initialBalance: 2500, currency: "MXN" },
    ];

    act(() => {
      useQuickTxModal.getState().openQuickTx("expense");
    });
    renderSheet();

    await user.click(screen.getByRole("radio", { name: /Transferencia/i }));
    await user.click(screen.getByRole("button", { name: /Configurar detalles/i }));
    await user.type(screen.getByLabelText("CLABE o últimos 4 dígitos"), "12345");

    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "100" } });
    fireEvent.change(screen.getByPlaceholderText(/Ej\. Supermercado/), {
      target: { value: "Servicio" },
    });

    await user.click(screen.getByRole("button", { name: /Guardar Gasto/i }));

    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(screen.getByText(/exactamente 4 últimos dígitos o una CLABE de 18 dígitos/i)).toBeInTheDocument();
  });
});
