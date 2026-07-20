import { supabase, isSupabaseEnabled } from '@/lib/supabase';
import { useFinance } from '@/store/finance-store';
import { uploadReceipt } from '@/lib/supabase-storage';
import { Account, Transaction, FixedItem, Goal, Debt, DebtPayment, ChangeLogEntry, UserProfile } from '@/lib/finance';

export interface MigrationProgress {
  step: string;
  current: number;
  total: number;
  message: string;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  stats?: {
    accounts: number;
    transactions: number;
    fixedItems: number;
    goals: number;
    debts: number;
    debtPayments: number;
    receipts: number;
  };
  error?: string;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function migrateLocalDataToSupabase(
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  if (!isSupabaseEnabled) {
    return { success: false, error: 'Supabase no está habilitado' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Usuario no autenticado' };
  }

  const localStore = useFinance.getState();
  const userId = user.id;

  try {
    // Collect all local data
    const localData = {
      accounts: localStore.accounts,
      transactions: localStore.transactions,
      fixedItems: localStore.fixedItems,
      goals: localStore.goals,
      debts: localStore.debts,
      changeLog: localStore.changeLog,
      theme: localStore.theme,
      profile: localStore.profile,
    };

    let totalSteps = 0;
    let currentStep = 0;

    const updateProgress = (step: string, current: number, total: number, message: string) => {
      onProgress?.({ step, current, total, message });
    };

    // Step 1: Accounts
    totalSteps = 7; // accounts, transactions, fixedItems, goals, debts, debtPayments, receipts
    currentStep = 1;
    updateProgress('accounts', 1, totalSteps, `Migrando ${localData.accounts.length} cuentas...`);

    for (const account of localData.accounts) {
      await upsertAccount(userId, account);
    }

    // Step 2: Transactions
    currentStep = 2;
    updateProgress('transactions', 2, totalSteps, `Migrando ${localData.transactions.length} transacciones...`);
    
    const receiptsToMigrate: Array<{ transactionId: string; dataUrl: string }> = [];
    
    for (const tx of localData.transactions) {
      await upsertTransaction(userId, tx);
      // Collect receipts that are data URLs
      if (tx.receipt && typeof tx.receipt === 'string' && tx.receipt.startsWith('data:')) {
        receiptsToMigrate.push({ transactionId: tx.id, dataUrl: tx.receipt });
      }
    }

    // Step 3: Fixed Items
    currentStep = 3;
    updateProgress('fixedItems', 3, totalSteps, `Migrando ${localData.fixedItems.length} conceptos fijos...`);
    
    for (const item of localData.fixedItems) {
      await upsertFixedItem(userId, item);
    }

    // Step 4: Goals
    currentStep = 4;
    updateProgress('goals', 4, totalSteps, `Migrando ${localData.goals.length} metas...`);
    
    for (const goal of localData.goals) {
      await upsertGoal(userId, goal);
    }

    // Step 5: Debts
    currentStep = 5;
    updateProgress('debts', 5, totalSteps, `Migrando ${localData.debts.length} deudas...`);
    
    let totalDebtPayments = 0;
    for (const debt of localData.debts) {
      await upsertDebt(userId, debt);
      totalDebtPayments += debt.payments.length;
      for (const payment of debt.payments) {
        await upsertDebtPayment(userId, debt.id, payment);
      }
    }

    // Step 6: Receipts to Supabase Storage
    currentStep = 6;
    updateProgress('receipts', 6, totalSteps, `Subiendo ${receiptsToMigrate.length} recibos a la nube...`);
    
    let receiptsUploaded = 0;
    for (const { transactionId, dataUrl } of receiptsToMigrate) {
      const url = await uploadReceipt(userId, transactionId, dataUrl);
      if (url) {
        // Update transaction with new receipt URL
        await supabase
          .from('transactions')
          .update({ receipt: url })
          .eq('id', transactionId)
          .eq('user_id', userId);
        receiptsUploaded++;
      }
      // Small delay to avoid rate limiting
      await sleep(50);
    }

    // Step 7: Verify and finalize
    currentStep = 7;
    updateProgress('verify', 7, totalSteps, 'Verificando migración...');
    
    // Verify counts
    const verification = await verifyMigration(userId);

    return {
      success: true,
      message: 'Migración completada exitosamente',
      stats: {
        accounts: localData.accounts.length,
        transactions: localData.transactions.length,
        fixedItems: localData.fixedItems.length,
        goals: localData.goals.length,
        debts: localData.debts.length,
        debtPayments: totalDebtPayments,
        receipts: receiptsUploaded,
      },
    };
  } catch (error: any) {
    console.error('Migration error:', error);
    return {
      success: false,
      error: error?.message || 'Error desconocido durante la migración',
    };
  }
}

async function upsertAccount(userId: string, account: Account) {
  const payload = {
    id: account.id,
    user_id: userId,
    name: account.name,
    type: account.type,
    initial_balance: account.initialBalance ?? 0,
    currency: account.currency,
    denominations: account.denominations ?? [],
    clabe: account.clabe,
    bank: account.bank,
    holder_name: account.holderName,
  };

  const { error } = await supabase
    .from('accounts')
    .upsert(payload, { onConflict: 'id' });
  
  if (error) throw error;
}

async function upsertTransaction(userId: string, tx: Transaction) {
  const payload = {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    category: tx.category,
    concept: tx.concept,
    amount: tx.amount,
    date: tx.date,
    note: tx.note,
    icon: tx.icon,
    payment_method: tx.paymentMethod,
    fixed_id: tx.fixedId,
    account_id: tx.accountId,
    transfer_to_account_id: tx.transferToAccountId,
    external_payee: tx.externalPayee,
    // Don't include receipt if it's a data URL - will be handled separately
    receipt: tx.receipt && !tx.receipt.startsWith('data:') ? tx.receipt : null,
  };

  const { error } = await supabase
    .from('transactions')
    .upsert(payload, { onConflict: 'id' });
  
  if (error) throw error;
}

async function upsertFixedItem(userId: string, item: FixedItem) {
  const payload = {
    id: item.id,
    user_id: userId,
    type: item.type,
    category: item.category,
    concept: item.concept,
    amount: item.amount,
    frequency: item.frequency,
    active: item.active,
    note: item.note,
    start_date: item.startDate,
    end_date: item.endDate,
    priority: item.priority,
    pay_day: item.payDay,
    pay_week_day: item.payWeekDay,
    icon: item.icon,
    payment_method: item.paymentMethod,
    account_id: item.accountId,
  };

  const { error } = await supabase
    .from('fixed_items')
    .upsert(payload, { onConflict: 'id' });
  
  if (error) throw error;
}

async function upsertGoal(userId: string, goal: Goal) {
  const payload = {
    id: goal.id,
    user_id: userId,
    name: goal.name,
    target: goal.target,
    saved: goal.saved ?? 0,
    emoji: goal.emoji,
    color: goal.color,
    deadline: goal.deadline,
    icon: goal.icon,
    purchase_url: goal.purchaseUrl,
    contributions: goal.contributions ?? [],
    pinned: goal.pinned ?? false,
  };

  const { error } = await supabase
    .from('goals')
    .upsert(payload, { onConflict: 'id' });
  
  if (error) throw error;
}

async function upsertDebt(userId: string, debt: Debt) {
  const payload = {
    id: debt.id,
    user_id: userId,
    person: debt.person,
    concept: debt.concept,
    amount: debt.amount,
    date: debt.date,
    due_date: debt.dueDate,
    note: debt.note,
    icon: debt.icon,
    account_id: debt.accountId,
  };

  const { error } = await supabase
    .from('debts')
    .upsert(payload, { onConflict: 'id' });
  
  if (error) throw error;
}

async function upsertDebtPayment(userId: string, debtId: string, payment: DebtPayment) {
  const payload = {
    id: payment.id,
    user_id: userId,
    debt_id: debtId,
    amount: payment.amount,
    date: payment.date,
    note: payment.note,
    payment_method: payment.paymentMethod,
    account_id: payment.accountId,
  };

  const { error } = await supabase
    .from('debt_payments')
    .upsert(payload, { onConflict: 'id' });
  
  if (error) throw error;
}

async function verifyMigration(userId: string) {
  const [accounts, transactions, fixedItems, goals, debts] = await Promise.all([
    supabase.from('accounts').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('transactions').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('fixed_items').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('goals').select('id', { count: 'exact' }).eq('user_id', userId),
    supabase.from('debts').select('id', { count: 'exact' }).eq('user_id', userId),
  ]);

  return {
    accounts: accounts.count ?? 0,
    transactions: transactions.count ?? 0,
    fixedItems: fixedItems.count ?? 0,
    goals: goals.count ?? 0,
    debts: debts.count ?? 0,
  };
}