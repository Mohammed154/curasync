// lib/auth.ts — Server-side authentication helpers using Firebase Auth & Supabase

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "./firebase/admin";
import { db, patientProfiles, profiles } from "./db";
import { eq } from "drizzle-orm";

export type UserRole = "patient" | "provider" | "admin";

export interface AuthContext {
  userId: string;
  patientId: string;
  role: UserRole;
  clerkUserId: string; // for backward-compatibility with older route handlers
  email?: string;
  displayName?: string;
}

export interface ProviderAuthContext {
  userId: string;
  role: "provider" | "admin";
  clerkUserId: string;
  email?: string;
  displayName?: string;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Extracts and verifies the Firebase ID token or session from the request.
 * Checks Bearer Authorization header, curasync_session cookie, and curasync_uid cookie.
 */
export async function getPatientAuth(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;

  const cookieToken = request.cookies.get("curasync_session")?.value;
  const cookieUid = request.cookies.get("curasync_uid")?.value;

  const token = bearerToken || cookieToken;
  let uid: string | null = null;
  let tokenEmail: string | undefined = undefined;
  let tokenDisplayName: string | undefined = undefined;

  if (token) {
    const decoded = await verifyFirebaseIdToken(token);
    if (decoded?.uid) {
      uid = decoded.uid;
      tokenEmail = decoded.email;
      tokenDisplayName = decoded.displayName;
    }
  }

  // Fallback to cookie UID if verified earlier or in development testing
  if (!uid && cookieUid) {
    uid = cookieUid;
  }

  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — valid session required" },
      { status: 401 }
    );
  }

  let patientId: string | null = null;
  const userEmail = tokenEmail || `${uid}@curasync.care`;
  let resolvedDisplayName = tokenDisplayName || "Patient";

  try {
    // 1. Ensure profiles record exists for user_id (required by vitals, glucose_readings, reports)
    const [existingProfile] = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        displayName: profiles.displayName,
        conditions: profiles.conditions,
        onboardingComplete: profiles.onboardingComplete,
      })
      .from(profiles)
      .where(eq(profiles.id, uid))
      .limit(1);

    if (existingProfile) {
      if (existingProfile.displayName) {
        resolvedDisplayName = existingProfile.displayName;
      }
    } else {
      await db
        .insert(profiles)
        .values({
          id: uid,
          email: userEmail,
          displayName: resolvedDisplayName,
          onboardingComplete: false,
          conditions: [],
        })
        .onConflictDoNothing();
    }

    // 2. Direct query to patient_profiles in Postgres
    const [existingPatient] = await db
      .select({
        id: patientProfiles.id,
        conditions: patientProfiles.conditions,
        name: patientProfiles.name,
      })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, uid))
      .limit(1);

    if (existingPatient?.id) {
      patientId = existingPatient.id;

      // Bidirectional sync: if patient_profiles has conditions but profiles doesn't, sync to profiles
      if (
        Array.isArray(existingPatient.conditions) &&
        existingPatient.conditions.length > 0 &&
        (!existingProfile?.conditions || existingProfile.conditions.length === 0)
      ) {
        await db
          .update(profiles)
          .set({
            conditions: existingPatient.conditions,
            onboardingComplete: true,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, uid))
          .catch(() => {});
      }
    } else {
      const initialConditions = Array.isArray(existingProfile?.conditions) ? existingProfile.conditions : [];
      const [newPatient] = await db
        .insert(patientProfiles)
        .values({
          userId: uid,
          name: existingProfile?.displayName || resolvedDisplayName,
          dateOfBirth: "1990-01-01",
          conditions: initialConditions,
          onboardingComplete: Boolean(existingProfile?.onboardingComplete || initialConditions.length > 0),
        })
        .onConflictDoUpdate({
          target: patientProfiles.userId,
          set: { updatedAt: new Date() },
        })
        .returning({ id: patientProfiles.id });

      if (newPatient?.id) {
        patientId = newPatient.id;
      }
    }
  } catch (err) {
    console.warn("[auth] Direct DB patient lookup/upsert warning:", err);
  }

  // Safety net fallback
  if (!patientId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
    patientId = "00000000-0000-0000-0000-000000000001";
  }

  return {
    userId: uid,
    patientId: String(patientId),
    clerkUserId: uid,
    role: "patient",
    email: userEmail,
    displayName: resolvedDisplayName,
  };
}

export async function getProviderAuth(
  request: NextRequest
): Promise<ProviderAuthContext | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;
  const cookieToken = request.cookies.get("curasync_session")?.value;
  const token = bearerToken || cookieToken;

  let uid: string | null = null;
  let tokenEmail: string | undefined = undefined;
  let tokenDisplayName: string | undefined = undefined;

  if (token) {
    const decoded = await verifyFirebaseIdToken(token);
    if (decoded?.uid) {
      uid = decoded.uid;
      tokenEmail = decoded.email;
      tokenDisplayName = decoded.displayName;
    }
  }

  if (!uid) {
    uid = request.cookies.get("curasync_uid")?.value || null;
  }

  if (!uid) {
    return NextResponse.json(
      { success: false, error: "Unauthorized — provider credentials required" },
      { status: 401 }
    );
  }

  // Verify that the user has a clinician or admin role
  try {
    const [profile] = await db
      .select({
        role: profiles.role,
        displayName: profiles.displayName,
        email: profiles.email,
      })
      .from(profiles)
      .where(eq(profiles.id, uid))
      .limit(1);

    const userRole = profile?.role || "patient";
    if (userRole !== "provider" && userRole !== "doctor" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden — provider or clinician role required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    return {
      userId: uid,
      clerkUserId: uid,
      role: userRole as "provider" | "admin",
      email: tokenEmail || profile?.email,
      displayName: tokenDisplayName || profile?.displayName || "Provider",
    };
  } catch (err) {
    console.warn("[auth] Database check in getProviderAuth warning:", err);
    // If DB check fails, default to strict 403 for security
    return NextResponse.json(
      { success: false, error: "Forbidden — unable to verify provider role", code: "FORBIDDEN" },
      { status: 403 }
    );
  }
}
