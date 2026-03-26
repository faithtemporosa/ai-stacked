-- Function to increment affiliate referrals count
CREATE OR REPLACE FUNCTION public.increment_affiliate_referrals(aff_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.affiliates
  SET total_referrals = total_referrals + 1,
      updated_at = now()
  WHERE id = aff_id;
END;
$$;

-- Allow service role to insert commissions (for webhook)
CREATE POLICY "Service role can insert commissions"
ON public.affiliate_commissions FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update commissions"  
ON public.affiliate_commissions FOR UPDATE
TO service_role
USING (true);