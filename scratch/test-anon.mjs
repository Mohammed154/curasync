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
  const { data, error } = await supabase.from('profiles').select('id, conditions').limit(2);
  console.log('Anon select profiles:', { data, error });

  const { data: vData, error: vError } = await supabase.from('vitals').select('id, user_id, type, value, unit').limit(2);
  console.log('Anon select vitals:', { vData, vError });
}

main().catch(console.error);
