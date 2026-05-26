// ─── CuraSync Core Domain Types ───────────────────────────────────────────
// Strict TypeScript — no `any` types. All models derived from PRD §3 & §5.

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "active" | "acknowledged" | "dismissed";
export type ConditionId =
  | "diabetes_t2"
  | "diabetes_t1"
  | "hypertension"
  | "ckd"
  | "copd"
  | "chf"
  | "cad"
  | "hypothyroidism"
  | "ra"
  | "asthma";

export type BiometricType =
  | "blood_glucose"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic"
  | "heart_rate"
  | "hrv"
  | "spo2"
  | "weight"
  | "hba1c"
  | "egfr"
  | "cholesterol_ldl"
  | "cholesterol_hdl"
  | "steps"
  | "sleep_hours"
  | "body_temp"
  | "peak_flow";

export type MedicationFrequency =
  | "once_daily"
  | "twice_daily"
  | "three_daily"
  | "every_x_hours"
  | "weekly"
  | "prn";

export type UserRole = "patient" | "provider" | "admin";

// ─── Patient & Profile ───────────────────────────────────────────────────────

export interface PatientProfile {
  id: string;
  userId: string;
  name: string;
  dateOfBirth: string; // ISO date
  conditions: ConditionId[];
  emergencyContact: EmergencyContact;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

// ─── Biometric Readings ──────────────────────────────────────────────────────

export interface BiometricReading {
  id: string;
  patientId: string;
  type: BiometricType;
  value: number;
  unit: string;
  source: "manual" | "apple_health" | "fitbit" | "garmin" | "ble";
  recordedAt: string; // ISO datetime
  notes?: string;
}

export interface BloodPressureReading {
  id: string;
  patientId: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  source: "manual" | "apple_health" | "fitbit" | "garmin" | "ble";
  recordedAt: string;
}

// ─── Medications ─────────────────────────────────────────────────────────────

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: MedicationFrequency;
  conditionId: ConditionId;
  prescribingProviderId?: string;
  startDate: string;
  endDate?: string;
  active: boolean;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  patientId: string;
  status: "taken" | "skipped" | "late";
  scheduledAt: string;
  loggedAt: string;
  skippedReason?: string;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  patientId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  type: BiometricType | "medication_missed" | "wearable_sync_failed";
  message: string;
  value?: number;
  threshold?: number;
  triggeredAt: string;
  acknowledgedAt?: string;
}

// ─── Provider / Dashboard ────────────────────────────────────────────────────

export interface ProviderPatientRow {
  patientId: string;
  name: string;
  age: number;
  conditions: ConditionId[];
  lastActivityDate: string;
  alertCount: number;
  adherenceScore: number; // 0-100
  alertStatus: "green" | "amber" | "red";
}

// ─── Dashboard mock data ──────────────────────────────────────────────────────

export interface DashboardData {
  patient: PatientProfile;
  latestReadings: LatestReadings;
  todayMedications: TodayMedication[];
  activeAlerts: Alert[];
  weeklyAdherence: number;
  streakDays: number;
  conditionSummaries: ConditionSummary[];
  recentReadings: SparklinePoint[];
}

export interface LatestReadings {
  bloodGlucose: number;
  systolic: number;
  diastolic: number;
  heartRate: number;
  spo2: number;
  weight: number;
  lastSyncedAt: string;
}

export interface TodayMedication {
  id: string;
  name: string;
  dosage: string;
  scheduledAt: string;
  status: "taken" | "pending" | "missed";
  conditionId: ConditionId;
}

export interface ConditionSummary {
  conditionId: ConditionId;
  label: string;
  metricLabel: string;
  metricValue: string;
  unit: string;
  trend: "up" | "down" | "stable";
  status: "green" | "amber" | "red";
  color: string;
  bgColor: string;
  iconEmoji: string;
}

export interface SparklinePoint {
  time: string;
  value: number;
}

// ─── API Request / Response schemas ──────────────────────────────────────────

export interface ReadingIngestionRequest {
  patientId: string;
  type: BiometricType;
  value: number;
  unit: string;
  source: BiometricReading["source"];
  recordedAt: string;
  notes?: string;
}

export interface ApiResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface ApiError {
  error: string;
  code: string;
  requestId: string;
}
