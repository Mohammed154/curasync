import { NextResponse } from "next/server";
import postgres from "postgres";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
  }

  let sql: postgres.Sql | undefined;

  try {
    sql = postgres(url, { connect_timeout: 15, idle_timeout: 5 });
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    const tables = tablesResult.map((t: any) => t.table_name);

    let readingsColumns = null;
    if (tables.includes("readings")) {
      const colsResult = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'readings'
      `;
      readingsColumns = colsResult;
    }

    let patientProfilesColumns = null;
    if (tables.includes("patient_profiles")) {
      const colsResult = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'patient_profiles'
      `;
      patientProfilesColumns = colsResult;
    }

    console.log("[health] DB Connectivity check details:", {
      tables,
      readingsColumns,
      patientProfilesColumns,
    });

    return NextResponse.json({
      status: "connected",
      databaseHost: url.split("@")[1]?.split(":")[0] ?? "unknown",
    });
  } catch (error: any) {
    console.error("[health] DB Connectivity check failed:", error);
    return NextResponse.json({
      status: "error",
      message: "Database connection failed",
    }, { status: 500 });
  } finally {
    if (sql) {
      try {
        await sql.end({ timeout: 5 });
      } catch (endErr) {
        console.error("[health] Error closing database connection:", endErr);
      }
    }
  }
}
