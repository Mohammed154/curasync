"use client";
// hooks/useApi.ts
// Typed SWR hooks for every CuraSync API route.
// These replace getMockDashboardData() in page components.
// Falls back to mock data when API returns an error (dev convenience).

import useSWR, { mutate } from "swr";
import type {
  Alert,
  BiometricType,
  TodayMedication,
  ConditionSummary,
  SparklinePoint,
  ProviderPatientRow,
} from "@/types";

// ─── Generic fetcher ──────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  const json = await res.json() as { data: T };
  return json.data;
}

// ─── Readings ─────────────────────────────────────────────────────────────────

interface Reading {
  id: string;
  type: string;
  value: string;
  unit: string;
  recordedAt: string;
  source: string;
}

export function useReadings(type?: BiometricType, limit = 100) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  params.set("limit", String(limit));

  return useSWR<Reading[]>(
    `/api/v1/readings?${params}`,
    fetcher,
    { refreshInterval: 8000, revalidateOnFocus: true }
  );
}

export async function postReading(payload: {
  type: BiometricType;
  value: number;
  unit: string;
  source: "manual" | "apple_health" | "fitbit" | "garmin" | "ble";
  recordedAt: string;
  notes?: string;
}) {
  const res = await fetch("/api/v1/readings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { data: Reading & { alerts: Alert[] } };
  // Revalidate all reading queries
  await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/readings"));
  return { success: res.ok, alertCount: data.data?.alerts?.length ?? 0 };
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export function useAlerts(status?: string) {
  const params = status ? `?status=${status}` : "";
  return useSWR<Alert[]>(
    `/api/v1/alerts${params}`,
    fetcher,
    { refreshInterval: 15000 }
  );
}

export async function patchAlert(alertId: string, action: "acknowledge" | "dismiss") {
  const res = await fetch("/api/v1/alerts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ alertId, action }),
  });
  await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/alerts"));
  return res.ok;
}

// ─── Medications ──────────────────────────────────────────────────────────────

interface MedicationRow {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  conditionId: string;
  scheduledTimes: string[];
  active: boolean;
}

export function useMedications() {
  return useSWR<MedicationRow[]>("/api/v1/medications", fetcher);
}

export async function logDose(payload: {
  medicationId: string;
  status: "taken" | "skipped" | "late";
  scheduledAt: string;
  skippedReason?: string;
}) {
  const res = await fetch("/api/v1/medications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  await mutate("/api/v1/medications");
  return res.ok;
}

// ─── Journal ──────────────────────────────────────────────────────────────────

interface JournalEntryRow {
  id: string;
  text: string;
  severity: number;
  conditionId: string;
  bodyLocation: string | null;
  contextTags: string[] | null;
  recordedAt: string;
  editableUntil: string;
}

export function useJournalEntries(conditionId?: string) {
  const params = conditionId ? `?conditionId=${conditionId}` : "";
  return useSWR<JournalEntryRow[]>(`/api/v1/journal${params}`, fetcher);
}

export async function createJournalEntry(payload: {
  text: string;
  severity: number;
  conditionId: string;
  bodyLocation?: string;
  contextTags?: string[];
}) {
  const res = await fetch("/api/v1/journal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const remaining = parseInt(res.headers.get("X-RateLimit-Remaining") ?? "0");
  await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/journal"));
  return { success: res.ok, remaining };
}

export async function editJournalEntry(entryId: string, payload: {
  text?: string;
  severity?: number;
  bodyLocation?: string;
}) {
  const res = await fetch("/api/v1/journal", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ entryId, ...payload }),
  });
  await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/journal"));
  return res.ok;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

interface MessageRow {
  id: string;
  senderId: string;
  recipientId: string;
  senderRole: string;
  content: string;
  sentAt: string;
  readAt: string | null;
}

export function useMessages(threadId?: string) {
  const params = threadId ? `?threadId=${threadId}` : "";
  return useSWR<MessageRow[]>(`/api/v1/messages${params}`, fetcher, { refreshInterval: 10000 });
}

export async function sendMessage(payload: {
  threadId: string;
  recipientId: string;
  content: string;
  senderRole: "patient" | "provider";
}) {
  const res = await fetch("/api/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  await mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/v1/messages"));
  return res.ok;
}

export async function markMessageRead(messageId: string) {
  await fetch("/api/v1/messages", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messageId }),
  });
}

// ─── Provider patient panel ───────────────────────────────────────────────────

export function usePatientPanel(params?: {
  sortBy?: string;
  order?: string;
  alertStatus?: string;
}) {
  const search = new URLSearchParams();
  if (params?.sortBy)      search.set("sortBy", params.sortBy);
  if (params?.order)       search.set("order", params.order);
  if (params?.alertStatus) search.set("alertStatus", params.alertStatus);

  return useSWR<ProviderPatientRow[]>(
    `/api/v1/patients?${search}`,
    fetcher,
    { refreshInterval: 30000 }
  );
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export async function requestPdfExport(rangeStart?: string, rangeEnd?: string) {
  const params = new URLSearchParams();
  if (rangeStart) params.set("rangeStart", rangeStart);
  if (rangeEnd)   params.set("rangeEnd", rangeEnd);

  const res = await fetch(`/api/v1/export?${params}`, {
    credentials: "include",
  });

  if (res.status === 429) return { success: false, error: "Daily download limit reached (5/day)" };
  if (!res.ok) return { success: false, error: "Export failed" };

  const data = await res.json() as { data: { pdfUrl: string | null; reportId: string }; downloadsRemaining: number };

  if (data.data.pdfUrl) {
    // Open pre-signed S3 URL directly (production Lambda flow)
    window.open(data.data.pdfUrl, "_blank");
  } else {
    // Fallback: open /pdf-preview for client-side printing
    window.open(`/pdf-preview?reportId=${data.data.reportId}`, "_blank");
    window.setTimeout(() => window.print(), 1000);
  }

  return { success: true, downloadsRemaining: data.downloadsRemaining };
}

// ─── OCR lab report ───────────────────────────────────────────────────────────

export async function uploadLabReport(imageBase64: string, mimeType: string) {
  const res = await fetch("/api/v1/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ imageBase64, mimeType }),
  });
  if (!res.ok) return { success: false, readings: [] };
  const data = await res.json() as { data: { readings: Array<{ type: BiometricType; value: number; unit: string }> } };
  return { success: true, readings: data.data.readings };
}

// ─── Onboarding profile ───────────────────────────────────────────────────────

export function useOnboardingProfile() {
  return useSWR<{ id: string; conditions: string[] } | null>(
    "/api/v1/onboarding",
    fetcher
  );
}

export async function saveOnboardingProfile(payload: {
  name: string;
  dateOfBirth: string;
  conditions: string[];
  emergencyContact?: { name: string; phone: string; relationship: string };
}) {
  const res = await fetch("/api/v1/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return res.ok;
}
