import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const sql = postgres(dbUrl, { ssl: "require" });

async function run() {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles'`;
  console.log("Columns in profiles:", cols.map(c => c.column_name));
  const rows = await sql`SELECT id, email, display_name, role, onboarding_complete, conditions FROM profiles LIMIT 5`;
  console.log("Sample profiles:", rows);
  await sql.end();
}

run().catch(console.error);
