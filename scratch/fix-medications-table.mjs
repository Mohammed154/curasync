import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  console.log('Adding scheduled_times to medications table...');
  await sql`
    ALTER TABLE medications 
      ADD COLUMN IF NOT EXISTS scheduled_times TEXT[];
  `;
  await sql`
    UPDATE medications 
    SET scheduled_times = custom_schedule 
    WHERE scheduled_times IS NULL AND custom_schedule IS NOT NULL;
  `;
  console.log('Medications table updated successfully.');
  await sql.end();
}

main().catch(console.error);
