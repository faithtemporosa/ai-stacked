-- Create function to notify new user signup webhook
CREATE OR REPLACE FUNCTION public.notify_new_user_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/96c9882c-1eb5-4f90-8a71-45e38dd3557f',
    body := jsonb_build_object(
      'event_type', 'new_signup',
      'id', NEW.id,
      'user_id', NEW.user_id,
      'email', NEW.email,
      'username', NEW.username,
      'referred_by', NEW.referred_by,
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger for new user signups (fires when profile is created)
CREATE TRIGGER on_new_user_signup_webhook
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user_webhook();