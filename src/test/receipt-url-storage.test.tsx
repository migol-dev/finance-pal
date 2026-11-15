import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const { mockUpload, mockCreateSignedUrl, mockRemove } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockCreateSignedUrl: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseEnabled: true,
  supabase: {
    storage: {
      from: () => ({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
        remove: mockRemove,
      }),
    },
  },
}));

import { uploadReceipt, getReceiptSignedUrl } from "@/services/storage.service";
import { useReceiptUrl } from "@/hooks/queries/useReceiptUrl";
import { ReceiptPreview } from "@/components/app/ReceiptPreview";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("Secure Storage Receipts & useReceiptUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn.test/signed-receipt-1h.webp" },
      error: null,
    });
  });

  it("uploadReceipt devuelve storagePath con extension y receiptRef sb:receipts/...", async () => {
    const result = await uploadReceipt({
      receiptId: "tx-abc",
      userId: "user-42",
      file: new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" }),
      mimeType: "image/webp",
    });

    expect(mockUpload).toHaveBeenCalledWith(
      "user-42/tx-abc.webp",
      expect.any(Blob),
      expect.objectContaining({ contentType: "image/webp", upsert: true })
    );
    expect(result.storagePath).toBe("user-42/tx-abc.webp");
    expect(result.receiptRef).toBe("sb:receipts/user-42/tx-abc.webp");
    expect(result.publicUrl).toBe("https://cdn.test/signed-receipt-1h.webp");
  });

  it("useReceiptUrl resuelve sb:receipts/... bajo demanda y reutiliza signed URL para URLs legadas", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useReceiptUrl("sb:receipts/user-42/tx-abc.webp"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.url).toBe("https://cdn.test/signed-receipt-1h.webp"));
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user-42/tx-abc.webp", 3600);

    const legacyUrl =
      "https://proj.supabase.co/storage/v1/object/sign/receipts/user-42/tx-old.png?token=expired";
    const { result: legacyRes } = renderHook(() => useReceiptUrl(legacyUrl), { wrapper });
    await waitFor(() => expect(legacyRes.current.url).toBe("https://cdn.test/signed-receipt-1h.webp"));
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user-42/tx-old.png", 3600);
  });

  it("useReceiptUrl devuelve data URLs inline sin llamadas de red", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useReceiptUrl("data:image/webp;base64,AAAA"), { wrapper });
    expect(result.current.url).toBe("data:image/webp;base64,AAAA");
    expect(result.current.isStorage).toBe(false);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("ReceiptPreview muestra la imagen resuelta y dispara onRemove al pulsar quitar", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    const Wrapper = makeWrapper();

    render(
      <Wrapper>
        <ReceiptPreview receipt="sb:receipts/user-42/tx-abc.webp" onRemove={onRemove} />
      </Wrapper>
    );

    const img = await screen.findByAltText("Comprobante adjunto");
    expect(img).toHaveAttribute("src", "https://cdn.test/signed-receipt-1h.webp");

    await user.click(screen.getByRole("button", { name: "Quitar comprobante" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(getReceiptSignedUrl).toBeDefined();
  });
});
