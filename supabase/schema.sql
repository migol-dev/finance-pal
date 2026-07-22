-- Supabase Schema para Finance Pal

-- 1. Tabla Accounts
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  type text NOT NULL, -- 'bank', 'cash', 'other'
  initial_balance numeric DEFAULT 0,
  currency text,
  clabe text,
  bank text,
  holder_name text,
  denominations jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Tabla Fixed Items
CREATE TABLE fixed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  type text NOT NULL,
  category text NOT NULL,
  concept text NOT NULL,
  amount numeric NOT NULL,
  frequency text NOT NULL,
  active boolean DEFAULT true,
  note text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  priority text NOT NULL,
  pay_day integer,
  pay_week_day integer,
  icon jsonb,
  payment_method text,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Tabla Transactions
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  type text NOT NULL,
  category text NOT NULL,
  concept text NOT NULL,
  amount numeric NOT NULL,
  date timestamp with time zone NOT NULL,
  note text,
  icon jsonb,
  payment_method text,
  fixed_id uuid REFERENCES fixed_items(id) ON DELETE SET NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  transfer_to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  external_payee jsonb,
  receipt text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Tabla Goals
CREATE TABLE goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  target numeric NOT NULL,
  saved numeric DEFAULT 0,
  emoji text,
  color text,
  deadline timestamp with time zone,
  icon jsonb,
  purchase_url text,
  contributions jsonb DEFAULT '[]'::jsonb,
  pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Tabla Debts
CREATE TABLE debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  person text NOT NULL,
  concept text NOT NULL,
  amount numeric NOT NULL,
  date timestamp with time zone NOT NULL,
  due_date timestamp with time zone,
  note text,
  icon jsonb,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Tabla Debt Payments
CREATE TABLE debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  debt_id uuid REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  date timestamp with time zone NOT NULL,
  note text,
  payment_method text,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  transfer_to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  external_payee jsonb,
  receipt_url text,
  created_at timestamp with time zone DEFAULT now()
);


-- Migration for existing databases: add missing columns to debt_payments
-- (safe to run multiple times — IF NOT EXISTS)
ALTER TABLE debt_payments ADD COLUMN IF NOT EXISTS transfer_to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE debt_payments ADD COLUMN IF NOT EXISTS external_payee jsonb;
ALTER TABLE debt_payments ADD COLUMN IF NOT EXISTS receipt_url text;

-- 7. Tabla User Sessions (for multi-device conflict prevention)
-- Uses IF NOT EXISTS so it's safe to run multiple times

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  device_id text NOT NULL,
  device_name text,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_sessions_user_id_device_id_key'
  ) THEN
    ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_device_id_key UNIQUE (user_id, device_id);
  END IF;
END $$;

-- =========================================
-- CONFIGURACIÓN DE RLS (Row Level Security)
-- =========================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para Accounts
CREATE POLICY "Users can view their own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Fixed Items
CREATE POLICY "Users can view their own fixed items" ON fixed_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fixed items" ON fixed_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fixed items" ON fixed_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fixed items" ON fixed_items FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Transactions
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Goals
CREATE POLICY "Users can view their own goals" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Debts
CREATE POLICY "Users can view their own debts" ON debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own debts" ON debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debts" ON debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debts" ON debts FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Debt Payments
CREATE POLICY "Users can view their own debt payments" ON debt_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own debt payments" ON debt_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debt payments" ON debt_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debt payments" ON debt_payments FOR DELETE USING (auth.uid() = user_id);

-- 7b. RLS para User Sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions" ON user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON user_sessions FOR DELETE USING (auth.uid() = user_id);

-- 8. Tabla User Settings (theme, profile, etc.)
-- Uses IF NOT EXISTS so it's safe to run multiple times

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  theme text DEFAULT 'light',
  profile jsonb DEFAULT '{}',
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyprefix = 'user_settings') THEN
    CREATE POLICY "Users can view their own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- =========================================
-- ÍNDICES DE RENDIMIENTO (para consultas RLS)
-- =========================================
-- Estas consultas se ejecutan con IF NOT EXISTS para ser seguras al repetirse

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_items_user_id ON fixed_items(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_user_id ON debt_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- =========================================
-- FUNCIÓN PARA LIMPIEZA AUTOMÁTICA DE SESIONES
-- =========================================
-- Limpia sesiones inactivas cada 5 minutos (requiere pg_cron o llamada manual)
-- Nota: pg_cron requiere extensión, puede no estar disponible en todos los planes
-- Esta función se puede llamar manualmente o desde el frontend

CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM user_sessions
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes'
    AND created_at < NOW() - INTERVAL '2 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
