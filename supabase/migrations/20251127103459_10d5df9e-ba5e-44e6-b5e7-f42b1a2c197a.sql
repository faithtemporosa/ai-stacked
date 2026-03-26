-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_user_role_change ON public.user_roles;

-- Recreate the log_admin_activity function with better handling for initial admin setup
CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  admin_id uuid;
  action_type_val text;
  target_id uuid;
BEGIN
  -- Get the current admin user (or NULL if not authenticated/not admin)
  admin_id := auth.uid();
  
  -- If no admin_id (initial setup or system action), skip activity logging but still allow the operation
  IF admin_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    action_type_val := 'role_assigned';
    target_id := NEW.user_id;
    
    -- Insert activity log only if we have an admin_id
    INSERT INTO public.admin_activity_logs (admin_user_id, action_type, target_user_id, details)
    VALUES (admin_id, action_type_val, target_id, jsonb_build_object('role', NEW.role));
    
    -- Send notification to user about role change
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Role Updated',
      format('You have been assigned the %s role', NEW.role),
      'role_change',
      '/settings'
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    action_type_val := 'role_revoked';
    target_id := OLD.user_id;
    
    -- Insert activity log only if we have an admin_id
    INSERT INTO public.admin_activity_logs (admin_user_id, action_type, target_user_id, details)
    VALUES (admin_id, action_type_val, target_id, jsonb_build_object('role', OLD.role));
    
    -- Send notification to user about role revocation
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      OLD.user_id,
      'Role Revoked',
      format('Your %s role has been revoked', OLD.role),
      'role_change',
      '/settings'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_user_role_change
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_activity();