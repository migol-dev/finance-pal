import { supabase } from '@/lib/supabase';
import { AppError, ErrorCodes } from '@/lib/app-error';
// NO importar React, NO importar hooks, NO importar Zustand

// Nombre del bucket en Supabase Storage
const RECEIPTS_BUCKET = 'receipts';

// Payload de entrada para subir un recibo
export interface ReceiptUploadInput {
  /** ID único del recibo — se usa como nombre de archivo en Storage */
  receiptId: string;
  /** ID del usuario autenticado — define el prefijo de carpeta */
  userId: string;
  /**
   * Datos del archivo. Acepta:
   *   - data URL (string): "data:image/jpeg;base64,..."
   *   - Blob / File: objeto binario directo
   */
  file: string | Blob | File;
  /** MIME type del archivo (ej. "image/jpeg", "image/png", "image/webp") */
  mimeType: string;
}

// Resultado de una subida exitosa
export interface ReceiptUploadResult {
  /** Ruta relativa dentro del bucket: "{userId}/{receiptId}" */
  storagePath: string;
  /** URL pública firmada o anónima servida por Supabase CDN */
  publicUrl: string;
}

/**
 * Sube un recibo a Supabase Storage.
 * Si el archivo es un data URL base64, lo convierte a Blob antes de subir.
 * Retorna la ruta de Storage y la URL pública.
 * Lanza AppError(ErrorCodes.STORAGE_UPLOAD_FAILED) si falla.
 */
export async function uploadReceipt(
  input: ReceiptUploadInput
): Promise<ReceiptUploadResult> {
  const storagePath = `${input.userId}/${input.receiptId}`;
  const blob: Blob =
    typeof input.file === 'string' ? dataUrlToBlob(input.file) : input.file;

  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(storagePath, blob, {
    contentType: input.mimeType,
    upsert: true,
  });

  if (error) {
    throw new AppError(ErrorCodes.STORAGE_UPLOAD_FAILED, 'Error al subir el recibo a Storage', {
      originalError: error,
      context: { storagePath, mimeType: input.mimeType },
    });
  }

  const publicUrl = await getReceiptSignedUrl(storagePath);
  return { storagePath, publicUrl };
}

/**
 * Elimina un recibo de Supabase Storage por su ruta relativa.
 * Lanza AppError(ErrorCodes.STORAGE_DELETE_FAILED) si falla.
 */
export async function deleteReceipt(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath]);

  if (error) {
    throw new AppError(ErrorCodes.STORAGE_DELETE_FAILED, 'Error al eliminar el recibo de Storage', {
      originalError: error,
      context: { storagePath },
    });
  }
}

/**
 * Genera una URL firmada de un recibo en Storage.
 * Lanza AppError(ErrorCodes.STORAGE_UPLOAD_FAILED) si falla.
 */
export async function getReceiptSignedUrl(
  storagePath: string, 
  expiresInSeconds = 300
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  
  if (error || !data) throw new AppError(ErrorCodes.STORAGE_UPLOAD_FAILED, 'Error al generar URL firmada', { originalError: error });
  return data.signedUrl;
}
/**
 * Helper interno: convierte un data URL base64 a Blob.
 * No se exporta. Solo uso interno en uploadReceipt.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  if (parts.length !== 2) {
    throw new AppError(ErrorCodes.STORAGE_RECEIPT_ERROR, 'Formato de data URL inválido');
  }
  
  const mime = parts[0].split(':')[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}
