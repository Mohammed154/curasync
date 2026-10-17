import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL, { ssl: "require" });

async function run() {
  const profileCols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position;
  `;
  console.log("Columns of profiles table:");
  console.table(profileCols);

  const deviceCols = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND (column_name ILIKE '%device%' OR column_name ILIKE '%wearable%' OR column_name ILIKE '%sync%');
  `;
  console.log("Device/Wearable/Sync columns in DB:");
  console.table(deviceCols);

  const policies = await sql`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'profiles';
  `;
  console.log("Policies on profiles:");
  console.table(policies);

  await sql.end();
}

run().catch(console.error);
