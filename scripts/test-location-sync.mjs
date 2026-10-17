import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const sql = postgres(dbUrl, { ssl: "require" });

async function testLocationSync() {
  console.log("🧪 Testing location metadata update on Supabase public.profiles...");

  const testUid = "test_user_geolocation_qa";
  const now = new Date().toISOString();

  // Test 1: Direct upsert simulating user consenting to browser geolocation
  const testLatitude = 37.7749;
  const testLongitude = -122.4194;
  const testCity = "San Francisco";
  const testRegion = "California";
  const testCountry = "United States";

  await sql`
    INSERT INTO public.profiles (
      id, email, display_name, latitude, longitude, city, region, country, location_updated_at, created_at, updated_at
    ) VALUES (
      ${testUid}, 'qa@curasync.care', 'QA Tester', ${testLatitude}, ${testLongitude}, ${testCity}, ${testRegion}, ${testCountry}, ${now}, ${now}, ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      city = EXCLUDED.city,
      region = EXCLUDED.region,
      country = EXCLUDED.country,
      location_updated_at = EXCLUDED.location_updated_at,
      updated_at = EXCLUDED.updated_at;
  `;

  // Read back to verify
  const [profile] = await sql`
    SELECT id, email, display_name, latitude, longitude, city, region, country, location_updated_at
    FROM public.profiles
    WHERE id = ${testUid};
  `;

  console.log("✅ Verified Profile in Supabase:");
  console.log(profile);

  if (
    Number(profile.latitude) === testLatitude &&
    Number(profile.longitude) === testLongitude &&
    profile.city === testCity
  ) {
    console.log("🎯 SUCCESS: Location fields populate accurately in Supabase!");
  } else {
    throw new Error("Mismatch in stored location fields");
  }

  // Cleanup test user
  await sql`DELETE FROM public.profiles WHERE id = ${testUid}`;
  console.log("🧹 Cleaned up QA test record.");

  await sql.end();
}

testLocationSync().catch((e) => {
  console.error("❌ Test failed:", e);
  process.exit(1);
});
