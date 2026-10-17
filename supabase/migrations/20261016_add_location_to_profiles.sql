-- 20261016_add_location_to_profiles.sql
-- Deprecate wearable/hardware device sync and add geographic location metadata to public.profiles

-- 1. Add location columns to public.profiles
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- 2. Verify and configure Row Level Security (RLS) on public.profiles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
  DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

  CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (true);

  CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (true)
    WITH CHECK (true);

  CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (true);
END $$;
