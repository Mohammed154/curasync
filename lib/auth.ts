// lib/auth.ts — Auth helpers (Clerk removed, auto-bypass enabled)

import { NextRequest, NextResponse } from "next/server";

export type UserRole = "patient" | "provider" | "admin";

export interface AuthContext {
  clerkUserId: string;
  patientId:   string;
  role:        UserRole;
}

export interface ProviderAuthContext {
  clerkUserId: string;
  role:        "provider" | "admin";
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.length > 10 && !url.includes("placeholder");
}

// ─── Resolve or auto-create patient profile ───────────────────────────────────

async function resolvePatientId(userId: string): Promise<string | null> {
  if (!isDatabaseConfigured()) {
    return "00000000-0000-0000-0000-000000000001";
  }

  try {
    const { db, patientProfiles } = await import("./db");
    const { eq } = await import("drizzle-orm");

    // Look up existing profile
    const rows = await db
      .select({ id: patientProfiles.id })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (rows[0]) return rows[0].id;

    // No profile yet — auto-create a minimal one
    const [created] = await db
      .insert(patientProfiles)
      .values({
        userId:      userId,
        name:        "New Patient",
        dateOfBirth: "1990-01-01",
        conditions:  [],
      })
      .returning({ id: patientProfiles.id });

    return created?.id ?? null;
  } catch (err) {
    console.error("[auth] DB error resolving patient:", err);
    return "00000000-0000-0000-0000-000000000001";
  }
}

// ─── getPatientAuth ───────────────────────────────────────────────────────────

export async function getPatientAuth(
  _request: NextRequest
): Promise<AuthContext | NextResponse> {
  const userId = "dev_user_001";
  const patientId = await resolvePatientId(userId);
  return {
    clerkUserId: userId,
    patientId:   patientId ?? "00000000-0000-0000-0000-000000000001",
    role:        "patient",
  };
}

// ─── getProviderAuth ──────────────────────────────────────────────────────────

export async function getProviderAuth(
  _request: NextRequest
): Promise<ProviderAuthContext | NextResponse> {
  return { clerkUserId: "dev_provider_001", role: "provider" };
}
