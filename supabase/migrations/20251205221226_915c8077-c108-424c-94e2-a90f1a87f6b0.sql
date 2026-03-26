-- Create a restricted view for public referral validation
-- This view ONLY exposes referral_code and status, no PII
CREATE OR REPLACE VIEW public.affiliate_referral_codes AS
SELECT 
  referral_code,
  status
FROM public.affiliates
WHERE status = 'active';

-- Enable security barrier to prevent data leakage through views
ALTER VIEW public.affiliate_referral_codes SET (security_barrier = true);

-- Grant public read access to this restricted view only
GRANT SELECT ON public.affiliate_referral_codes TO anon, authenticated;

-- Add a comment documenting the purpose
COMMENT ON VIEW public.affiliate_referral_codes IS 'Public view for validating referral codes. Only exposes referral_code and status fields - no PII.';