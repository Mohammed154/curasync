// lib/db/schema.ts
// Drizzle ORM schema — mirrors the Supabase SQL exactly.
// Run `npx drizzle-kit push` to sync with your Supabase project.

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  date,
  jsonb,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── patient_profiles ─────────────────────────────────────────────────────────

export const patientProfiles = pgTable("patient_profiles", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           text("user_id").notNull().unique(),       // Clerk user ID
  name:             text("name").notNull(),
  dateOfBirth:      date("date_of_birth").notNull(),
  conditions:       text("conditions").array().notNull().default(sql`'{}'`),
  emergencyContact: jsonb("emergency_contact"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── readings (TimescaleDB hypertable on recorded_at) ─────────────────────────

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

// ─── medications ──────────────────────────────────────────────────────────────

export const medications = pgTable("medications", {
  id:             uuid("id").primaryKey().defaultRandom(),
  patientId:      uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  name:           text("name").notNull(),
  dosage:         text("dosage").notNull(),
  frequency:      text("frequency").notNull(),
  conditionId:    text("condition_id").notNull(),
  scheduledTimes: text("scheduled_times").array().notNull(),
  startDate:      date("start_date").notNull(),
  endDate:        date("end_date"),
  active:         boolean("active").default(true),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── medication_logs ──────────────────────────────────────────────────────────

export const medicationLogs = pgTable("medication_logs", {
  id:            uuid("id").primaryKey().defaultRandom(),
  medicationId:  uuid("medication_id").notNull().references(() => medications.id, { onDelete: "cascade" }),
  patientId:     uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  status:        text("status").notNull(),
  scheduledAt:   timestamp("scheduled_at", { withTimezone: true }).notNull(),
  loggedAt:      timestamp("logged_at", { withTimezone: true }).defaultNow(),
  skippedReason: text("skipped_reason"),
});

// ─── alert_events ─────────────────────────────────────────────────────────────

export const alertEvents = pgTable("alert_events", {
  id:             uuid("id").primaryKey().defaultRandom(),
  patientId:      uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  severity:       text("severity").notNull(),
  status:         text("status").notNull().default("active"),
  type:           text("type").notNull(),
  message:        text("message").notNull(),
  value:          numeric("value"),
  threshold:      numeric("threshold"),
  triggeredAt:    timestamp("triggered_at", { withTimezone: true }).defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
});

// ─── journal_entries ──────────────────────────────────────────────────────────

export const journalEntries = pgTable("journal_entries", {
  id:            uuid("id").primaryKey().defaultRandom(),
  patientId:     uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  text:          text("text").notNull(),
  severity:      integer("severity").notNull(),
  conditionId:   text("condition_id").notNull(),
  bodyLocation:  text("body_location"),
  contextTags:   text("context_tags").array(),
  recordedAt:    timestamp("recorded_at", { withTimezone: true }).defaultNow(),
  editableUntil: timestamp("editable_until", { withTimezone: true }).notNull(),
});

// ─── messages ─────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id:          uuid("id").primaryKey().defaultRandom(),
  threadId:    uuid("thread_id").notNull(),
  senderId:    text("sender_id").notNull(),   // Clerk user ID
  recipientId: text("recipient_id").notNull(),
  senderRole:  text("sender_role").notNull(),
  content:     text("content").notNull(),     // encrypted in production
  sentAt:      timestamp("sent_at", { withTimezone: true }).defaultNow(),
  readAt:      timestamp("read_at", { withTimezone: true }),
});

// ─── provider_patients (linking table) ────────────────────────────────────────

export const providerPatients = pgTable("provider_patients", {
  id:          uuid("id").primaryKey().defaultRandom(),
  providerId:  text("provider_id").notNull(),  // Clerk user ID of provider
  patientId:   uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  linkedAt:    timestamp("linked_at", { withTimezone: true }).defaultNow(),
  inviteCode:  text("invite_code"),
  status:      text("status").notNull().default("active"), // active | revoked
});

// ─── invite_codes ─────────────────────────────────────────────────────────────

export const inviteCodes = pgTable("invite_codes", {
  id:         uuid("id").primaryKey().defaultRandom(),
  code:       text("code").notNull().unique(),
  providerId: text("provider_id").notNull(),
  patientId:  uuid("patient_id").references(() => patientProfiles.id),
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt:     timestamp("used_at", { withTimezone: true }),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── audit_log (HIPAA requirement) ────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id:         uuid("id").primaryKey().defaultRandom(),
  actorId:    text("actor_id").notNull(),   // Clerk user ID
  action:     text("action").notNull(),     // READ | WRITE | DELETE | EXPORT
  resource:   text("resource").notNull(),  // table name
  resourceId: text("resource_id"),
  patientId:  uuid("patient_id"),
  ipAddress:  text("ip_address"),
  userAgent:  text("user_agent"),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const patientRelations = relations(patientProfiles, ({ many }) => ({
  readings:       many(readings),
  medications:    many(medications),
  medicationLogs: many(medicationLogs),
  alertEvents:    many(alertEvents),
  journalEntries: many(journalEntries),
}));

export const medicationRelations = relations(medications, ({ one, many }) => ({
  patient: one(patientProfiles, { fields: [medications.patientId], references: [patientProfiles.id] }),
  logs:    many(medicationLogs),
}));

// ─── TypeScript types inferred from schema ────────────────────────────────────

export type PatientProfile   = typeof patientProfiles.$inferSelect;
export type NewPatientProfile = typeof patientProfiles.$inferInsert;
export type Reading          = typeof readings.$inferSelect;
export type NewReading       = typeof readings.$inferInsert;
export type Medication       = typeof medications.$inferSelect;
export type NewMedication    = typeof medications.$inferInsert;
export type MedicationLog    = typeof medicationLogs.$inferSelect;
export type NewMedicationLog = typeof medicationLogs.$inferInsert;
export type AlertEvent       = typeof alertEvents.$inferSelect;
export type NewAlertEvent    = typeof alertEvents.$inferInsert;
export type JournalEntry     = typeof journalEntries.$inferSelect;
export type NewJournalEntry  = typeof journalEntries.$inferInsert;
export type Message          = typeof messages.$inferSelect;
export type NewMessage       = typeof messages.$inferInsert;
export type AuditLog         = typeof auditLog.$inferSelect;
