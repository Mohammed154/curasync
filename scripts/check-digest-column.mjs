import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
  try {
    const rows = await sql`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
        AND column_name = 'weekly_digest_enabled';
    `;
    console.log("Column verification result:", rows);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
