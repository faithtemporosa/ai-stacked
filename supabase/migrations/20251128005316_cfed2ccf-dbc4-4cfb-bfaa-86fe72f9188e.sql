-- Create enum for credential types
CREATE TYPE public.credential_type AS ENUM (
  'google_oauth',
  'wordpress_admin',
  'meta_business',
  'tiktok_oauth',
  'crm_api',
  'api_key',
  'webhook_secret',
  'smtp',
  'database',
  'other'
);

-- Create credentials table
CREATE TABLE public.customer_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  credential_type credential_type NOT NULL,
  encrypted_username TEXT,
  encrypted_password TEXT,
  encrypted_api_key TEXT,
  encrypted_extra_fields JSONB,
  connection_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_customer_credentials_customer_id ON public.customer_credentials(customer_id);
CREATE INDEX idx_customer_credentials_tool_name ON public.customer_credentials(tool_name);

-- Enable RLS
ALTER TABLE public.customer_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers (can only see their own credentials)
CREATE POLICY "Customers can view their own credentials"
  ON public.customer_credentials
  FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert their own credentials"
  ON public.customer_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own credentials"
  ON public.customer_credentials
  FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete their own credentials"
  ON public.customer_credentials
  FOR DELETE
  USING (auth.uid() = customer_id);

-- RLS Policies for admins (can see all credentials)
CREATE POLICY "Admins can view all credentials"
  ON public.customer_credentials
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all credentials"
  ON public.customer_credentials
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all credentials"
  ON public.customer_credentials
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create audit log table for credential access
CREATE TABLE public.credential_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.customer_credentials(id) ON DELETE CASCADE,
  accessed_by UUID NOT NULL REFERENCES auth.users(id),
  access_type TEXT NOT NULL, -- 'view', 'decrypt', 'edit', 'delete', 'api_access'
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_credential_access_logs_credential_id ON public.credential_access_logs(credential_id);
CREATE INDEX idx_credential_access_logs_accessed_at ON public.credential_access_logs(accessed_at);

-- Enable RLS on audit logs
ALTER TABLE public.credential_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.credential_access_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Anyone authenticated can insert their own access logs
CREATE POLICY "Users can insert audit logs"
  ON public.credential_access_logs
  FOR INSERT
  WITH CHECK (auth.uid() = accessed_by);

-- Create trigger for updating updated_at
CREATE TRIGGER update_customer_credentials_updated_at
  BEFORE UPDATE ON public.customer_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();