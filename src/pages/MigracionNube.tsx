import { useState, useEffect } from 'react';
import { motion } from '@/lib/framer';
import { Header } from '@/components/app/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, CloudUpload, Loader2, Database, HardDrive, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/store/finance-store';
import { isSupabaseEnabled } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { uploadReceipt } from '@/lib/supabase-storage';
import { toast } from 'sonner';


function MigracionNubeContent() {
  const { session } = useAuth();
  const { hasLocalData } = useFinance();
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [step, setStep] = useState<'welcome' | 'migrating' | 'complete' | 'error'>('welcome');

  const needsMigration = isSupabaseEnabled && session && hasLocalData;

  interface MigrationProgress {
    step: string;
    current: number;
    total: number;
    message: string;
  }

  interface MigrationResult {
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

  const startMigration = async () => {
    setIsMigrating(true);
    setStep('migrating');

    try {
      if (!isSupabaseEnabled) {
        throw new Error('Supabase no está habilitado');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const localStore = useFinance.getState();
      const userId = user.id;

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

      const totalSteps = 7;
      const updateProgress = (step: string, current: number, total: number, message: string) => {
        setProgress({ step, current, total, message });
      };

      // Step 1: Accounts
      updateProgress('accounts', 1, totalSteps, `Migrando ${localData.accounts.length} cuentas...`);

      for (const account of localData.accounts) {
        await upsertAccount(userId, account);
      }

      // Step 2: Transactions
      updateProgress('transactions', 2, totalSteps, `Migrando ${localData.transactions.length} transacciones...`);

      const receiptsToMigrate: Array<{ transactionId: string; dataUrl: string }> = [];

      for (const tx of localData.transactions) {
        await upsertTransaction(userId, tx);
        if (tx.receipt && typeof tx.receipt === 'string' && tx.receipt.startsWith('data:')) {
          receiptsToMigrate.push({ transactionId: tx.id, dataUrl: tx.receipt });
        }
      }

      // Step 3: Fixed Items
      updateProgress('fixedItems', 3, totalSteps, `Migrando ${localData.fixedItems.length} conceptos fijos...`);

      for (const item of localData.fixedItems) {
        await upsertFixedItem(userId, item);
      }

      // Step 4: Goals
      updateProgress('goals', 4, totalSteps, `Migrando ${localData.goals.length} metas...`);

      for (const goal of localData.goals) {
        await upsertGoal(userId, goal);
      }

      // Step 5: Debts
      updateProgress('debts', 5, totalSteps, `Migrando ${localData.debts.length} deudas...`);

      let totalDebtPayments = 0;
      for (const debt of localData.debts) {
        const resolvedDebtId = await upsertDebt(userId, debt);
        totalDebtPayments += debt.payments.length;
        for (const payment of debt.payments) {
          await upsertDebtPayment(userId, resolvedDebtId, payment);
        }
      }

      // Step 6: Receipts to Supabase Storage
      updateProgress('receipts', 6, totalSteps, `Subiendo ${receiptsToMigrate.length} recibos a la nube...`);

      let receiptsUploaded = 0;
      for (const { transactionId, dataUrl } of receiptsToMigrate) {
        const url = await uploadReceipt(userId, transactionId, dataUrl);
        if (url) {
          await supabase
            .from('transactions')
            .update({ receipt: url })
            .eq('id', transactionId)
            .eq('user_id', userId);
          receiptsUploaded++;
        }
        await sleep(50);
      }

      // Step 7: Verify
      updateProgress('verify', 7, totalSteps, 'Verificando migración...');

      await verifyMigration(userId);

      const result: MigrationResult = {
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
      setResult(result);
      if (result.success) {
        setStep('complete');
        toast.success('¡Migración completada!');
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      const errMsg = error?.message || 'Error desconocido durante la migración';
      setResult({ success: false, message: errMsg, error: errMsg });
      setStep('error');
      toast.error(error?.message || 'Error en la migración');
    } finally {
      setIsMigrating(false);
    }
  };

  async function upsertAccount(userId: string, account: any) {
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

  async function upsertTransaction(userId: string, tx: any) {
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

  async function upsertFixedItem(userId: string, item: any) {
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

  async function upsertGoal(userId: string, goal: any) {
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
      pinned: goal.pinned,
      created_at: goal.createdAt,
    };

    const { error } = await supabase
      .from('goals')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  async function upsertDebt(userId: string, debt: any): Promise<string> {
    // If debt has a non-UUID id, generate a proper UUID for Supabase
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedId = debt.id;
    if (!isUuid.test(debt.id)) {
      // Check if a debt with same person+amount+concept already exists in Supabase
      const { data: existing } = await supabase
        .from('debts')
        .select('id')
        .eq('user_id', userId)
        .eq('person', debt.person)
        .eq('amount', debt.amount)
        .eq('concept', debt.concept)
        .maybeSingle();
      if (existing) {
        resolvedId = existing.id;
      } else {
        resolvedId = crypto.randomUUID?.() ?? debt.id;
      }
    }

    const payload: Record<string, unknown> = {
      id: resolvedId,
      user_id: userId,
      person: debt.person,
      concept: debt.concept,
      amount: debt.amount,
      date: debt.date,
      due_date: debt.dueDate,
      note: debt.note,
      icon: debt.icon,
    };
    if (debt.accountId && isUuid.test(debt.accountId)) {
      payload.account_id = debt.accountId;
    }

    const { error } = await supabase
      .from('debts')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
    return resolvedId;
  }

  async function upsertDebtPayment(userId: string, debtId: string, payment: any) {
    const payload: Record<string, unknown> = {
      id: payment.id,
      user_id: userId,
      debt_id: debtId,
      amount: payment.amount,
      date: payment.date,
      note: payment.note,
      payment_method: payment.paymentMethod,
    };
    if (payment.accountId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payment.accountId)) {
      payload.account_id = payment.accountId;
    }

    const { error } = await supabase
      .from('debt_payments')
      .upsert(payload, { onConflict: 'id' });

    if (error) throw error;
  }

  async function verifyMigration(userId: string) {
    // Quick verification that data was inserted
    const { count: accountsCount } = await supabase
      .from('accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!accountsCount || accountsCount === 0) {
      throw new Error('Verificación fallida: no se migraron cuentas');
    }
  }

  const handleRetry = () => {
    setStep('welcome');
    setResult(null);
    setProgress(null);
  };

  const handleSkip = () => {
    // Mark as migrated locally so we don't show this again
    localStorage.setItem('finance-pal-migration-skipped', 'true');
    window.location.href = '/';
  };

  const handleContinue = () => {
    window.location.href = '/';
  };

  // Redirect early if no migration needed
  useEffect(() => {
    if (!needsMigration) {
      window.location.href = '/';
    }
  }, [needsMigration]);

  if (!needsMigration) {
    return null;
  }

  const localStats = useFinance.getState();
  const stats = {
    accounts: localStats.accounts.length,
    transactions: localStats.transactions.length,
    fixedItems: localStats.fixedItems.length,
    goals: localStats.goals.length,
    debts: localStats.debts.length,
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background gradient-mesh">
      <Header
        title="Migrando a la nube"
        subtitle="Tu historial financiero se respalda en Supabase"
      />

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {step === 'welcome' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="mx-auto size-20 rounded-[28px] gradient-primary shadow-glow flex items-center justify-center"
              >
                <CloudUpload className="size-10 text-primary-foreground" />
              </motion.div>
              <h1 className="text-2xl font-extrabold">Migrando tu historial a la nube</h1>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Detectamos que tienes datos guardados localmente. Los subiremos a Supabase para que estén disponibles en todos tus dispositivos y respaldados de forma segura.
              </p>
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Datos que se migrarán</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <StatItem icon={<Database className="size-5" />} label="Cuentas" value={stats.accounts} />
                  <StatItem icon={<HardDrive className="size-5" />} label="Movimientos" value={stats.transactions} />
                  <StatItem icon={<CheckCircle className="size-5" />} label="Conceptos fijos" value={stats.fixedItems} />
                  <StatItem icon={<ArrowRight className="size-5 rotate-45" />} label="Metas" value={stats.goals} />
                  <StatItem icon={<Database className="size-5" />} label="Deudas" value={stats.debts} />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={startMigration}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold text-lg"
                disabled={isMigrating}
              >
                <Loader2 className="size-5 mr-2 animate-spin" />
                Iniciar migración
              </Button>

              <Button
                onClick={handleSkip}
                variant="ghost"
                className="w-full h-11 rounded-2xl text-muted-foreground hover:text-foreground"
              >
                Omitir por ahora
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'migrating' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="mx-auto size-20 rounded-[28px] gradient-primary shadow-glow flex items-center justify-center"
              >
                <Loader2 className="size-10 text-primary-foreground" />
              </motion.div>
              <h1 className="text-2xl font-extrabold">Migrando tus datos...</h1>
              <p className="text-muted-foreground max-w-xs mx-auto">
                {progress?.message || 'Por favor no cierres la aplicación'}
              </p>
            </div>

            {progress && (
              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{progress.step}</span>
                        <span className="text-muted-foreground">{progress.current} / {progress.total}</span>
                      </div>
                      <Progress value={(progress.current / progress.total) * 100} className="h-3" />
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-2xl font-bold text-primary">{progress.current}</p>
                        <p className="text-[10px] text-muted-foreground">Completados</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-2xl font-bold">{progress.total}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-3">
                        <p className="text-2xl font-bold text-success">{Math.round((progress.current / progress.total) * 100)}%</p>
                        <p className="text-[10px] text-muted-foreground">Progreso</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-medium">NOTA:</span> La migración puede tardar unos minutos según la cantidad de datos.
                Mantén la app abierta y no la cierres hasta que termine.
              </p>
            </div>
          </motion.div>
        )}

        {step === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="mx-auto size-20 rounded-[28px] gradient-success shadow-glow flex items-center justify-center"
              >
                <CheckCircle2 className="size-10 text-success-foreground" />
              </motion.div>
              <h1 className="text-2xl font-extrabold">¡Migración completada!</h1>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Todos tus datos están ahora seguros en la nube y sincronizados entre dispositivos.
              </p>
            </div>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {result?.stats && (
                    <>
                      <StatItem icon={<Database className="size-5" />} label="Cuentas" value={result.stats.accounts} />
                      <StatItem icon={<HardDrive className="size-5" />} label="Movimientos" value={result.stats.transactions} />
                      <StatItem icon={<CheckCircle className="size-5" />} label="Conceptos fijos" value={result.stats.fixedItems} />
                      <StatItem icon={<ArrowRight className="size-5 rotate-45" />} label="Metas" value={result.stats.goals} />
                      <StatItem icon={<Database className="size-5" />} label="Deudas" value={result.stats.debts} />
                      <StatItem icon={<CheckCircle className="size-5" />} label="Abonos de deudas" value={result.stats.debtPayments} />
                      <StatItem icon={<CloudUpload className="size-5" />} label="Recibos subidos" value={result.stats.receipts} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={handleContinue}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold text-lg"
              >
                Continuar a la app
                <ArrowRight className="size-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="mx-auto size-20 rounded-[28px] bg-destructive/10 shadow-glow flex items-center justify-center"
              >
                <AlertCircle className="size-10 text-destructive" />
              </motion.div>
              <h1 className="text-2xl font-extrabold">Error en la migración</h1>
              <p className="text-muted-foreground max-w-xs mx-auto">
                {result?.error || 'Ocurrió un error inesperado'}
              </p>
            </div>

            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <p className="text-sm text-destructive-foreground">
                  Puedes reintentar la migración o contactar soporte si el problema persiste.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow font-bold"
              >
                Reintentar migración
              </Button>

              <Button
                onClick={handleSkip}
                variant="ghost"
                className="w-full h-11 rounded-2xl text-muted-foreground hover:text-foreground"
              >
                Omitir por ahora
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-1">
      <div className="flex items-center justify-center gap-1 text-primary">
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-center">{value}</p>
      <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default MigracionNubeContent;