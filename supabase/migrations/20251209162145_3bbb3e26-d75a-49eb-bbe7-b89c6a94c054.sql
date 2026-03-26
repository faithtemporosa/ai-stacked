-- Create function to notify new commission webhook
CREATE OR REPLACE FUNCTION public.notify_new_commission_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
    body := jsonb_build_object(
      'event_type', 'new_commission',
      'id', NEW.id,
      'affiliate_id', NEW.affiliate_id,
      'referred_user_id', NEW.referred_user_id,
      'commission_amount', NEW.commission_amount,
      'commission_rate', NEW.commission_rate,
      'payment_amount', NEW.payment_amount,
      'payment_type', NEW.payment_type,
      'status', NEW.status,
      'subscription_id', NEW.subscription_id,
      'commission_expires_at', NEW.commission_expires_at,
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger for new commission records
CREATE TRIGGER on_new_commission_webhook
  AFTER INSERT ON public.affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_commission_webhook();