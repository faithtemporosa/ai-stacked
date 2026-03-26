-- Fix: Use security_invoker instead of security_definer for the view
-- This ensures the view uses the caller's permissions
DROP VIEW IF EXISTS public.affiliate_referral_codes;

CREATE VIEW public.affiliate_referral_codes 
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
  referral_code,
  status
FROM public.affiliates
WHERE status = 'active';

-- Grant public read access to this restricted view
GRANT SELECT ON public.affiliate_referral_codes TO anon, authenticated;

COMMENT ON VIEW public.affiliate_referral_codes IS 'Public view for validating referral codes. Only exposes referral_code and status fields - no PII.';