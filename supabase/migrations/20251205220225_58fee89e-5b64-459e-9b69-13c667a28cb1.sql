-- Create a security definer function to check affiliate status by ID
-- This is safe because it only returns the status, not any PII
CREATE OR REPLACE FUNCTION public.check_affiliate_active(affiliate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.affiliates
    WHERE id = affiliate_id
      AND status = 'active'
  )
$$;