import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  const ids = ['5e78e1f8-4578-4bfd-b9a0-c8784c573c14', 'df75680f-4e26-4a10-b486-06f6c1bd0f0e'];
  for (const id of ids) {
    console.log('\n=== CHECKING ID:', id);
    const profs = await sql`SELECT id, email, display_name FROM profiles WHERE id = ${id}`;
    console.log('profiles:', profs);
    const patById = await sql`SELECT id, user_id, name FROM patient_profiles WHERE id::text = ${id}`;
    console.log('patient_profiles by id:', patById);
    const patByUserId = await sql`SELECT id, user_id, name FROM patient_profiles WHERE user_id = ${id}`;
    console.log('patient_profiles by user_id:', patByUserId);
    const vits = await sql`SELECT count(*) FROM vitals WHERE user_id = ${id} OR patient_id = ${id}`;
    console.log('vitals count:', vits);
    const glu = await sql`SELECT count(*) FROM glucose_readings WHERE user_id = ${id}`;
    console.log('glucose_readings count:', glu);
    const jrn = await sql`SELECT count(*) FROM journal_entries WHERE patient_id::text = ${id}`;
    console.log('journal_entries count:', jrn);
  }
  await sql.end();
}
main().catch(console.error);
