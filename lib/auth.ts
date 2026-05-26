// lib/auth.ts — Clerk v6 auth helpers
// Gracefully handles dev mode (no real Clerk keys) by returning mock context

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

// Check if Clerk is properly configured with real credentials
function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return (key.startsWith("pk_live_") || key.startsWith("pk_test_")) && key.length > 30;
}

// ─── Mock context for dev mode ────────────────────────────────────────────────
// Used when Clerk is not configured — allows all API routes to work locally
const DEV_AUTH_CONTEXT: AuthContext = {
  clerkUserId: "dev_user_001",
  patientId:   "00000000-0000-0000-0000-000000000001",
  role:        "patient",
};

const DEV_PROVIDER_CONTEXT: ProviderAuthContext = {
  clerkUserId: "dev_provider_001",
  role:        "provider",
};

// ─── getPatientAuth ───────────────────────────────────────────────────────────

export async function getPatientAuth(
  _request: NextRequest
): Promise<AuthContext | NextResponse> {
  // Dev mode — no real Clerk keys
  if (!isClerkConfigured()) {
    return DEV_AUTH_CONTEXT;
  }

  try {
    const session = await auth();
    const userId = session.userId;
    const sessionClaims = session.sessionClaims;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const role = (sessionClaims?.metadata as { role?: string } | undefined)
      ?.role as UserRole | undefined;

    // Lazy import db to avoid crashing when DATABASE_URL is not set
    const { db, patientProfiles } = await import("./db");
    const { eq } = await import("drizzle-orm");

    const rows = await db
      .select({ id: patientProfiles.id })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (!rows.length || !rows[0]) {
      return NextResponse.json(
        { error: "Patient profile not found — complete onboarding first", code: "NO_PROFILE" },
        { status: 403 }
      );
    }

    return {
      clerkUserId: userId,
      patientId:   rows[0].id,
      role:        role ?? "patient",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth error";
    console.error("[auth] getPatientAuth error:", message);
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
    return DEV_PROVIDER_CONTEXT;
  }

  try {
    const session = await auth();
    const userId = session.userId;
    const sessionClaims = session.sessionClaims;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "NOT_AUTHENTICATED" },
        { status: 401 }
      );
    }

    const role = (sessionClaims?.metadata as { role?: string } | undefined)
      ?.role as UserRole | undefined;

    if (role !== "provider" && role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden — provider role required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    return { clerkUserId: userId, role };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth error";
    console.error("[auth] getProviderAuth error:", message);
    return NextResponse.json(
      { error: "Authentication failed", code: "AUTH_ERROR" },
      { status: 401 }
    );
  }
}
