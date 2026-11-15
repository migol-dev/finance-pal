import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

const hoisted = vi.hoisted(() => ({
  supabaseFromMock: vi.fn(),
  supabaseGetUserMock: vi.fn(),
  addGoalContributionServiceMock: vi.fn(),
  insertTransactionMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseEnabled: true,
  supabase: {
    from: hoisted.supabaseFromMock,
    auth: {
      getUser: hoisted.supabaseGetUserMock,
    },
  },
}));

vi.mock('@/lib/network', () => ({
  isOffline: () => false,
}));

vi.mock('@/services/transactions.service', () => ({
  insertTransaction: hoisted.insertTransactionMock,
}));

import {
  ALL_FINANCE_ENTITY_KEYS,
  financeKeys,
  invalidateAllFinanceEntityQueries,
} from '@/lib/queryKeys';
import { syncAllToCloud } from '@/services/cloudSync.service';
import { addGoalContribution } from '@/services/goals.service';
import { useGoalMutations } from '@/hooks/mutations/useGoalMutations';
import { useFinance } from '@/store/finance-store';
import { useSyncStore } from '@/store/sync-store';

describe('Sub-phase 0.3 Local-First Sync & Security Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSyncStore.getState().clearQueue();
    useFinance.setState({
      accounts: [{ id: 'acc-1', name: 'Efectivo', type: 'cash', initialBalance: 100, currency: 'MXN' }],
      transactions: [],
      fixedItems: [],
      goals: [
        {
          id: 'goal-1',
          name: 'Fondo Emergencia',
          target: 1000,
          saved: 100,
          emoji: '🎯',
          color: '#C86446',
          contributions: [],
        },
      ],
      goalFolders: [],
      debts: [],
      theme: 'light',
      profile: { name: 'Tester', currency: 'MXN' },
    });
  });

  it('invalidates all 6 entity query keys via invalidateAllFinanceEntityQueries', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateAllFinanceEntityQueries(queryClient);

    expect(ALL_FINANCE_ENTITY_KEYS).toEqual([
      financeKeys.accounts(),
      financeKeys.transactions(),
      financeKeys.fixedItems(),
      financeKeys.goals(),
      financeKeys.goalFolders(),
      financeKeys.debts(),
    ]);

    const calledKeys = invalidateSpy.mock.calls.map(([arg]) => arg?.queryKey);
    for (const key of ALL_FINANCE_ENTITY_KEYS) {
      expect(calledKeys).toContainEqual(key);
    }
    expect(calledKeys).toContainEqual(financeKeys.all);
  });

  it('performs non-destructive upserts in syncAllToCloud without calling delete()', async () => {
    const deleteSpy = vi.fn();
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });

    hoisted.supabaseFromMock.mockImplementation(() => ({
      delete: deleteSpy,
      upsert: upsertSpy,
    }));

    const result = await syncAllToCloud({
      userId: 'user-123',
      accounts: [{ id: 'acc-1', name: 'Caja', type: 'cash', initialBalance: 50, currency: 'MXN' }],
      transactions: [],
      fixedItems: [],
      goals: [],
      goalFolders: [],
      debts: [],
      theme: 'light',
      profile: { name: 'Tester', currency: 'MXN' },
    });

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(hoisted.supabaseFromMock).toHaveBeenCalledWith('accounts');
    expect(hoisted.supabaseFromMock).toHaveBeenCalledWith('user_settings');
    expect(result.syncedCount).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it('scopes goals.service addGoalContribution SELECT and UPDATE by user_id', async () => {
    const eqCalls: Array<{ op: 'select' | 'update'; col: string; val: string }> = [];

    hoisted.supabaseFromMock.mockImplementation(() => ({
      select: () => ({
        eq: (col: string, val: string) => {
          eqCalls.push({ op: 'select', col, val });
          return {
            eq: (col2: string, val2: string) => {
              eqCalls.push({ op: 'select', col: col2, val: val2 });
              return {
                single: async () => ({
                  data: { saved: 100, contributions: [] },
                  error: null,
                }),
              };
            },
          };
        },
      }),
      update: () => ({
        eq: (col: string, val: string) => {
          eqCalls.push({ op: 'update', col, val });
          return {
            eq: async (col2: string, val2: string) => {
              eqCalls.push({ op: 'update', col: col2, val: val2 });
              return { error: null };
            },
          };
        },
      }),
    }));
    hoisted.insertTransactionMock.mockResolvedValue(undefined);

    await addGoalContribution('user-abc', 'goal-1', {
      amount: 50,
      goalName: 'Fondo Emergencia',
      txId: 'tx-fixed-id',
    });

    expect(eqCalls).toContainEqual({ op: 'select', col: 'id', val: 'goal-1' });
    expect(eqCalls).toContainEqual({ op: 'select', col: 'user_id', val: 'user-abc' });
    expect(eqCalls).toContainEqual({ op: 'update', col: 'id', val: 'goal-1' });
    expect(eqCalls).toContainEqual({ op: 'update', col: 'user_id', val: 'user-abc' });
    expect(hoisted.insertTransactionMock).toHaveBeenCalledWith(
      'user-abc',
      expect.objectContaining({ id: 'tx-fixed-id', amount: 50 }),
    );
  });

  it('shares identical txId between goal-slice optimistic state and Supabase goal contribution', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    hoisted.supabaseGetUserMock.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    hoisted.insertTransactionMock.mockResolvedValue(undefined);
    hoisted.supabaseFromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({
              data: { saved: 100, contributions: [] },
              error: null,
            }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: async () => ({ error: null }),
        }),
      }),
    }));

    const { result } = renderHook(() => useGoalMutations(), { wrapper });

    await act(async () => {
      await result.current.contributeToGoal.mutateAsync({
        id: 'goal-1',
        amount: 25,
        accountId: 'acc-1',
      });
    });

    const localTx = useFinance.getState().transactions[0];
    expect(localTx).toBeDefined();
    expect(hoisted.insertTransactionMock).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ id: localTx.id, amount: 25 }),
    );
  });
});
