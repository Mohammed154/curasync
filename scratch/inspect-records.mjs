import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  const pp = await sql`SELECT id, user_id, name FROM patient_profiles`;
  console.log('patient_profiles:', pp);
  const r = await sql`SELECT id, patient_id, type, value FROM readings`;
  console.log('readings:', r);
  const v = await sql`SELECT id, user_id, type, value FROM vitals`;
  console.log('vitals:', v);
  const g = await sql`SELECT id, user_id, glucose_mgdl FROM glucose_readings`;
  console.log('glucose_readings:', g);
  await sql.end();
}

main().catch(console.error);
