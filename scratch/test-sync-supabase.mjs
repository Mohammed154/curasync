import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qljcabrkkkcxyfmgiuey.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabaseAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function testSync() {
  const supabase = getSupabaseAdminClient();
  const testUid = "test_user_" + Date.now();
  
  console.log("Testing supabase query with admin client...");
  const { data: existing, error: fetchErr } = await supabase
    .from("profiles")
    .select("id, created_at, last_report_sent_at, onboarding_complete, latitude, longitude, city, region, country, location_updated_at")
    .eq("id", testUid)
    .maybeSingle();

  if (fetchErr) {
    console.error("fetch error:", fetchErr);
  } else {
    console.log("fetch success:", existing);
  }

  const now = new Date().toISOString();
  const payload = {
    id: testUid,
    email: "test@example.com",
    display_name: "Test User",
    photo_url: null,
    updated_at: now,
    created_at: now,
    last_report_sent_at: null,
    onboarding_complete: false,
    latitude: 12.34,
    longitude: 56.78,
    city: "Test City",
    region: "Test Region",
    country: "US",
    location_updated_at: now,
  };

  const { data: upserted, error: upsertErr } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (upsertErr) {
    console.error("Upsert error:", upsertErr);
  } else {
    console.log("Upsert SUCCESS:", upserted);
  }

  // clean up
  await supabase.from("profiles").delete().eq("id", testUid);
}

testSync().catch(console.error);
