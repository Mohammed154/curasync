import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  console.log('Adding missing columns to journal_entries...');
  
  await sql`
    ALTER TABLE journal_entries
      ADD COLUMN IF NOT EXISTS text TEXT,
      ADD COLUMN IF NOT EXISTS severity INTEGER DEFAULT 5,
      ADD COLUMN IF NOT EXISTS condition_id TEXT DEFAULT 'diabetes_t2',
      ADD COLUMN IF NOT EXISTS body_location TEXT,
      ADD COLUMN IF NOT EXISTS context_tags TEXT[],
      ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS editable_until TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '2 days';
  `;

  await sql`
    UPDATE journal_entries
    SET 
      text = COALESCE(notes, 'Symptom logged'),
      recorded_at = COALESCE(logged_at, created_at, NOW()),
      editable_until = NOW() + INTERVAL '2 days'
    WHERE text IS NULL;
  `;

  // Make text not null now that existing rows have a value
  await sql`
    ALTER TABLE journal_entries 
      ALTER COLUMN text SET NOT NULL,
      ALTER COLUMN severity SET NOT NULL,
      ALTER COLUMN condition_id SET NOT NULL,
      ALTER COLUMN editable_until SET NOT NULL;
  `;

  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'journal_entries'
    ORDER BY ordinal_position;
  `;
  console.log('Updated journal_entries columns:', cols);
  await sql.end();
}

main().catch(console.error);
