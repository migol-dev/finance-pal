export const MAX_RAW_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB máximo de entrada
export const MAX_UPLOAD_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB máximo final para Storage

export type SupportedReceiptMime = "image/webp" | "image/jpeg" | "image/png";

export interface PreparedReceipt {
  dataUrl: string;
  blob: Blob;
  mimeType: SupportedReceiptMime;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

export interface PrepareReceiptOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Valida magic bytes reales del archivo para evitar archivos falsificados (HTML/SVG/PDF renombrados).
 */
export function detectImageMimeFromBytes(bytes: Uint8Array): SupportedReceiptMime | null {
  if (bytes.length < 4) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function extensionForReceiptMime(mime: string): "webp" | "jpg" | "png" {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  return "webp";
}

async function readHeadBytes(file: Blob): Promise<Uint8Array> {
  const slice = file.slice(0, 16);
  if (typeof slice.arrayBuffer === "function") {
    const buffer = await slice.arrayBuffer();
    return new Uint8Array(buffer);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
    reader.readAsArrayBuffer(slice);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo convertir la imagen."));
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mime, quality);
  });
}

async function reencodeStripExif(
  sourceDataUrl: string,
  maxDimension: number,
  quality: number
): Promise<{ blob: Blob; mimeType: SupportedReceiptMime; width: number; height: number } | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return null;
  }

  const probeCanvas = document.createElement("canvas");
  const has2d = Boolean(probeCanvas.getContext?.("2d"));
  if (!has2d) {
    return null;
  }

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => resolve(null), 5000);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    image.src = sourceDataUrl;
  });

  if (!img || !img.width || !img.height) {
    return null;
  }

  let width = img.width;
  let height = img.height;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.max(1, Math.round((height * maxDimension) / width));
      width = maxDimension;
    } else {
      width = Math.max(1, Math.round((width * maxDimension) / height));
      height = maxDimension;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, width, height);

  // Al redibujar en Canvas y re-codificar, eliminamos metadatos EXIF/GPS del archivo original
  let encoded = await canvasToBlob(canvas, "image/webp", quality);
  let targetMime: SupportedReceiptMime = "image/webp";

  if (!encoded || (encoded.type && encoded.type !== "image/webp")) {
    const jpegBlob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (jpegBlob) {
      encoded = jpegBlob;
      targetMime = "image/jpeg";
    }
  }

  if (!encoded) return null;

  return {
    blob: encoded,
    mimeType: targetMime,
    width,
    height,
  };
}

/**
 * Valida tamaño y magic bytes reales de la imagen, redimensiona a <= 1600px,
 * re-codifica a WebP/JPEG (eliminando EXIF) y verifica el tope de 5 MB para Storage.
 */
export async function prepareReceiptImage(
  file: File | Blob,
  options: PrepareReceiptOptions = {}
): Promise<PreparedReceipt> {
  if (!file || file.size <= 0) {
    throw new Error("El archivo seleccionado está vacío.");
  }
  if (file.size > MAX_RAW_RECEIPT_BYTES) {
    throw new Error("La imagen excede el límite máximo de 10 MB.");
  }

  // Rechazar explícitamente SVG/PDF/tipos no rasterizados si el navegador declara MIME
  if (file.type && (file.type === "image/svg+xml" || !file.type.startsWith("image/"))) {
    throw new Error("Solo se permiten imágenes JPG, PNG o WebP.");
  }

  const head = await readHeadBytes(file);
  const detectedMime = detectImageMimeFromBytes(head);
  if (!detectedMime) {
    throw new Error("El archivo no corresponde a una imagen JPG, PNG o WebP válida.");
  }

  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.82;

  const rawBlob = file.type === detectedMime ? file : new Blob([file], { type: detectedMime });
  const rawDataUrl = await blobToDataUrl(rawBlob);

  const reencoded = await reencodeStripExif(rawDataUrl, maxDimension, quality);
  if (reencoded) {
    if (reencoded.blob.size > MAX_UPLOAD_RECEIPT_BYTES) {
      throw new Error("El comprobante optimizado supera los 5 MB permitidos.");
    }
    const dataUrl = await blobToDataUrl(reencoded.blob);
    return {
      dataUrl,
      blob: reencoded.blob,
      mimeType: reencoded.mimeType,
      width: reencoded.width,
      height: reencoded.height,
      originalSize: file.size,
      compressedSize: reencoded.blob.size,
    };
  }

  if (file.size > MAX_UPLOAD_RECEIPT_BYTES) {
    throw new Error("La imagen supera el límite de 5 MB para almacenamiento seguro.");
  }

  return {
    dataUrl: rawDataUrl,
    blob: rawBlob,
    mimeType: detectedMime,
    width: 0,
    height: 0,
    originalSize: file.size,
    compressedSize: file.size,
  };
}
