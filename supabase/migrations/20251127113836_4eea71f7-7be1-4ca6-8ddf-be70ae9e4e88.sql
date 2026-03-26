-- Create analytics events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL DEFAULT 'pageview',
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_page_path ON public.analytics_events(page_path);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert analytics events (for tracking)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can view analytics events
CREATE POLICY "Admins can view all analytics events"
  ON public.analytics_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Deny updates and deletes
CREATE POLICY "Deny updates to analytics events"
  ON public.analytics_events
  FOR UPDATE
  USING (false);

CREATE POLICY "Deny deletes to analytics events"
  ON public.analytics_events
  FOR DELETE
  USING (false);