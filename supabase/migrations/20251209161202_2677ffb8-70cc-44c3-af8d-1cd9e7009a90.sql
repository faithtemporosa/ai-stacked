-- Create function to notify affiliate webhook
CREATE OR REPLACE FUNCTION public.notify_affiliate_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Make async HTTP POST request to n8n webhook
  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
    body := jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'referral_code', NEW.referral_code,
      'status', NEW.status,
      'commission_rate', NEW.commission_rate,
      'payout_method', NEW.payout_method,
      'paypal_email', NEW.paypal_email,
      'venmo_username', NEW.venmo_username,
      'application_reason', NEW.application_reason,
      'applied_at', NEW.applied_at,
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger for new affiliate insertions
CREATE TRIGGER on_new_affiliate_webhook
  AFTER INSERT ON public.affiliates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_affiliate_webhook();