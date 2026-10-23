import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

let raw = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_SUPABASE_URL || "https://qljcabrkkkcxyfmgiuey.supabase.co";
if (raw.startsWith("db.")) raw = raw.slice(3);
if (!raw.startsWith("http")) raw = `https://${raw}`;

const supabase = createClient(
  raw,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  // Test update on dev_patient_alex_rivera
  const { data, error } = await supabase
    .from('profiles')
    .update({ conditions: ['diabetes_t2'] })
    .eq('id', 'dev_patient_alex_rivera')
    .select();
  console.log('Anon update profiles result:', { data, error });

  const { data: ppData, error: ppError } = await supabase
    .from('patient_profiles')
    .update({ conditions: ['diabetes_t2'] })
    .eq('user_id', 'dev_patient_alex_rivera')
    .select();
  console.log('Anon update patient_profiles result:', { ppData, ppError });

  // Reset back to []
  await supabase.from('profiles').update({ conditions: [] }).eq('id', 'dev_patient_alex_rivera');
  await supabase.from('patient_profiles').update({ conditions: [] }).eq('user_id', 'dev_patient_alex_rivera');
}

main().catch(console.error);
