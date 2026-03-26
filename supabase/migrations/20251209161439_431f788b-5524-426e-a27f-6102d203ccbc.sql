-- Create function to notify affiliate status change webhook
CREATE OR REPLACE FUNCTION public.notify_affiliate_status_change_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
      body := jsonb_build_object(
        'event_type', 'status_change',
        'id', NEW.id,
        'user_id', NEW.user_id,
        'referral_code', NEW.referral_code,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'approved_by', NEW.approved_by,
        'approved_at', NEW.approved_at,
        'payout_method', NEW.payout_method,
        'paypal_email', NEW.paypal_email,
        'venmo_username', NEW.venmo_username,
        'updated_at', NEW.updated_at
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for affiliate status changes
CREATE TRIGGER on_affiliate_status_change_webhook
  AFTER UPDATE ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_affiliate_status_change_webhook();