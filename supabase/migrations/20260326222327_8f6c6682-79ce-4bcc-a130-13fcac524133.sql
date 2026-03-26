
-- 1. Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text,
  username text,
  avatar_url text,
  has_seen_welcome boolean NOT NULL DEFAULT false,
  email_digest_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 2. Contact submissions table
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  brand_name text,
  message text,
  cart_items text,
  order_total numeric DEFAULT 0,
  automation_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact submissions" ON public.contact_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contact submissions" ON public.contact_submissions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contact submissions" ON public.contact_submissions
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 3. Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 4. Login activity table
CREATE TABLE public.login_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_at timestamptz NOT NULL DEFAULT now(),
  country text,
  city text,
  browser text,
  os text
);

ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login activity" ON public.login_activity
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert login activity" ON public.login_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Admin activity logs table
CREATE TABLE public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid,
  action_type text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Customer credentials table
CREATE TABLE public.customer_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_name text NOT NULL,
  credential_key text NOT NULL,
  credential_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credentials" ON public.customer_credentials
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can insert their own credentials" ON public.customer_credentials
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own credentials" ON public.customer_credentials
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete their own credentials" ON public.customer_credentials
  FOR DELETE USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all credentials" ON public.customer_credentials
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete credentials" ON public.customer_credentials
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_credentials_updated_at BEFORE UPDATE ON public.customer_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
