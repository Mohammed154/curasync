import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const sql = postgres(dbUrl, { ssl: "require" });

async function run() {
  const pCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles'`;
  console.log('PROFILES COLS:', pCols.map(c => c.column_name));
  const ppCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'patient_profiles'`;
  console.log('PATIENT_PROFILES COLS:', ppCols.map(c => c.column_name));
  await sql.end();
}
run();
