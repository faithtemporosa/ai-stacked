-- Create trigger function to notify affiliate on referral signup
CREATE OR REPLACE FUNCTION public.notify_affiliate_on_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affiliate_user_id uuid;
  referred_email text;
BEGIN
  -- Only proceed if this profile has a referred_by value
  IF NEW.referred_by IS NOT NULL THEN
    -- Get the affiliate's user_id
    SELECT user_id INTO affiliate_user_id
    FROM public.affiliates
    WHERE id = NEW.referred_by;
    
    -- Get the referred user's email (masked for privacy)
    referred_email := COALESCE(
      CONCAT(LEFT(NEW.email, 2), '***@', SPLIT_PART(NEW.email, '@', 2)),
      'A new user'
    );
    
    -- Create notification for the affiliate
    IF affiliate_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        affiliate_user_id,
        '🎉 New Referral Signup!',
        format('%s just signed up using your referral link!', referred_email),
        'referral_signup',
        '/affiliate'
      );
      
      -- Increment affiliate referrals count
      PERFORM increment_affiliate_referrals(NEW.referred_by);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table for new signups with referrals
DROP TRIGGER IF EXISTS on_referral_signup ON public.profiles;
CREATE TRIGGER on_referral_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_affiliate_on_referral_signup();