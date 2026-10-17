import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  const def = await sql`SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'audit_log'::regclass`;
  console.log('Constraints on audit_log:', def);



  const rows = await sql`SELECT id, user_id, name FROM patient_profiles LIMIT 5`;
  console.log('Sample patient_profiles:', rows);


  await sql.end();
}

main().catch(console.error);
