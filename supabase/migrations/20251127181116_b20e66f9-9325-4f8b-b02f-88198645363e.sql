-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN username text;

-- Add index for username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Add unique constraint to ensure usernames are unique (optional, but recommended)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);