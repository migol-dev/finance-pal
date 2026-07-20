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
  created_at timestamp with time zone DEFAULT now()
);


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
