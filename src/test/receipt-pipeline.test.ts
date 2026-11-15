import { describe, it, expect, vi, afterEach } from "vitest";
import {
  RECEIPT_REF_PREFIX,
  isInlineReceipt,
  isStorageReceiptRef,
  parseReceiptRef,
  toReceiptRef,
} from "@/lib/receipt-ref";
import {
  MAX_RAW_RECEIPT_BYTES,
  detectImageMimeFromBytes,
  extensionForReceiptMime,
  prepareReceiptImage,
} from "@/lib/receipt-pipeline";

const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP_MAGIC = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("receipt-ref helpers", () => {
  it("construye y parsea referencias persistentes sb:receipts/", () => {
    const ref = toReceiptRef("user-1/tx-99.webp");
    expect(ref).toBe(`${RECEIPT_REF_PREFIX}user-1/tx-99.webp`);
    expect(isStorageReceiptRef(ref)).toBe(true);
    expect(isInlineReceipt(ref)).toBe(false);
    expect(parseReceiptRef(ref)).toEqual({
      kind: "storage",
      path: "user-1/tx-99.webp",
    });
  });

  it("extrae storagePath de URLs firmadas legadas de Supabase Storage", () => {
    const legacy =
      "https://abcxyz.supabase.co/storage/v1/object/sign/receipts/user-1/tx-12.png?token=expired-jwt";
    expect(isStorageReceiptRef(legacy)).toBe(true);
    expect(parseReceiptRef(legacy)).toEqual({
      kind: "storage",
      path: "user-1/tx-12.png",
    });
  });

  it("distingue data URLs inline, blob URLs y valores vacios", () => {
    expect(parseReceiptRef("data:image/webp;base64,AAAA")).toEqual({
      kind: "inline",
      url: "data:image/webp;base64,AAAA",
    });
    expect(isInlineReceipt("blob:https://app.test/123")).toBe(true);
    expect(parseReceiptRef("")).toBeNull();
    expect(parseReceiptRef(undefined)).toBeNull();
  });
});

describe("receipt-pipeline validation & compression", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("detecta correctamente magic bytes de JPEG, PNG y WebP", () => {
    expect(detectImageMimeFromBytes(JPEG_MAGIC)).toBe("image/jpeg");
    expect(detectImageMimeFromBytes(PNG_MAGIC)).toBe("image/png");
    expect(detectImageMimeFromBytes(WEBP_MAGIC)).toBe("image/webp");
    expect(detectImageMimeFromBytes(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeNull();
    expect(extensionForReceiptMime("image/jpeg")).toBe("jpg");
    expect(extensionForReceiptMime("image/png")).toBe("png");
    expect(extensionForReceiptMime("image/webp")).toBe("webp");
  });

  it("rechaza archivos vacios, SVG y archivos con extension/MIME falsificado", async () => {
    await expect(prepareReceiptImage(new File([], "empty.png", { type: "image/png" }))).rejects.toThrow(
      /vacío/i
    );

    const svgFile = new File(["<svg></svg>"], "fake.svg", { type: "image/svg+xml" });
    await expect(prepareReceiptImage(svgFile)).rejects.toThrow(/JPG, PNG o WebP/i);

    const spoofedPng = new File(["<html>alert(1)</html>"], "ticket.png", { type: "image/png" });
    await expect(prepareReceiptImage(spoofedPng)).rejects.toThrow(/no corresponde/i);
  });

  it("rechaza archivos mayores a 10 MB", async () => {
    const oversized = {
      size: MAX_RAW_RECEIPT_BYTES + 1,
      type: "image/jpeg",
    } as File;
    await expect(prepareReceiptImage(oversized)).rejects.toThrow(/10 MB/i);
  });

  it("procesa bytes validos cuando no hay canvas 2D disponible (fallback seguro)", async () => {
    const file = new File([PNG_MAGIC], "comprobante.png", { type: "image/png" });
    const prepared = await prepareReceiptImage(file);
    expect(prepared.mimeType).toBe("image/png");
    expect(prepared.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(prepared.originalSize).toBe(PNG_MAGIC.length);
  });

  it("redimensiona a <= maxDimension y re-codifica a WebP eliminando EXIF cuando hay canvas 2D", async () => {
    const drawImage = vi.fn();
    let lastCanvas: { width: number; height: number } | null = null;
    const origCreate = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag !== "canvas") return origCreate(tag);
      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage }),
        toBlob: (cb: (b: Blob | null) => void, mime: string) => {
          lastCanvas = { width: fakeCanvas.width, height: fakeCanvas.height };
          cb(new Blob([WEBP_MAGIC], { type: mime }));
        },
      };
      return fakeCanvas as unknown as HTMLElement;
    }) as typeof document.createElement);

    class MockImage {
      width = 3200;
      height = 1600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);

    const jpegFile = new File([JPEG_MAGIC], "foto-exif.jpg", { type: "image/jpeg" });
    const prepared = await prepareReceiptImage(jpegFile, { maxDimension: 1600, quality: 0.8 });

    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(lastCanvas).toEqual({ width: 1600, height: 800 });
    expect(prepared.width).toBe(1600);
    expect(prepared.height).toBe(800);
    expect(prepared.mimeType).toBe("image/webp");
    expect(prepared.dataUrl.startsWith("data:image/webp;base64,")).toBe(true);
  });
});
