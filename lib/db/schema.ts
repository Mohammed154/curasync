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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ─────────────────────────────────────────────────────────────────────

export const readingSourceEnum = pgEnum("reading_source", [
  "manual",
  "apple_health",
  "fitbit",
  "garmin",
  "ble",
]);

export const readingTypeEnum = pgEnum("reading_type", [
  "blood_glucose",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
  "heart_rate",
  "hrv",
  "spo2",
  "weight",
  "hba1c",
  "egfr",
  "cholesterol_ldl",
  "cholesterol_hdl",
  "steps",
  "sleep_hours",
  "body_temp",
  "peak_flow",
]);

export const userRoleEnum = pgEnum("user_role", [
  "patient",
  "provider",
  "admin",
]);

// ─── profiles (Firebase synced users) ─────────────────────────────────────────

export const profiles = pgTable("profiles", {
  id:                text("id").primaryKey(),                  // Firebase UID
  email:             text("email").notNull(),
  displayName:       text("display_name"),
  photoUrl:          text("photo_url"),
  createdAt:         timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastReportSentAt:  timestamp("last_report_sent_at", { withTimezone: true }),
  onboardingComplete: boolean("onboarding_complete").default(false),
  hasSeenWelcome:    boolean("has_seen_welcome").default(false),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true),
  role:              text("role").default("patient"),
  dateOfBirth:       date("date_of_birth"),
  conditions:        text("conditions").array().default(sql`'{}'`),
  emergencyContact:  jsonb("emergency_contact"),
  latitude:          numeric("latitude"),
  longitude:         numeric("longitude"),
  city:              text("city"),
  region:            text("region"),
  country:           text("country"),
  locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),
});

// ─── vitals ───────────────────────────────────────────────────────────────────

