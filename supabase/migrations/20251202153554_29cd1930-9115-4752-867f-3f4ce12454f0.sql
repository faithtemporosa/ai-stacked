-- Add commission tracking period and application fields to affiliates
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS application_reason text,
ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid;

-- Add commission end date tracking to affiliate_commissions
ALTER TABLE public.affiliate_commissions
ADD COLUMN IF NOT EXISTS commission_expires_at timestamp with time zone;

-- Add referral tracking to profiles for discount application
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_discount_applied boolean DEFAULT false;

-- Update default status to pending for new affiliates
ALTER TABLE public.affiliates ALTER COLUMN status SET DEFAULT 'pending';

-- Add last_payout_date to track 60-day cycles
ALTER TABLE public.affiliates
ADD COLUMN IF NOT EXISTS last_payout_date timestamp with time zone;