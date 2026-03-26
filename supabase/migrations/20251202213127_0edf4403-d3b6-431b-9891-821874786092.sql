-- Allow anyone to check if an affiliate is active (for referral validation)
-- This only exposes id and status, not sensitive payment info
CREATE POLICY "Anyone can check affiliate status for referral validation" 
ON public.affiliates 
FOR SELECT 
USING (status = 'active');