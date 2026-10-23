import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  await sql`ALTER TABLE public.vitals ADD COLUMN IF NOT EXISTS patient_id TEXT`;
  await sql`UPDATE public.vitals SET patient_id = user_id WHERE patient_id IS NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON public.vitals(patient_id, recorded_at DESC)`;
  console.log('Successfully ensured patient_id column and index on vitals!');
  await sql.end();
}

main().catch(console.error);
