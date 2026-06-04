// lib/auth.ts — Clerk v6 auth helpers with auto-profile creation

import { auth } from "@clerk/nextjs/server";
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

function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return (key.startsWith("pk_live_") || key.startsWith("pk_test_")) && key.length > 30;
}

function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.length > 10 && !url.includes("placeholder");
}

// ─── Resolve or auto-create patient profile ───────────────────────────────────
// Called after Clerk auth succeeds. If no profile exists yet (user hasn't
// completed onboarding), creates a minimal one so API routes work immediately.

async function resolvePatientId(clerkUserId: string): Promise<string | null> {
  if (!isDatabaseConfigured()) {
    // No DB — return a stable fake UUID derived from the Clerk user ID
    // so all API routes in dev mode have a consistent patientId
    return "00000000-0000-0000-0000-000000000001";
  }

  try {
    const { db, patientProfiles } = await import("./db");
    const { eq } = await import("drizzle-orm");

    // Look up existing profile
    const rows = await db
      .select({ id: patientProfiles.id })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, clerkUserId))
      .limit(1);

    if (rows[0]) return rows[0].id;

    // No profile yet — auto-create a minimal one
    // This happens when user signs in but hasn't finished onboarding
    const [created] = await db
      .insert(patientProfiles)
      .values({
        userId:      clerkUserId,
        name:        "New Patient",
        dateOfBirth: "1990-01-01",
        conditions:  [],
      })
      .returning({ id: patientProfiles.id });

    return created?.id ?? null;
  } catch (err) {
    console.error("[auth] DB error resolving patient:", err);
    return null;
  }
}

// ─── getPatientAuth ───────────────────────────────────────────────────────────

export async function getPatientAuth(
  _request: NextRequest
): Promise<AuthContext | NextResponse> {

  // Dev mode without Clerk keys — bypass auth entirely
  if (!isClerkConfigured()) {
    const patientId = await resolvePatientId("dev_user_001");
    return {
      clerkUserId: "dev_user_001",
      patientId:   patientId ?? "00000000-0000-0000-0000-000000000001",
      role:        "patient",
    };
  }

  try {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const role = (session.sessionClaims?.metadata as { role?: string } | undefined)
      ?.role as UserRole | undefined;

    const patientId = await resolvePatientId(session.userId);
    if (!patientId) {
      return NextResponse.json(
        { error: "Could not resolve patient profile", code: "NO_PROFILE" },
        { status: 403 }
      );
    }

    return {
      clerkUserId: session.userId,
      patientId,
      role: role ?? "patient",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth error";
    console.error("[auth] getPatientAuth error:", msg);
    return NextResponse.json(
      { error: "Authentication failed", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }
}

// ─── getProviderAuth ──────────────────────────────────────────────────────────

export async function getProviderAuth(
  _request: NextRequest
): Promise<ProviderAuthContext | NextResponse> {

  if (!isClerkConfigured()) {
    return { clerkUserId: "dev_provider_001", role: "provider" };
  }

  try {
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const role = (session.sessionClaims?.metadata as { role?: string } | undefined)
      ?.role as UserRole | undefined;

    if (role !== "provider" && role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden — provider role required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    return { clerkUserId: session.userId, role };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth error";
    console.error("[auth] getProviderAuth error:", msg);
    return NextResponse.json(
      { error: "Authentication failed", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }
}
