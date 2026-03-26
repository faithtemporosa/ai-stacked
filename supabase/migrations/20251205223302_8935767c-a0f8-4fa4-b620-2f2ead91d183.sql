-- Enable realtime for automations table
ALTER TABLE public.automations REPLICA IDENTITY FULL;

-- Add to supabase_realtime publication (safe to run even if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'automations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.automations;
  END IF;
END $$;