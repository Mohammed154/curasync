import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  const rls = await sql`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
    WHERE pg_namespace.nspname = 'public' 
      AND relname IN ('vitals', 'profiles', 'patient_profiles');
  `;
  console.log('RLS Status:', rls);

  const policies = await sql`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('vitals', 'profiles', 'patient_profiles');
  `;
  console.log('Policies:', policies);

  await sql.end();
}

main().catch(console.error);
