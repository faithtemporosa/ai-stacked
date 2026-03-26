-- Create function to notify affiliate payout status change webhook
CREATE OR REPLACE FUNCTION public.notify_affiliate_payout_status_change_webhook()
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
        'event_type', 'payout_status_change',
        'id', NEW.id,
        'affiliate_id', NEW.affiliate_id,
        'amount', NEW.amount,
        'payout_method', NEW.payout_method,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'processed_by', NEW.processed_by,
        'processed_at', NEW.processed_at,
        'admin_notes', NEW.admin_notes,
        'payout_details', NEW.payout_details
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for payout status changes
CREATE TRIGGER on_affiliate_payout_status_change_webhook
  AFTER UPDATE ON public.affiliate_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_affiliate_payout_status_change_webhook();