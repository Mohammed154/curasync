import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  console.log('Purging all demo, mock, and seed data from tables...');
  
  await sql`DELETE FROM messages WHERE sender_id LIKE 'dev_%' OR recipient_id LIKE 'dev_%' OR sender_id LIKE 'provider_%'`;
  await sql`DELETE FROM journal_entries;`;
  await sql`DELETE FROM alert_events;`;
  await sql`DELETE FROM glucose_readings WHERE user_id LIKE 'dev_%';`;
  await sql`DELETE FROM vitals WHERE user_id LIKE 'dev_%';`;
  await sql`DELETE FROM readings WHERE patient_id IN (SELECT id FROM patient_profiles WHERE user_id LIKE 'dev_%');`;

  console.log('Demo data purged from database tables.');
  await sql.end();
}

main().catch(console.error);
