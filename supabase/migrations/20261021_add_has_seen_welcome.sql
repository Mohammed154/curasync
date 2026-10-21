-- 20261021_add_has_seen_welcome.sql
-- Add has_seen_welcome flag and role to public.profiles

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'patient';
