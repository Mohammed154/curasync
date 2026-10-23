import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables in public schema:', tables.map(t => t.table_name));

  const vitalCols = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'vitals' ORDER BY ordinal_position`;
  console.log('vitals columns:', vitalCols);

  const profileCols = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position`;
  console.log('profiles columns:', profileCols);

  const patCols = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'patient_profiles' ORDER BY ordinal_position`;
  console.log('patient_profiles columns:', patCols);

  await sql.end();
}

main().catch(console.error);
