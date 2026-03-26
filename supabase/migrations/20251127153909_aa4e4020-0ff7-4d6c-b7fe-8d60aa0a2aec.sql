-- Update webhook function to include new subscription fields
CREATE OR REPLACE FUNCTION public.notify_subscription_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Make async HTTP POST request to n8n webhook
  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/1bafe0e1-67a3-49ba-8795-b42552f7db3b',
    body := jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'customer_name', NEW.customer_name,
      'customer_email', NEW.customer_email,
      'bundle_name', NEW.bundle_name,
      'total_amount', NEW.total_amount,
      'automations_purchased', NEW.automations_purchased,
      'stripe_customer_id', NEW.stripe_customer_id,
      'stripe_subscription_id', NEW.stripe_subscription_id,
      'stripe_price_id', NEW.stripe_price_id,
      'status', NEW.status,
      'automation_limit', NEW.automation_limit,
      'automations_used', NEW.automations_used,
      'current_period_start', NEW.current_period_start,
      'current_period_end', NEW.current_period_end,
      'cancel_at_period_end', NEW.cancel_at_period_end,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    )
  );

  RETURN NEW;
END;
$function$;