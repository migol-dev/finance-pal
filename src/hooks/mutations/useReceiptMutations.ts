import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { uploadReceipt, deleteReceipt } from '@/services/storage.service';
import type { ReceiptUploadInput, ReceiptUploadResult } from '@/services/storage.service';
import { supabase } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import { updateTransaction } from '@/services/transactions.service';

// Input para subir el recibo de una transacción específica
export interface UploadReceiptForTransactionInput {
  /** ID de la transacción a la que pertenece el recibo */
  transactionId: string;
  /**
   * Datos del archivo: data URL base64 o Blob/File.
   * Si es data URL, el servicio lo convierte a Blob internamente.
   */
  file: string | Blob | File;
  /** MIME type del archivo */
  mimeType: string;
}

// Input para eliminar el recibo de una transacción
export interface DeleteReceiptForTransactionInput {
  /** ID de la transacción */
  transactionId: string;
  /**
   * Ruta relativa en Storage (ej. "{userId}/{transactionId}").
   * Se necesita para llamar a deleteReceipt del servicio.
   */
  storagePath: string;
}

export interface ReceiptMutations {
  /**
   * Sube el archivo a Supabase Storage y actualiza el campo `receipt`
   * de la transacción (en Zustand Y en la columna `transactions.receipt`)
   * con la URL pública resultante.
   */
  uploadReceiptForTransaction: UseMutationResult<
    ReceiptUploadResult,
    Error,
    UploadReceiptForTransactionInput
  >;
  /**
   * Elimina el archivo de Storage y limpia el campo `receipt`
   * de la transacción (en Zustand Y en Supabase).
   */
  deleteReceiptForTransaction: UseMutationResult<
    void,
    Error,
    DeleteReceiptForTransactionInput
  >;
}

export function useReceiptMutations(): ReceiptMutations {
  const queryClient = useQueryClient();

  const uploadReceiptForTransaction = useMutation<
    ReceiptUploadResult,
    Error,
    UploadReceiptForTransactionInput
  >({
    mutationFn: async (input) => {
      if (!isSupabaseEnabled) {
        throw new Error('Supabase Storage no disponible. Activa la sincronización.');
      }
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error('No user');

      const payload: ReceiptUploadInput = {
        receiptId: input.transactionId,
        userId,
        file: input.file,
        mimeType: input.mimeType,
      };
      const result = await uploadReceipt(payload);

      await updateTransaction(input.transactionId, { receipt: result.publicUrl });
      useFinance.getState().updateTx(input.transactionId, { receipt: result.publicUrl });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
  });

  const deleteReceiptForTransaction = useMutation<
    void,
    Error,
    DeleteReceiptForTransactionInput
  >({
    mutationFn: async (input) => {
      if (!isSupabaseEnabled) {
        throw new Error('Supabase Storage no disponible. Activa la sincronización.');
      }
      await deleteReceipt(input.storagePath);

      await updateTransaction(input.transactionId, { receipt: undefined });
      useFinance.getState().updateTx(input.transactionId, { receipt: undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.transactions() });
    },
  });

  return { uploadReceiptForTransaction, deleteReceiptForTransaction };
}
