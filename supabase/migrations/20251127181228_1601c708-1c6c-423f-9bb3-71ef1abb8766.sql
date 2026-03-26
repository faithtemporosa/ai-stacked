-- Create a view that shows profiles with their role information
CREATE OR REPLACE VIEW public.profiles_with_roles AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.username,
  p.created_at,
  p.updated_at,
  p.has_seen_welcome,
  p.email_digest_enabled,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.user_id AND ur.role = 'admin'
    ) THEN 'admin'
    ELSE 'user'
  END as role,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.user_id AND ur.role = 'admin'
    ) THEN true
    ELSE false
  END as is_admin
FROM public.profiles p;

-- Grant appropriate permissions to the view
GRANT SELECT ON public.profiles_with_roles TO authenticated;

-- Add RLS to the view
ALTER VIEW public.profiles_with_roles SET (security_invoker = on);

-- Add a comment to explain the view
COMMENT ON VIEW public.profiles_with_roles IS 'View that combines profile data with role information to easily identify admin accounts';