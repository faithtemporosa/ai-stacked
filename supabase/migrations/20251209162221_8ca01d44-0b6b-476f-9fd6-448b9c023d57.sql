-- Create function to notify commission status change webhook
CREATE OR REPLACE FUNCTION public.notify_commission_status_change_webhook()
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
        'event_type', 'commission_status_change',
        'id', NEW.id,
        'affiliate_id', NEW.affiliate_id,
        'referred_user_id', NEW.referred_user_id,
        'commission_amount', NEW.commission_amount,
        'commission_rate', NEW.commission_rate,
        'payment_amount', NEW.payment_amount,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'paid_at', NEW.paid_at,
        'stripe_payment_id', NEW.stripe_payment_id,
        'notes', NEW.notes
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for commission status changes
CREATE TRIGGER on_commission_status_change_webhook
  AFTER UPDATE ON public.affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_commission_status_change_webhook();