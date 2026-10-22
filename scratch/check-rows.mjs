import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const sql = postgres(dbUrl, { ssl: "require" });

async function run() {
  const p = await sql`SELECT id, email, display_name, role, onboarding_complete, conditions FROM profiles LIMIT 10`;
  console.log('PROFILES:', p);
  const pp = await sql`SELECT id, user_id, name, onboarding_complete, conditions FROM patient_profiles LIMIT 10`;
  console.log('PATIENT_PROFILES:', pp);
  await sql.end();
}
run();
