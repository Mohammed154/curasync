-- 20261022_medication_logs_persistence.sql
-- Ensure medication_logs has scheduled_date, taken_at, and unique constraint on (medication_id, scheduled_date)

ALTER TABLE medication_logs 
ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ;

UPDATE medication_logs 
SET scheduled_date = COALESCE(scheduled_at::date, CURRENT_DATE) 
WHERE scheduled_date IS NULL;

DELETE FROM medication_logs a
USING medication_logs b
WHERE a.medication_id = b.medication_id
  AND a.scheduled_date = b.scheduled_date
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS medication_logs_med_date_uidx 
ON medication_logs (medication_id, scheduled_date);
