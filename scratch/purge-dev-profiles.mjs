import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function run() {
  await sql`DELETE FROM patient_profiles WHERE user_id LIKE 'dev_%'`;
  const res = await sql`SELECT id, user_id, name FROM patient_profiles`;
  console.log('Remaining patient profiles:', res);
  await sql.end();
}

run().catch(console.error);
