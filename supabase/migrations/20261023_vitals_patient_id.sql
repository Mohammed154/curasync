-- Migration: Add patient_id to vitals and keep synchronized with user_id
ALTER TABLE public.vitals ADD COLUMN IF NOT EXISTS patient_id TEXT;
UPDATE public.vitals SET patient_id = user_id WHERE patient_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON public.vitals(patient_id, recorded_at DESC);

CREATE OR REPLACE FUNCTION sync_vitals_patient_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.patient_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.patient_id := NEW.user_id;
  END IF;
  IF NEW.user_id IS NULL AND NEW.patient_id IS NOT NULL THEN
    NEW.user_id := NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_vitals_patient_user_id ON public.vitals;

CREATE TRIGGER trg_sync_vitals_patient_user_id
BEFORE INSERT OR UPDATE ON public.vitals
FOR EACH ROW
EXECUTE FUNCTION sync_vitals_patient_user_id();
