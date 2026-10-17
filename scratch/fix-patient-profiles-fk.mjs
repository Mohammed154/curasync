import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL);

async function main() {
  console.log('Dropping obsolete auth.users foreign key on patient_profiles...');
  
  await sql`
    ALTER TABLE patient_profiles 
      DROP CONSTRAINT IF EXISTS patient_profiles_id_fkey;
  `;

  await sql`
    ALTER TABLE patient_profiles 
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
  `;

  console.log('Obsolete foreign key dropped successfully.');

  // Create demo patient in patient_profiles if missing
  const demoUser = 'dev_patient_alex_rivera';
  const existing = await sql`SELECT id FROM patient_profiles WHERE user_id = ${demoUser}`;
  if (existing.length === 0) {
    const [inserted] = await sql`
      INSERT INTO patient_profiles (user_id, name, date_of_birth, conditions, onboarding_complete)
      VALUES (${demoUser}, 'Alex Rivera', '1990-01-01', ARRAY['diabetes_t2', 'hypertension']::condition_id[], true)
      RETURNING id;
    `;
    console.log('Created demo patient_profile for dev_patient_alex_rivera:', inserted.id);
  } else {
    console.log('Existing patient_profile:', existing[0].id);
  }

  await sql.end();
}

main().catch(console.error);
