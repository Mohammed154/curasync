import postgres from 'postgres';
const url = "postgresql://postgres:Mohdisdevgod@db.lyptbybvrwbleqwxclph.supabase.co:5432/postgres";
const sql = postgres(url);
try {
  const patientProfiles = await sql`SELECT * FROM patient_profiles LIMIT 10`;
  console.log("Patient Profiles:", patientProfiles);
} catch (err) {
  console.error("Error fetching patient profiles:", err);
} finally {
  await sql.end();
}