export const vitals = pgTable("vitals", {
  id:         uuid("id").primaryKey().defaultRandom(),
  userId:     text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  patientId:  text("patient_id"),
  type:       text("type").notNull(),
  value:      numeric("value").notNull(),
  unit:       text("unit").notNull(),
  source:     text("source").notNull().default("manual"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  notes:      text("notes"),
  createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── glucose_readings ─────────────────────────────────────────────────────────

export const glucoseReadings = pgTable("glucose_readings", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  value:       numeric("value").notNull(),
  unit:        text("unit").notNull().default("mg/dL"),
  mealContext: text("meal_context").default("fasting"),
  source:      text("source").notNull().default("manual"),
  notes:       text("notes"),
  recordedAt:  timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── reports ──────────────────────────────────────────────────────────────────

export const reports = pgTable("reports", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reportType:     text("report_type").notNull().default("monthly_summary"),
  dateRangeStart: timestamp("date_range_start", { withTimezone: true }).notNull(),
  dateRangeEnd:   timestamp("date_range_end", { withTimezone: true }).notNull(),
  status:         text("status").notNull().default("completed"),
  recipientEmail: text("recipient_email"),
  fileUrl:        text("file_url"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── patient_profiles (legacy) ─────────────────────────────────────────────────

export const patientProfiles = pgTable("patient_profiles", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           text("user_id").notNull().unique("patient_profiles_user_id_key"),       // User ID
  name:             text("name").notNull(),
  dateOfBirth:      date("date_of_birth").notNull(),
  gender:           text("gender"),
  phone:            text("phone"),
  conditions:       text("conditions").array().notNull().default(sql`'{}'`),
  emergencyContact: jsonb("emergency_contact"),
  baselineValues:   jsonb("baseline_values"),
  preferredUnits:   jsonb("preferred_units"),
  language:         text("language").default("en"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow(),
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
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  medicationId:   uuid("medication_id").references(() => medications.id, { onDelete: "cascade" }),
  patientId:      uuid("patient_id").references(() => patientProfiles.id, { onDelete: "cascade" }),
  medicationName: text("medication_name"),
  dosage:         text("dosage"),
  frequency:      text("frequency"),
  status:         text("status").notNull().default("taken"),
  scheduledDate:  date("scheduled_date").default(sql`CURRENT_DATE`),
  scheduledAt:    timestamp("scheduled_at", { withTimezone: true }).notNull(),
  takenAt:        timestamp("taken_at", { withTimezone: true }),
  loggedAt:       timestamp("logged_at", { withTimezone: true }).defaultNow(),
  skippedReason:  text("skipped_reason"),
  notes:          text("notes"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── alert_events ─────────────────────────────────────────────────────────────

export const alertEvents = pgTable("alert_events", {
  id:             uuid("id").primaryKey().defaultRandom(),
  patientId:      uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  readingId:      uuid("reading_id"),
  severity:       text("severity").notNull(),
  status:         text("status").notNull().default("active"),
  type:           text("type").notNull(),
  message:        text("message").notNull(),
  value:          numeric("value"),
  threshold:      numeric("threshold"),
  triggeredAt:    timestamp("triggered_at", { withTimezone: true }).defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: uuid("acknowledged_by"),
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
  symptoms:      text("symptoms").array().default(sql`'{}'`),
  notes:         text("notes"),
  mood:          text("mood"),
  loggedAt:      timestamp("logged_at", { withTimezone: true }).defaultNow(),
  recordedAt:    timestamp("recorded_at", { withTimezone: true }).defaultNow(),
  editableUntil: timestamp("editable_until", { withTimezone: true }).notNull(),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow(),
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
  code:       text("code").notNull().unique("invite_codes_code_key"),
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

// ─── consultations (Telehealth Video Rooms) ──────────────────────────────────

export const consultations = pgTable("consultations", {
  id:           uuid("id").primaryKey().defaultRandom(),
  patientId:    uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  providerId:   text("provider_id").notNull(),
  scheduledAt:  timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMin:  integer("duration_min").notNull().default(20),
  status:       text("status").notNull().default("scheduled"), // scheduled | in_progress | completed | cancelled | no_show
  roomUrl:      text("room_url"),
  roomName:     text("room_name"),
  notes:        text("notes"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── follow_up_reminders (Calendar Follow-ups & Alerts) ──────────────────────

export const followUpReminders = pgTable("follow_up_reminders", {
  id:                    uuid("id").primaryKey().defaultRandom(),
  patientId:             uuid("patient_id").notNull().references(() => patientProfiles.id, { onDelete: "cascade" }),
  createdBy:             text("created_by").notNull(),
  title:                 text("title").notNull(),
  description:           text("description"),
  dueDate:               timestamp("due_date", { withTimezone: true }).notNull(),
  reminderType:          text("reminder_type").notNull().default("general"), // general | lab_test | consultation | medication_review
  relatedConsultationId: uuid("related_consultation_id").references(() => consultations.id, { onDelete: "set null" }),
  status:                text("status").notNull().default("pending"), // pending | completed | dismissed
  notifyAt:              timestamp("notify_at", { withTimezone: true }).array(),
  createdAt:             timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const patientRelations = relations(patientProfiles, ({ many }) => ({
  medications:       many(medications),
  medicationLogs:    many(medicationLogs),
  alertEvents:       many(alertEvents),
  journalEntries:    many(journalEntries),
  consultations:     many(consultations),
  followUpReminders: many(followUpReminders),
}));

export const medicationRelations = relations(medications, ({ one, many }) => ({
  patient: one(patientProfiles, { fields: [medications.patientId], references: [patientProfiles.id] }),
  logs:    many(medicationLogs),
}));

export const consultationRelations = relations(consultations, ({ one, many }) => ({
  patient:   one(patientProfiles, { fields: [consultations.patientId], references: [patientProfiles.id] }),
  reminders: many(followUpReminders),
}));

export const reminderRelations = relations(followUpReminders, ({ one }) => ({
  patient:      one(patientProfiles, { fields: [followUpReminders.patientId], references: [patientProfiles.id] }),
  consultation: one(consultations, { fields: [followUpReminders.relatedConsultationId], references: [consultations.id] }),
}));

// ─── TypeScript types inferred from schema ────────────────────────────────────

export type Profile             = typeof profiles.$inferSelect;
export type NewProfile          = typeof profiles.$inferInsert;
export type Vital               = typeof vitals.$inferSelect;
export type NewVital            = typeof vitals.$inferInsert;
export type GlucoseReading      = typeof glucoseReadings.$inferSelect;
export type NewGlucoseReading   = typeof glucoseReadings.$inferInsert;
export type Report              = typeof reports.$inferSelect;
export type NewReport           = typeof reports.$inferInsert;
export type PatientProfile      = typeof patientProfiles.$inferSelect;
export type NewPatientProfile    = typeof patientProfiles.$inferInsert;
export type Medication          = typeof medications.$inferSelect;
export type NewMedication       = typeof medications.$inferInsert;
export type MedicationLog       = typeof medicationLogs.$inferSelect;
export type NewMedicationLog    = typeof medicationLogs.$inferInsert;
export type AlertEvent          = typeof alertEvents.$inferSelect;
export type NewAlertEvent       = typeof alertEvents.$inferInsert;
export type JournalEntry        = typeof journalEntries.$inferSelect;
export type NewJournalEntry     = typeof journalEntries.$inferInsert;
export type Message             = typeof messages.$inferSelect;
export type NewMessage          = typeof messages.$inferInsert;
export type Consultation        = typeof consultations.$inferSelect;
export type NewConsultation     = typeof consultations.$inferInsert;
export type FollowUpReminder    = typeof followUpReminders.$inferSelect;
export type NewFollowUpReminder = typeof followUpReminders.$inferInsert;
export type AuditLog            = typeof auditLog.$inferSelect;


