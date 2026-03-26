-- Create webhook logs table
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view webhook logs"
  ON public.webhook_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs (via triggers)
CREATE POLICY "System can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  WITH CHECK (true);

-- Deny updates and deletes
CREATE POLICY "Deny updates to webhook logs"
  ON public.webhook_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "Admins can delete webhook logs"
  ON public.webhook_logs
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_trigger_name ON public.webhook_logs(trigger_name);

-- Update trigger functions to log their executions

-- 1. New User Signup
CREATE OR REPLACE FUNCTION public.notify_new_user_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'event_type', 'new_signup',
    'id', NEW.id,
    'user_id', NEW.user_id,
    'email', NEW.email,
    'username', NEW.username,
    'referred_by', NEW.referred_by,
    'created_at', NEW.created_at
  );

  -- Log the webhook call
  INSERT INTO public.webhook_logs (trigger_name, table_name, event_type, webhook_url, payload)
  VALUES ('on_new_user_signup_webhook', 'profiles', 'INSERT', 'https://faithtemporosa.app.n8n.cloud/webhook/96c9882c-1eb5-4f90-8a71-45e38dd3557f', payload);

  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/96c9882c-1eb5-4f90-8a71-45e38dd3557f',
    body := payload
  );

  RETURN NEW;
END;
$function$;

-- 2. New Affiliate
CREATE OR REPLACE FUNCTION public.notify_affiliate_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'event_type', 'new_affiliate',
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
  );

  INSERT INTO public.webhook_logs (trigger_name, table_name, event_type, webhook_url, payload)
  VALUES ('on_new_affiliate_webhook', 'affiliates', 'INSERT', 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b', payload);

  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
    body := payload
  );

  RETURN NEW;
END;
$function$;

-- 3. Affiliate Status Change
CREATE OR REPLACE FUNCTION public.notify_affiliate_status_change_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload JSONB;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    payload := jsonb_build_object(
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
    );

    INSERT INTO public.webhook_logs (trigger_name, table_name, event_type, webhook_url, payload)
    VALUES ('on_affiliate_status_change_webhook', 'affiliates', 'UPDATE', 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b', payload);

    PERFORM net.http_post(
      url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. New Payout Request
CREATE OR REPLACE FUNCTION public.notify_affiliate_payout_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'event_type', 'payout_request',
    'id', NEW.id,
    'affiliate_id', NEW.affiliate_id,
    'amount', NEW.amount,
    'payout_method', NEW.payout_method,
    'status', NEW.status,
    'payout_details', NEW.payout_details,
    'requested_at', NEW.requested_at
  );

  INSERT INTO public.webhook_logs (trigger_name, table_name, event_type, webhook_url, payload)
  VALUES ('on_affiliate_payout_webhook', 'affiliate_payouts', 'INSERT', 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b', payload);

  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
    body := payload
  );

  RETURN NEW;
END;
$function$;

-- 5. Payout Status Change
CREATE OR REPLACE FUNCTION public.notify_affiliate_payout_status_change_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload JSONB;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    payload := jsonb_build_object(
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
    );

    INSERT INTO public.webhook_logs (trigger_name, table_name, event_type, webhook_url, payload)
    VALUES ('on_affiliate_payout_status_change_webhook', 'affiliate_payouts', 'UPDATE', 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b', payload);

    PERFORM net.http_post(
      url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. New Commission
CREATE OR REPLACE FUNCTION public.notify_new_commission_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
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
  );

  INSERT INTO public.webhook_logs (trigger_name, table_name, event_type, webhook_url, payload)
  VALUES ('on_new_commission_webhook', 'affiliate_commissions', 'INSERT', 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b', payload);

  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
    body := payload
  );

  RETURN NEW;
END;
$function$;

-- 7. Commission Status Change
CREATE OR REPLACE FUNCTION public.notify_commission_status_change_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  payload JSONB;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    payload := jsonb_build_object(
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
    );

    INSERT INTO public.webhook_logs (trigger_name, table_name, event_type, webhook_url, payload)
    VALUES ('on_commission_status_change_webhook', 'affiliate_commissions', 'UPDATE', 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b', payload);

    PERFORM net.http_post(
      url := 'https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b',
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$function$;