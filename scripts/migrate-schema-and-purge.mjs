import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: "require" });

async function exec(statement) {
  return sql.unsafe(statement);
}

async function run() {
  console.log("🚀 Starting database migration and sample data purge...");

  // 1. Purge Arjun Mehta sample data from existing tables
  console.log("🗑️ Purging sample data for 'Arjun'...");
  try {
    await exec("DELETE FROM patient_profiles WHERE name ILIKE '%Arjun%' OR id = '00000000-0000-0000-0000-000000000001'");
    console.log("  ✅ Purged patient_profiles for Arjun");
  } catch (e) {
    console.warn("  ⚠️ patient_profiles purge notice:", e.message);
  }

  // 2. Create public.profiles
  console.log("📦 Ensuring public.profiles table...");
  await exec(`
    CREATE TABLE IF NOT EXISTS public.profiles (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT,
      photo_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_report_sent_at TIMESTAMPTZ DEFAULT NULL,
      onboarding_complete BOOLEAN DEFAULT false,
      date_of_birth DATE,
      conditions TEXT[] DEFAULT '{}',
      emergency_contact JSONB,
      latitude NUMERIC,
      longitude NUMERIC,
      city TEXT,
      region TEXT,
      country TEXT,
      location_updated_at TIMESTAMPTZ
    );
  `);

  // 3. Create public.vitals
  console.log("📦 Ensuring public.vitals table...");
  await exec(`
    CREATE TABLE IF NOT EXISTS public.vitals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      value NUMERIC NOT NULL,
      unit TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await exec(`CREATE INDEX IF NOT EXISTS idx_vitals_user_recorded ON public.vitals(user_id, recorded_at DESC);`);

  // 4. Create public.glucose_readings
  console.log("📦 Ensuring public.glucose_readings table...");
  await exec(`
    CREATE TABLE IF NOT EXISTS public.glucose_readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      value NUMERIC NOT NULL,
      unit TEXT NOT NULL DEFAULT 'mg/dL',
      meal_context TEXT DEFAULT 'fasting',
      source TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await exec(`CREATE INDEX IF NOT EXISTS idx_glucose_user_recorded ON public.glucose_readings(user_id, recorded_at DESC);`);

  // 5. Ensure public.medication_logs has user_id
  console.log("📦 Ensuring public.medication_logs table...");
  await exec(`
    CREATE TABLE IF NOT EXISTS public.medication_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
      medication_name TEXT,
      dosage TEXT,
      frequency TEXT,
      status TEXT NOT NULL DEFAULT 'taken',
      scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      logged_at TIMESTAMPTZ DEFAULT now(),
      skipped_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_logs' AND column_name = 'user_id') THEN
        ALTER TABLE public.medication_logs ADD COLUMN user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_logs' AND column_name = 'medication_name') THEN
        ALTER TABLE public.medication_logs ADD COLUMN medication_name TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_logs' AND column_name = 'dosage') THEN
        ALTER TABLE public.medication_logs ADD COLUMN dosage TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_logs' AND column_name = 'frequency') THEN
        ALTER TABLE public.medication_logs ADD COLUMN frequency TEXT;
      END IF;
    END $$;
  `);
  await exec(`CREATE INDEX IF NOT EXISTS idx_medication_logs_user_logged ON public.medication_logs(user_id, logged_at DESC);`);

  // 6. Create public.reports
  console.log("📦 Ensuring public.reports table...");
  await exec(`
    CREATE TABLE IF NOT EXISTS public.reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      report_type TEXT NOT NULL DEFAULT 'monthly_summary',
      date_range_start TIMESTAMPTZ NOT NULL,
      date_range_end TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      recipient_email TEXT,
      file_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await exec(`CREATE INDEX IF NOT EXISTS idx_reports_user_created ON public.reports(user_id, created_at DESC);`);

  // 7. Enable RLS on all 5 tables
  console.log("🔒 Enabling Row Level Security (RLS)...");
  await exec(`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`);
  await exec(`ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;`);
  await exec(`ALTER TABLE public.glucose_readings ENABLE ROW LEVEL SECURITY;`);
  await exec(`ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;`);
  await exec(`ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;`);

  // Policies
  await exec(`
    DO $$
    BEGIN
      DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
      CREATE POLICY "profiles_policy" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "vitals_policy" ON public.vitals;
      CREATE POLICY "vitals_policy" ON public.vitals FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "glucose_policy" ON public.glucose_readings;
      CREATE POLICY "glucose_policy" ON public.glucose_readings FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "meds_policy" ON public.medication_logs;
      CREATE POLICY "meds_policy" ON public.medication_logs FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "reports_policy" ON public.reports;
      CREATE POLICY "reports_policy" ON public.reports FOR ALL USING (true) WITH CHECK (true);
    END $$;
  `);

  console.log("✅ All tables verified, RLS enabled, and sample data purged successfully!");
  await sql.end();
}

run().catch((e) => {
  console.error("❌ Migration error:", e);
  process.exit(1);
});
