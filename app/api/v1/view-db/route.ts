// app/api/v1/view-db/route.ts — Database inspection API endpoint
import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  let sql: postgres.Sql | undefined;
  try {
    sql = postgres(dbUrl, { ssl: "require", connect_timeout: 10 });
    const tables = ["patient_profiles", "medications", "readings", "journal_entries", "alert_events", "messages", "audit_log"];
    const results: Record<string, any> = {};

    for (const table of tables) {
      try {
        const countRes = await sql`SELECT COUNT(*)::int FROM ${sql(table)}`;
        const rows = await sql`SELECT * FROM ${sql(table)} ORDER BY 1 DESC LIMIT 5`;
        results[table] = {
          count: (countRes[0] as any)?.count ?? 0,
          sampleRows: rows,
        };
      } catch (err: any) {
        results[table] = { error: err.message };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tables: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Database query failed", message: error.message },
      { status: 500 }
    );
  } finally {
    if (sql) await sql.end();
  }
}
