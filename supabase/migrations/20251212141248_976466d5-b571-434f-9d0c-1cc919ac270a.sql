-- Add email column to analytics_events table
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS email text;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_analytics_events_email ON public.analytics_events(email);