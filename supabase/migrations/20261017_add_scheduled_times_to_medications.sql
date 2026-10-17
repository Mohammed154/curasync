-- 20261017_add_scheduled_times_to_medications.sql
ALTER TABLE medications 
  ADD COLUMN IF NOT EXISTS scheduled_times TEXT[];

UPDATE medications 
SET scheduled_times = custom_schedule 
WHERE scheduled_times IS NULL AND custom_schedule IS NOT NULL;
