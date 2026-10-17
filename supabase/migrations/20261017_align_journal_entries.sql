-- 20261017_align_journal_entries.sql
-- Aligns journal_entries columns with Drizzle schema and application requirements

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS severity INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS condition_id TEXT DEFAULT 'diabetes_t2',
  ADD COLUMN IF NOT EXISTS body_location TEXT,
  ADD COLUMN IF NOT EXISTS context_tags TEXT[],
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS editable_until TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '2 days';

UPDATE journal_entries
SET 
  text = COALESCE(notes, 'Symptom logged'),
  recorded_at = COALESCE(logged_at, created_at, NOW()),
  editable_until = NOW() + INTERVAL '2 days'
WHERE text IS NULL;

ALTER TABLE journal_entries 
  ALTER COLUMN text SET NOT NULL,
  ALTER COLUMN severity SET NOT NULL,
  ALTER COLUMN condition_id SET NOT NULL,
  ALTER COLUMN editable_until SET NOT NULL;
