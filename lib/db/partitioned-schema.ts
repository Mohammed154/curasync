// lib/db/partitioned-schema.ts
// TimescaleDB hypertables and partitioned tables.
// Kept separate from schema.ts so drizzle-kit push does not attempt to CREATE TABLE on existing partitioned tables (relkind = 'p').

import { pgTable, uuid, text, timestamp, numeric } from "drizzle-orm/pg-core";
import { patientProfiles } from "./schema";

export const readings = pgTable("readings", {
  id:         uuid("id").defaultRandom(),
  patientId:  uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  type:       text("type").notNull(),
  value:      numeric("value").notNull(),
  unit:       text("unit").notNull(),
  source:     text("source").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  notes:      text("notes"),
});

export type Reading    = typeof readings.$inferSelect;
export type NewReading = typeof readings.$inferInsert;
