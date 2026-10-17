import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL, { ssl: "require" });

async function run() {
  const tables = ["profiles", "patient_profiles", "readings", "vitals", "glucose_readings", "medication_logs", "reports"];
  const constraints = await sql`
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'public.patient_profiles'::regclass
  `;
  console.log("\n--- CONSTRAINTS on patient_profiles ---");
  console.table(constraints);
  await sql.end();
}

run();
