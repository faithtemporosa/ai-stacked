-- Create function to notify affiliate payout webhook
CREATE OR REPLACE FUNCTION public.notify_affiliate_payout_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
    body := jsonb_build_object(
      'event_type', 'payout_request',
      'id', NEW.id,
      'affiliate_id', NEW.affiliate_id,
      'amount', NEW.amount,
      'payout_method', NEW.payout_method,
      'status', NEW.status,
      'payout_details', NEW.payout_details,
      'requested_at', NEW.requested_at
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger for new payout requests
CREATE TRIGGER on_affiliate_payout_webhook
  AFTER INSERT ON public.affiliate_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_affiliate_payout_webhook();