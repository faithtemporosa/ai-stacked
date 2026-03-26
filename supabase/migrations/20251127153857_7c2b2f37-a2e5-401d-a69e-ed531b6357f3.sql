-- Add customer and order details to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN customer_name text,
  ADD COLUMN customer_email text,
  ADD COLUMN bundle_name text,
  ADD COLUMN total_amount numeric DEFAULT 0,
  ADD COLUMN automations_purchased text[] DEFAULT '{}';