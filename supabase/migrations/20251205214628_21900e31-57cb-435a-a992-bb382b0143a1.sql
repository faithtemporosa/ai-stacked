-- Drop the existing check constraint on notifications type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add a more flexible check constraint that includes affiliate notification types
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('referral_signup', 'wishlist_update', 'role_change', 'affiliate_approved', 'affiliate_rejected', 'order_update', 'commission_earned', 'payout_processed', 'system', 'info'));