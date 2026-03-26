-- Add has_seen_welcome column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.has_seen_welcome IS 'Tracks whether user has seen the welcome dialog after signup';
