import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: "require" });

async function inspect() {
  console.log("==========================================");
  console.log("📊 CURASYNC SUPABASE DATABASE INSPECTOR");
  console.log("==========================================\n");

  const tables = ["patient_profiles", "medications", "readings", "journal_entries"];

  for (const table of tables) {
    try {
      const countRes = await sql`SELECT COUNT(*)::int FROM ${sql(table)}`;
      const rows = await sql`SELECT * FROM ${sql(table)} ORDER BY 1 DESC LIMIT 3`;
      console.log(`📂 Table: ${table.toUpperCase()} (${countRes[0].count} total rows)`);
      console.table(rows);
      console.log("------------------------------------------\n");
    } catch (err) {
      console.error(`⚠️ Could not query ${table}:`, err.message);
    }
  }

  await sql.end();
}

inspect();
