-- Create table for tool credential configurations
CREATE TABLE public.tool_credential_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  help_text TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tool_credential_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tool configs
CREATE POLICY "Admins can view all tool configs"
ON public.tool_credential_configs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert tool configs"
ON public.tool_credential_configs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tool configs"
ON public.tool_credential_configs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tool configs"
ON public.tool_credential_configs
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Public read access for active configs (needed for credential forms)
CREATE POLICY "Anyone can view active tool configs"
ON public.tool_credential_configs
FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_tool_credential_configs_updated_at
BEFORE UPDATE ON public.tool_credential_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_tool_credential_configs_tool_key ON public.tool_credential_configs(tool_key);
CREATE INDEX idx_tool_credential_configs_is_active ON public.tool_credential_configs(is_active);