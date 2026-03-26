-- Enable realtime for analytics_events and affiliates tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliates;