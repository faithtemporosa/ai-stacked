-- Fix 1: Secure affiliate payment data exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can check affiliate status for referral validation" ON public.affiliates;

-- Create a security definer function that only returns safe referral validation data
CREATE OR REPLACE FUNCTION public.validate_referral_code(code text)
RETURNS TABLE(referral_code text, status affiliate_status)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.referral_code, a.status
  FROM public.affiliates a
  WHERE a.referral_code = code
    AND a.status = 'active'
$$;

-- Fix 2: Secure profiles_with_roles view
-- Drop the existing view and recreate with security barrier
DROP VIEW IF EXISTS public.profiles_with_roles;

-- Recreate view with security_barrier to prevent information leakage
CREATE VIEW public.profiles_with_roles WITH (security_barrier = true) AS
SELECT 
  p.id,
  p.user_id,
  p.username,
  p.email,
  p.email_digest_enabled,
  p.has_seen_welcome,
  p.created_at,
  p.updated_at,
  COALESCE(ur.role::text, 'user') as role,
  CASE WHEN ur.role = 'admin' THEN true ELSE false END as is_admin
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.user_id = ur.user_id;

-- Enable RLS on the view
ALTER VIEW public.profiles_with_roles SET (security_invoker = true);

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_with_roles TO authenticated;