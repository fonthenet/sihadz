-- Paste only the SQL below in Supabase SQL Editor. Do not paste any page title or non-SQL text.
-- Wallet & Deposit System (SOP Section 5): in-platform balance, top-ups, deposit for bookings.

-- 1. Wallets: one per user (patient); balance in DZD
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency VARCHAR(3) DEFAULT 'DZD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- 2. Wallet transactions: audit trail for every balance change
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL, -- top_up, deposit, refund, adjustment
  amount DECIMAL(12, 2) NOT NULL, -- positive = credit, negative = debit
  balance_after DECIMAL(12, 2), -- snapshot after this tx
  reference_type VARCHAR(50), -- top_up_request, appointment, etc.
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON public.wallet_transactions(reference_type, reference_id);

-- 3. Top-up requests: user requests balance; admin approves and credits wallet
CREATE TABLE IF NOT EXISTS public.top_up_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_dzd DECIMAL(12, 2) NOT NULL CHECK (amount_dzd > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  proof_reference VARCHAR(255), -- e.g. bank transfer ref, receipt number
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_top_up_requests_user_id ON public.top_up_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_top_up_requests_status ON public.top_up_requests(status);
CREATE INDEX IF NOT EXISTS idx_top_up_requests_created_at ON public.top_up_requests(created_at DESC);

-- RLS: Wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cannot update wallet directly" ON public.wallets
  FOR UPDATE USING (false);

CREATE POLICY "Service role full access wallets" ON public.wallets
  FOR ALL USING (true) WITH CHECK (true);

-- RLS: Wallet transactions (users see own via wallet_id)
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions
  FOR SELECT USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
  );

CREATE POLICY "Only service or backend can insert transactions" ON public.wallet_transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access wallet_transactions" ON public.wallet_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- RLS: Top-up requests
ALTER TABLE public.top_up_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own top_up_requests" ON public.top_up_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own top_up_requests" ON public.top_up_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access top_up_requests" ON public.top_up_requests
  FOR ALL USING (true) WITH CHECK (true);

-- Grant to roles
GRANT ALL ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
GRANT ALL ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
GRANT ALL ON public.top_up_requests TO authenticated;
GRANT ALL ON public.top_up_requests TO service_role;
