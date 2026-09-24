import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { financeKeys } from '@/lib/queryKeys';
import {
  updateFixedItem,
  deleteFixedItem,
  toggleFixedItemActive,
  insertFixedItem
} from '@/services/fixedItems.service';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from '@/store/sync-store';
import type { FixedItem } from '@/lib/finance';

// (useSyncStore solo para encolar mutations offline)

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export interface FixedItemMutations {
  addFixedItem: UseMutationResult<void, Error, Omit<FixedItem, 'id'>>;
  updateFixedItem: UseMutationResult<void, Error, { id: string; patch: Partial<FixedItem> }>;
  removeFixedItem: UseMutationResult<void, Error, string>;
  toggleFixedItem: UseMutationResult<void, Error, string>;
}

export function useFixedItemMutations(): FixedItemMutations {
  const queryClient = useQueryClient();

  const addFixedItem = useMutation<void, Error, Omit<FixedItem, 'id'>>({
    mutationFn: async (payload) => {
      const state = useFinance.getState();
      const fixedItem = state.fixedItems[0];
      
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'fixed_items', action: 'INSERT', recordId: fixedItem.id, payload: fixedItem });
        return;
      }
      
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('No user');
      
      await insertFixedItem(data.user.id, fixedItem);
    },
    onMutate: async (payload) => {
      await useFinance.getState().addFixed(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.fixedItems() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.fixedItems() });
    },
  });

  const updateFixedItemMutation = useMutation<void, Error, { id: string; patch: Partial<FixedItem> }>({
    mutationFn: async ({ id, patch }) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'fixed_items', action: 'UPDATE', recordId: id, payload: patch });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("No user");
      await updateFixedItem(data.user.id, id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await useFinance.getState().updateFixed(id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.fixedItems() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.fixedItems() });
    },
  });

  const removeFixedItem = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'fixed_items', action: 'DELETE', recordId: id });
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("No user");
      await deleteFixedItem(data.user.id, id);
    },
    onMutate: async (id) => {
      await useFinance.getState().removeFixed(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.fixedItems() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.fixedItems() });
    },
  });

  const toggleFixedItem = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      if (!isSupabaseEnabled || isOffline()) {
        useSyncStore
          .getState()
          .addMutation({ table: 'fixed_items', action: 'UPDATE', recordId: id });
        return;
      }
      const current = useFinance.getState().fixedItems.find((x) => x.id === id);
      // onMutate ya invirtió el flag; el estado actual es el valor objetivo.
      await toggleFixedItemActive(id, current?.active ?? true);
    },
    onMutate: async (id) => {
      await useFinance.getState().toggleFixed(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.fixedItems() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: financeKeys.fixedItems() });
    },
  });

  return { addFixedItem, updateFixedItem: updateFixedItemMutation, removeFixedItem, toggleFixedItem };
}
