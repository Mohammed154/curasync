import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  const tables = [
    'alert_events',
    'journal_entries',
    'messages',
    'consultations',
    'medications',
    'readings',
    'vitals',
    'glucose_readings',
    'patient_profiles',
    'provider_patients',
    'provider_profiles'
  ];

  for (const t of tables) {
    try {
      const [{ count }] = await sql`SELECT count(*)::int as count FROM ${sql(t)}`;
      console.log(`Table [${t}]: ${count} rows`);
    } catch (e) {
      console.log(`Table [${t}]: Error ${e.message}`);
    }
  }

  await sql.end();
}

main().catch(console.error);
