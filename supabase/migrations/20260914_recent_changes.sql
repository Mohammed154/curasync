-- ==============================================================================
-- CURASYNC SUPABASE DATABASE MIGRATION — RECENT CHANGES
-- Description:
-- 1. Schema sync for Telehealth Video Rooms (consultations), Calendar Reminders
--    (follow_up_reminders), Messages, Provider-Patient Links, and HIPAA Audit Log.
-- 2. Patient profiles user_id column addition & backfill.
-- 3. Storage bucket setup for exported clinical PDFs.
-- 4. Clean-up queries for hospital-only vitals (peak_flow, heart_rate, spo2)
--    and hospital conditions (copd, chf, cad).
-- ==============================================================================

-- ── 1. PATIENT PROFILES FIX ───────────────────────────────────────────────────
-- Ensure user_id column exists and is indexed for Clerk/Auth integration
ALTER TABLE IF EXISTS patient_profiles 
  ADD COLUMN IF NOT EXISTS user_id TEXT UNIQUE;

UPDATE patient_profiles 
SET user_id = id::text 
WHERE user_id IS NULL;


-- ── 2. CONSULTATIONS (Live Telehealth Video Rooms) ────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  provider_id  TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 20,
  status       TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  room_url     TEXT,
  room_name    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_id   ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_consultations_status       ON consultations(status);


-- ── 3. FOLLOW-UP REMINDERS (Calendar & Telehealth Follow-ups) ─────────────────
CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id             UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  created_by              TEXT NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  due_date                TIMESTAMPTZ NOT NULL,
  reminder_type           TEXT NOT NULL DEFAULT 'general', -- 'general' | 'lab_test' | 'consultation' | 'medication_review'
  related_consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  status                  TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'dismissed'
  notify_at               TIMESTAMPTZ[],
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_patient  ON follow_up_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_due_date ON follow_up_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_status   ON follow_up_reminders(status);


-- ── 4. MESSAGES (Encrypted Provider-Patient Communications) ───────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    UUID NOT NULL,
  sender_id    TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  sender_role  TEXT NOT NULL, -- 'patient' | 'provider' | 'admin'
  content      TEXT NOT NULL,
  sent_at      TIMESTAMPTZ DEFAULT now(),
  read_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id    ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at      ON messages(sent_at);


-- ── 5. PROVIDER PATIENTS & INVITE CODES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_patients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  patient_id  UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
  linked_at   TIMESTAMPTZ DEFAULT now(),
  invite_code TEXT,
  status      TEXT NOT NULL DEFAULT 'active' -- 'active' | 'revoked'
);

CREATE INDEX IF NOT EXISTS idx_provider_patients_provider ON provider_patients(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_patients_patient  ON provider_patients(patient_id);

CREATE TABLE IF NOT EXISTS invite_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  provider_id TEXT NOT NULL,
  patient_id  UUID REFERENCES patient_profiles(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);


-- ── 6. AUDIT LOG (HIPAA Compliance & Export Activity) ─────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    TEXT NOT NULL,
  action      TEXT NOT NULL, -- 'READ' | 'WRITE' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'LOGOUT'
  resource    TEXT NOT NULL,
  resource_id TEXT,
  patient_id  UUID REFERENCES patient_profiles(id) ON DELETE SET NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_patient_id ON audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);


-- ── 7. STORAGE BUCKET FOR PDF EXPORTS ─────────────────────────────────────────
-- Supabase Storage bucket to hold PDF reports generated by the Edge Function
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-exports',
  'patient-exports',
  true,
  10485760, -- 10MB max PDF limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf']::text[];

-- Storage security policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can view patient exports'
  ) THEN
    CREATE POLICY "Public can view patient exports"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'patient-exports');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role can upload patient exports'
  ) THEN
    CREATE POLICY "Service role can upload patient exports"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'patient-exports');
  END IF;
END $$;


-- ── 8. DATA CLEANUP QUERIES (RECENT REMOVALS) ─────────────────────────────────
-- Run these queries if you want to purge test data for vitals/conditions that
-- were moved to in-hospital monitoring (Peak Flow, Heart Rate, SpO2, COPD, CHF, CAD):

-- Clean up any readings recorded for removed vitals:
DELETE FROM readings 
WHERE type::text IN ('peak_flow', 'heart_rate', 'spo2');

-- Clean up any alert thresholds for removed vitals:
DELETE FROM alert_thresholds 
WHERE type::text IN ('peak_flow', 'heart_rate', 'spo2');

-- Clean up any alert events generated for removed vitals:
DELETE FROM alert_events 
WHERE type::text IN ('peak_flow', 'heart_rate', 'spo2');

-- Clean up active patient profile conditions (removes copd, chf, cad from condition_id[] enum array):
UPDATE patient_profiles 
SET conditions = array_remove(
  array_remove(
    array_remove(conditions, 'copd'::condition_id), 
    'chf'::condition_id
  ), 
  'cad'::condition_id
)
WHERE conditions && ARRAY['copd', 'chf', 'cad']::condition_id[];

-- Clean up medications linked to copd, chf, or cad:
DELETE FROM medications 
WHERE condition_id::text IN ('copd', 'chf', 'cad');
