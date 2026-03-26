-- Add additional payout fields to affiliates table
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS venmo_username text,
ADD COLUMN IF NOT EXISTS bank_account_name text,
ADD COLUMN IF NOT EXISTS bank_routing_number text,
ADD COLUMN IF NOT EXISTS bank_account_number text;