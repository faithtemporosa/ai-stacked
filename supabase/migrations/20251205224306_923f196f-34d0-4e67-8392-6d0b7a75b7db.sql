-- Fix the view to use SECURITY INVOKER instead of DEFINER
-- This ensures the view uses the querying user's permissions, not the creator's
DROP VIEW IF EXISTS public.affiliate_commissions_safe;

CREATE VIEW public.affiliate_commissions_safe 
WITH (security_invoker = true)
AS
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
FROM public.affiliate_commissions;

-- Grant access to the view
GRANT SELECT ON public.affiliate_commissions_safe TO authenticated;