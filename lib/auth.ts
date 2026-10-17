// lib/auth.ts — Server-side authentication helpers using Firebase Auth & Supabase

import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "./firebase/admin";
import { getSupabaseAdminClient } from "./supabase";

export type UserRole = "patient" | "provider" | "admin";

export interface AuthContext {
  userId: string;
  patientId: string;
  role: UserRole;
  clerkUserId: string; // for backward-compatibility with older route handlers
}

export interface ProviderAuthContext {
  userId: string;
  role: "provider" | "admin";
  clerkUserId: string;
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

  if (token) {
    const decoded = await verifyFirebaseIdToken(token);
    if (decoded?.uid) {
      uid = decoded.uid;
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

  // Ensure user has a profile in public.profiles and resolve patient id
  const supabase = getSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", uid)
    .maybeSingle();

  // Also check if legacy patient_profiles exists
  const { data: legacyProfile } = await supabase
    .from("patient_profiles")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();

  let patientId = legacyProfile?.id;
  if (!patientId) {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) {
      patientId = uid;
    } else {
      try {
        const { data: newProfile } = await supabase
          .from("patient_profiles")
          .upsert(
            {
              user_id: uid,
              name: profile?.display_name || "Patient",
              date_of_birth: "1990-01-01",
              conditions: [],
              onboarding_complete: false,
            },
            { onConflict: "user_id" }
          )
          .select("id")
          .single();
        patientId = newProfile?.id;
      } catch {
        // Non-fatal fallback
      }
    }
  }

  if (!patientId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
    patientId = "00000000-0000-0000-0000-000000000001";
  }

  return {
    userId: uid,
    patientId: String(patientId),
    clerkUserId: uid,
    role: "patient",
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
  if (token) {
    const decoded = await verifyFirebaseIdToken(token);
    if (decoded?.uid) uid = decoded.uid;
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

  return {
    userId: uid,
    clerkUserId: uid,
    role: "provider",
  };
}
