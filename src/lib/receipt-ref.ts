export const RECEIPT_REF_PREFIX = "sb:receipts/";

export type ParsedReceiptRef =
  | { kind: "storage"; path: string }
  | { kind: "inline"; url: string }
  | { kind: "external"; url: string };

/**
 * Construye la referencia persistente no-expirable para guardar en `transactions.receipt`.
 * Ejemplo: `sb:receipts/<userId>/<txId>.webp`
 */
export function toReceiptRef(storagePath: string): string {
  const clean = storagePath
    .trim()
    .replace(/^\/+/, "")
    .replace(/^receipts\//, "");
  return `${RECEIPT_REF_PREFIX}${clean}`;
}

export function isInlineReceipt(value?: string | null): boolean {
  if (!value) return false;
  return value.startsWith("data:image/") || value.startsWith("blob:");
}

export function isStorageReceiptRef(value?: string | null): boolean {
  return parseReceiptRef(value)?.kind === "storage";
}

/**
 * Parsea una referencia de comprobante en sus 3 formas soportadas:
 * - Nueva referencia persistente: `sb:receipts/<userId>/<file>`
 * - URL firmada o de objeto legada de Supabase Storage (`/storage/v1/object/(sign|public|authenticated)/receipts/<path>`)
 * - Recurso inline local (`data:image/...`, `blob:...`) o externo (`https://...`)
 */
export function parseReceiptRef(value?: string | null): ParsedReceiptRef | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(RECEIPT_REF_PREFIX)) {
    const path = trimmed.slice(RECEIPT_REF_PREFIX.length).replace(/^\/+/, "");
    return path ? { kind: "storage", path } : null;
  }

  if (isInlineReceipt(trimmed)) {
    return { kind: "inline", url: trimmed };
  }

  // Retrocompatibilidad: extraer storagePath desde URLs firmadas antiguas guardadas en DB
  if (trimmed.includes("/storage/v1/object/") && trimmed.includes("/receipts/")) {
    try {
      const parsed = new URL(trimmed, "https://local.invalid");
      const match = parsed.pathname.match(
        /\/storage\/v1\/object\/(?:sign|public|authenticated)\/receipts\/(.+)$/
      );
      if (match && match[1]) {
        const path = decodeURIComponent(match[1]).replace(/^\/+/, "");
        if (path) return { kind: "storage", path };
      }
    } catch {
      // Continuar al fallback external
    }
  }

  return { kind: "external", url: trimmed };
}
