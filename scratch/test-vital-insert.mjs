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
  const { data, error } = await supabase.from('vitals').insert({
    user_id: 'dev_patient_alex_rivera',
    type: 'egfr',
    value: 85,
    unit: 'mL/min/1.73m²',
    source: 'manual',
    recorded_at: new Date().toISOString(),
  }).select();
  console.log('Anon insert vital result:', { data, error });

  if (data?.[0]?.id) {
    await supabase.from('vitals').delete().eq('id', data[0].id);
  }
}

main().catch(console.error);
