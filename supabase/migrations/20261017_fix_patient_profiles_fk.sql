-- 20261017_fix_patient_profiles_fk.sql
-- Removes obsolete auth.users foreign key constraint that blocks Firebase users

ALTER TABLE patient_profiles 
  DROP CONSTRAINT IF EXISTS patient_profiles_id_fkey;

ALTER TABLE patient_profiles 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
