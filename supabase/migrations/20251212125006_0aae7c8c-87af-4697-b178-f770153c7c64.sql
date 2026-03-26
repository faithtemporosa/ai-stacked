-- Remove the overly permissive 'Service role can manage profiles' policy
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;