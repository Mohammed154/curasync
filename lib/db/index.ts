// lib/db/index.ts — Drizzle + Supabase, safe for dev without DATABASE_URL

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: postgres.Sql | undefined;
}

function createClient(): postgres.Sql {
  const url = process.env.DATABASE_URL;

  if (!url || url.includes("placeholder")) {
    if (process.env.NODE_ENV === "production") {
      // Avoid failing the build if DATABASE_URL is missing only during Next.js build phase
      const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";
      if (isNextBuild) {
        console.warn("[db] DATABASE_URL is not set during production build. Returning fallback client.");
        return postgres("postgresql://localhost:5432/build_placeholder", {
          max: 0,
          connect_timeout: 1,
          idle_timeout: 1,
        });
      }
      throw new Error("DATABASE_URL is required in production.");
    }
    // Dev without DB — return a client that gives clear errors on query
    console.warn("[db] DATABASE_URL not set — DB queries will fail. Add it to .env.local");
    return postgres("postgresql://localhost:5432/dev_placeholder", {
      max: 0,
      connect_timeout: 1,
      idle_timeout: 1,
    });
  }

  return postgres(url, {
    max:             10,
    idle_timeout:    20,
    connect_timeout: 10,
    ssl:             "require",
    prepare:         false, // required for Supabase PgBouncer transaction mode
  });
}

const client: postgres.Sql =
  global._pgClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  global._pgClient = client;
}

export const db = drizzle(client, { schema });

export * from "./schema";
