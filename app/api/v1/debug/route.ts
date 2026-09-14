// app/api/v1/debug/route.ts — Diagnostic API endpoint for Vercel deployment
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "";

  // 1. Check env vars
  const envCheck = {
    DATABASE_URL_SET:     dbUrl.length > 0,
    DATABASE_URL_PORT:    dbUrl.match(/:(\d+)\//)?.[1] ?? "not found",
    DATABASE_URL_HOST:    dbUrl.match(/@([^:\/]+)/)?.[1] ?? "not found",
    DATABASE_URL_HAS_SSL: dbUrl.includes("sslmode=require"),
    IS_POOLER_URL:        dbUrl.includes("pooler.supabase.com") || dbUrl.includes(":6543"),
    IS_DIRECT_URL:        dbUrl.includes(":5432"),
    UPSTASH_SET:          !!process.env.UPSTASH_REDIS_REST_URL,
    NODE_ENV:             process.env.NODE_ENV,
    REGION:               process.env.VERCEL_REGION ?? "unknown",
  };

  // 2. Test DB connection
  let dbTest: Record<string, unknown> = { tested: false };
  if (dbUrl.length > 0) {
    try {
      const postgres = (await import("postgres")).default;
      const sql = postgres(dbUrl, { max: 1, connect_timeout: 5, ssl: "require", prepare: false });
      const result = await sql`SELECT current_database() as db, current_user as usr, version() as ver`;
      await sql.end();
      dbTest = {
        connected:    true,
        database:     result[0]?.db,
        user:         result[0]?.usr,
        pg_version:   result[0]?.ver?.split(" ")[0],
      };
    } catch (err) {
      const e = err as { message?: string; code?: string };
      dbTest = {
        connected:    false,
        error:        e.message,
        code:         e.code,
        diagnosis:
          e.code === "08006" ? "❌ Connection refused — wrong host or port"
          : e.code === "28P01" ? "❌ Wrong password in DATABASE_URL"
          : e.code === "28000" ? "❌ Auth failed — check credentials"
          : e.code === "3D000" ? "❌ Database does not exist"
          : e.message?.includes("SSL") ? "❌ SSL error — add ?sslmode=require to DATABASE_URL"
          : e.message?.includes("timeout") ? "❌ Connection timeout — wrong host or firewall"
          : "❌ Unknown — see error code above",
      };
    }
  }

  // 3. Test if tables exist
  let tablesTest: Record<string, unknown> = { tested: false };
  if ((dbTest as { connected?: boolean }).connected) {
    try {
      const postgres = (await import("postgres")).default;
      const sql = postgres(dbUrl, { max: 1, connect_timeout: 5, ssl: "require", prepare: false });
      const tables = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      await sql.end();
      const tableNames = tables.map((t: any) => String(t.table_name));
      const required   = ["patient_profiles","readings","medications","alert_events","journal_entries","messages","audit_log"];
      const missing    = required.filter(t => !tableNames.includes(t));
      tablesTest = {
        found:   tableNames,
        missing,
        status:  missing.length === 0 ? "✅ All tables exist" : `❌ Missing tables: ${missing.join(", ")} — run schema-setup.sql then npx drizzle-kit push`,
      };
    } catch (err) {
      tablesTest = { tested: true, error: (err as Error).message };
    }
  }

  // 4. Test patient_profiles insert
  let insertTest: Record<string, unknown> = { tested: false };
  if ((tablesTest as { missing?: string[] }).missing?.length === 0) {
    try {
      const postgres = (await import("postgres")).default;
      const sql = postgres(dbUrl, { max: 1, connect_timeout: 5, ssl: "require", prepare: false });
      await sql`
        INSERT INTO patient_profiles (user_id, name, date_of_birth, conditions)
        VALUES ('debug_test_user', 'Debug Test', '1990-01-01', '{}'::condition_id[])
        ON CONFLICT (user_id) DO NOTHING
      `;
      await sql`DELETE FROM patient_profiles WHERE user_id = 'debug_test_user'`;
      await sql.end();
      insertTest = { success: true, status: "✅ Insert and delete worked — DB write permissions OK" };
    } catch (err) {
      const e = err as { message?: string; code?: string };
      insertTest = {
        success:   false,
        error:     e.message,
        code:      e.code,
        diagnosis: e.code === "42501" ? "❌ RLS blocking insert — use service role key or disable RLS for API routes"
                 : e.code === "23505" ? "⚠️  Duplicate key — insert worked (conflict on unique constraint)"
                 : `❌ Insert failed with code ${e.code}`,
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    summary: {
      step1_env:     envCheck.DATABASE_URL_SET && envCheck.IS_POOLER_URL ? "✅ Env OK" : "❌ Fix DATABASE_URL",
      step2_connect: (dbTest as { connected?: boolean }).connected ? "✅ Connected" : "❌ Cannot connect",
      step3_tables:  (tablesTest as { missing?: string[] }).missing?.length === 0 ? "✅ Tables exist" : "❌ Tables missing",
      step4_insert:  (insertTest as { success?: boolean }).success ? "✅ Writes work" : "❌ Write blocked",
    },
    details: { envCheck, dbTest, tablesTest, insertTest },
  }, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
