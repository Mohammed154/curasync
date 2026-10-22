import postgres from "postgres";
import * as dotenv from "dotenv";
import fs from "fs";
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const sql = postgres(dbUrl, { ssl: "require" });

async function run() {
  const migrationSql = fs.readFileSync("supabase/migrations/20261022_add_onboarding_completed_column.sql", "utf-8");
  console.log("Applying migration...");
  await sql.unsafe(migrationSql);
  console.log("Migration applied successfully!");

  const pCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name LIKE 'onboarding%'`;
  console.log("PROFILES ONBOARDING COLS:", pCols);
  await sql.end();
}
run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
