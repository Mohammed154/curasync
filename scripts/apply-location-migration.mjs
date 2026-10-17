import postgres from "postgres";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: "require" });

async function run() {
  console.log("🚀 Applying migration 20261016_add_location_to_profiles.sql...");
  
  const migrationPath = path.resolve("./supabase/migrations/20261016_add_location_to_profiles.sql");
  const sqlContent = fs.readFileSync(migrationPath, "utf-8");

  await sql.unsafe(sqlContent);
  console.log("✅ Migration script executed successfully.");

  // Verify columns
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
    ORDER BY ordinal_position;
  `;
  console.log("\nUpdated columns of public.profiles:");
  console.table(cols);

  // Verify policies
  const policies = await sql`
    SELECT schemaname, tablename, policyname, cmd, permissive, qual, with_check
    FROM pg_policies
    WHERE tablename = 'profiles';
  `;
  console.log("\nUpdated policies on public.profiles:");
  console.table(policies);

  await sql.end();
}

run().catch((err) => {
  console.error("❌ Error applying migration:", err);
  process.exit(1);
});
