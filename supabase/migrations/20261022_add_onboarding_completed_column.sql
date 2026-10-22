-- Migration: Ensure both onboarding_complete and onboarding_completed exist on profiles and patient_profiles
ALTER TABLE IF EXISTS profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

UPDATE profiles 
SET onboarding_completed = COALESCE(onboarding_complete, false) 
WHERE onboarding_completed IS NULL;

ALTER TABLE IF EXISTS patient_profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

UPDATE patient_profiles 
SET onboarding_completed = COALESCE(onboarding_complete, false) 
WHERE onboarding_completed IS NULL;

-- Create sync trigger to keep onboarding_complete and onboarding_completed in sync
CREATE OR REPLACE FUNCTION sync_onboarding_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.onboarding_complete IS NOT NULL AND (NEW.onboarding_completed IS NULL OR NEW.onboarding_completed != NEW.onboarding_complete) THEN
    NEW.onboarding_completed := NEW.onboarding_complete;
  ELSIF NEW.onboarding_completed IS NOT NULL AND (NEW.onboarding_complete IS NULL OR NEW.onboarding_complete != NEW.onboarding_completed) THEN
    NEW.onboarding_complete := NEW.onboarding_completed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profiles_onboarding ON profiles;
CREATE TRIGGER trg_sync_profiles_onboarding
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_onboarding_status();

DROP TRIGGER IF EXISTS trg_sync_patient_profiles_onboarding ON patient_profiles;
CREATE TRIGGER trg_sync_patient_profiles_onboarding
BEFORE INSERT OR UPDATE ON patient_profiles
FOR EACH ROW EXECUTE FUNCTION sync_onboarding_status();
