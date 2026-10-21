-- 20261021_add_weekly_digest_enabled.sql
-- Add weekly_digest_enabled flag to public.profiles

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS weekly_digest_enabled BOOLEAN DEFAULT true;
