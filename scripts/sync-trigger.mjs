import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  await sql`
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
  `;

  await sql`
    DROP TRIGGER IF EXISTS trg_sync_vitals_patient_user_id ON public.vitals;
  `;

  await sql`
    CREATE TRIGGER trg_sync_vitals_patient_user_id
    BEFORE INSERT OR UPDATE ON public.vitals
    FOR EACH ROW
    EXECUTE FUNCTION sync_vitals_patient_user_id();
  `;

  console.log('Successfully set up sync trigger on vitals!');
  await sql.end();
}

main().catch(console.error);
