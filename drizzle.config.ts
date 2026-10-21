import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  tablesFilter: [
    "profiles",
    "vitals",
    "glucose_readings",
    "reports",
    "patient_profiles",
    "medications",
    "medication_logs",
    "alert_events",
    "journal_entries",
    "messages",
    "provider_patients",
    "invite_codes",
    "audit_log",
    "consultations",
    "follow_up_reminders",
  ],
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL || "",
  },
});
