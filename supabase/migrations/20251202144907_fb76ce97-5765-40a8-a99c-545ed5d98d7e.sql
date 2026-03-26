-- Create affiliate status enum
CREATE TYPE public.affiliate_status AS ENUM ('active', 'suspended', 'pending');

-- Create commission status enum  
CREATE TYPE public.commission_status AS ENUM ('pending', 'approved', 'paid', 'refunded', 'cancelled');

-- Affiliates table - any user can become an affiliate
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  status affiliate_status NOT NULL DEFAULT 'active',
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  pending_earnings NUMERIC NOT NULL DEFAULT 0,
  paid_earnings NUMERIC NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0.25,
  paypal_email TEXT,
  payout_method TEXT DEFAULT 'paypal',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add referred_by column to profiles to track who referred a user
ALTER TABLE public.profiles 
ADD COLUMN referred_by UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- Commission ledger - tracks all commissions
CREATE TABLE public.affiliate_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_payment_id TEXT,
  payment_amount NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 0.25,
  status commission_status NOT NULL DEFAULT 'pending',
  payment_type TEXT NOT NULL DEFAULT 'subscription',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Payout requests table
CREATE TABLE public.affiliate_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payout_method TEXT NOT NULL DEFAULT 'paypal',
  payout_details JSONB,
  admin_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Affiliates policies
CREATE POLICY "Users can view their own affiliate record"
ON public.affiliates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own affiliate record"
ON public.affiliates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate record"
ON public.affiliates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliates"
ON public.affiliates FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all affiliates"
ON public.affiliates FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Commissions policies
CREATE POLICY "Affiliates can view their own commissions"
ON public.affiliate_commissions FOR SELECT
USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all commissions"
ON public.affiliate_commissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert commissions"
ON public.affiliate_commissions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update commissions"
ON public.affiliate_commissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Payouts policies
CREATE POLICY "Affiliates can view their own payouts"
ON public.affiliate_payouts FOR SELECT
USING (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

CREATE POLICY "Affiliates can request payouts"
ON public.affiliate_payouts FOR INSERT
WITH CHECK (
  affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all payouts"
ON public.affiliate_payouts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payouts"
ON public.affiliate_payouts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || now()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.affiliates WHERE referral_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-generate referral code on insert
CREATE OR REPLACE FUNCTION public.set_affiliate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_referral_code
BEFORE INSERT ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.set_affiliate_referral_code();

-- Function to update affiliate stats when commission is added
CREATE OR REPLACE FUNCTION public.update_affiliate_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.affiliates
    SET 
      total_earnings = total_earnings + NEW.commission_amount,
      pending_earnings = pending_earnings + NEW.commission_amount,
      updated_at = now()
    WHERE id = NEW.affiliate_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
      UPDATE public.affiliates
      SET 
        pending_earnings = pending_earnings - NEW.commission_amount,
        paid_earnings = paid_earnings + NEW.commission_amount,
        updated_at = now()
      WHERE id = NEW.affiliate_id;
    ELSIF OLD.status = 'pending' AND NEW.status IN ('refunded', 'cancelled') THEN
      UPDATE public.affiliates
      SET 
        total_earnings = total_earnings - NEW.commission_amount,
        pending_earnings = pending_earnings - NEW.commission_amount,
        updated_at = now()
      WHERE id = NEW.affiliate_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_affiliate_stats
AFTER INSERT OR UPDATE ON public.affiliate_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_affiliate_stats();

-- Index for faster lookups
CREATE INDEX idx_affiliates_referral_code ON public.affiliates(referral_code);
CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX idx_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX idx_profiles_referred_by ON public.profiles(referred_by);