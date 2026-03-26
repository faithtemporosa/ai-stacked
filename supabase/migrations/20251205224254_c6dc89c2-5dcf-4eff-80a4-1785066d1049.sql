-- Drop overly permissive service role policies
-- (Service role bypasses RLS anyway, these policies are redundant and could allow any authenticated user to insert/update)
DROP POLICY IF EXISTS "Service role can insert commissions" ON public.affiliate_commissions;
DROP POLICY IF EXISTS "Service role can update commissions" ON public.affiliate_commissions;

-- Create a secure view for affiliates that excludes sensitive Stripe data
CREATE OR REPLACE VIEW public.affiliate_commissions_safe AS
SELECT 
  id,
  affiliate_id,
  referred_user_id,
  subscription_id,
  payment_amount,
  commission_amount,
  commission_rate,
  status,
  payment_type,
  notes,
  commission_expires_at,
  paid_at,
  created_at
  -- Explicitly excludes: stripe_payment_id
FROM public.affiliate_commissions;

-- Grant access to the view
GRANT SELECT ON public.affiliate_commissions_safe TO authenticated;