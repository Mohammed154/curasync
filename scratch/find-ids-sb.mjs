import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

let url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qljcabrkkkcxyfmgiuey.supabase.co";
if (url.startsWith("db.")) url = url.slice(3);
if (!url.startsWith("http")) url = `https://${url}`;

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function check() {
  const ids = ['5e78e1f8-4578-4bfd-b9a0-c8784c573c14', 'df75680f-4e26-4a10-b486-06f6c1bd0f0e'];
  for (const id of ids) {
    console.log('\n=======================================');
    console.log('CHECKING ID:', id);
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', id);
    console.log('profiles by id:', prof);

    const { data: patId } = await supabase.from('patient_profiles').select('*').eq('id', id);
    console.log('patient_profiles by id:', patId);

    const { data: patUserId } = await supabase.from('patient_profiles').select('*').eq('user_id', id);
    console.log('patient_profiles by user_id:', patUserId);

    const { count: vitalsCount } = await supabase.from('vitals').select('*', { count: 'exact', head: true }).or(`user_id.eq.${id},patient_id.eq.${id}`);
    console.log('vitals count:', vitalsCount);

    const { count: glucoseCount } = await supabase.from('glucose_readings').select('*', { count: 'exact', head: true }).eq('user_id', id);
    console.log('glucose_readings count:', glucoseCount);

    const { count: journalCount } = await supabase.from('journal_entries').select('*', { count: 'exact', head: true }).eq('patient_id', id);
    console.log('journal_entries count:', journalCount);

    const { count: medsCount } = await supabase.from('medications').select('*', { count: 'exact', head: true }).eq('patient_id', id);
    console.log('medications count:', medsCount);
  }
}

check().catch(console.error);
