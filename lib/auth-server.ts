// lib/auth-server.ts
// Comprehensive server-side session & onboarding status inspector for Supabase & Firebase

import { cookies, headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

export interface ServerAuthResult {
  isAuthenticated: boolean;
  uid: string | null;
  email: string | null;
  role: string | null;
  onboardingCompleted: boolean;
  profile: Record<string, any> | null;
  patientProfile: Record<string, any> | null;
}

function extractTokenFromSupabaseCookie(val: string): string | null {
  try {
    let raw = val.trim();
    if (raw.startsWith("base64-")) {
      raw = Buffer.from(raw.slice(7), "base64").toString("utf-8");
    }
    if (raw.startsWith("{") || raw.startsWith("[")) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        return parsed[0];
      }
      if (parsed && typeof parsed.access_token === "string") {
        return parsed.access_token;
      }
      if (parsed && typeof parsed.currentSession?.access_token === "string") {
        return parsed.currentSession.access_token;
      }
    }
    return raw;
  } catch {
    return null;
  }
}

export async function checkServerAuth(cookieStoreParam?: any): Promise<ServerAuthResult> {
  let cookieStore: any;
  try {
    cookieStore = cookieStoreParam || (await cookies());
  } catch {
    // If called outside of request context
    return {
      isAuthenticated: false,
      uid: null,
      email: null,
      role: null,
      onboardingCompleted: false,
      profile: null,
      patientProfile: null,
    };
  }

  let uid: string | null = null;
  let email: string | null = null;

  // 1. Check Supabase Auth session via cookies
  try {
    const allCookies = cookieStore.getAll?.() || [];
    
    // Look for sb-*-auth-token or sb-access-token
    let supabaseAuthCookieValue: string | null = null;
    
    // Find chunked or single supabase cookie
    const sbAuthCookies = allCookies.filter((c: any) => 
      c.name.startsWith("sb-") && c.name.includes("-auth-token")
    );

    if (sbAuthCookies.length > 0) {
      // Sort if chunked: .0, .1, etc.
      sbAuthCookies.sort((a: any, b: any) => a.name.localeCompare(b.name));
      supabaseAuthCookieValue = sbAuthCookies.map((c: any) => c.value).join("");
    } else {
      const directSbCookie = cookieStore.get("sb-access-token")?.value || 
                             cookieStore.get("supabase-auth-token")?.value;
      if (directSbCookie) {
        supabaseAuthCookieValue = directSbCookie;
      }
    }

    if (supabaseAuthCookieValue) {
      const accessToken = extractTokenFromSupabaseCookie(supabaseAuthCookieValue);
      if (accessToken) {
        const supabase = getSupabaseAdminClient();
        const { data: sbUser, error: sbError } = await supabase.auth.getUser(accessToken);
        if (!sbError && sbUser?.user?.id) {
          uid = sbUser.user.id;
          email = sbUser.user.email || null;
        }
      }
    }
  } catch (err) {
    // Supabase cookie check failed non-fatally
  }

  // 2. Check Firebase session cookies if Supabase did not resolve UID
  if (!uid) {
    try {
      const sessionToken = cookieStore.get("curasync_session")?.value;
      const uidCookie = cookieStore.get("curasync_uid")?.value;

      if (sessionToken) {
        try {
          const decoded = await verifyFirebaseIdToken(sessionToken);
          if (decoded?.uid) {
            uid = decoded.uid;
            email = decoded.email || null;
          }
        } catch {
          // Token expired or invalid
        }
      }

      if (!uid && uidCookie) {
        uid = uidCookie;
      }
    } catch {
      // Firebase check failed non-fatally
    }
  }

  if (!uid) {
    return {
      isAuthenticated: false,
      uid: null,
      email: null,
      role: null,
      onboardingCompleted: false,
      profile: null,
      patientProfile: null,
    };
  }

  // 3. Inspect database records for onboarding status and profile details
  try {
    const supabase = getSupabaseAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    const { data: patientProfile } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    const profileConditions = Array.isArray(profile?.conditions) ? profile.conditions : [];
    const patientConditions = Array.isArray(patientProfile?.conditions) ? patientProfile.conditions : [];

    const isCompleted = Boolean(
      profile?.onboarding_completed === true ||
      profile?.onboarding_complete === true ||
      patientProfile?.onboarding_completed === true ||
      patientProfile?.onboarding_complete === true ||
      profileConditions.length > 0 ||
      patientConditions.length > 0
    );

    const role = profile?.role || (cookieStore.get("curasync_role")?.value ?? "patient");

    return {
      isAuthenticated: true,
      uid,
      email: email || profile?.email || null,
      role,
      onboardingCompleted: isCompleted,
      profile,
      patientProfile,
    };
  } catch (err) {
    console.error("[auth-server] Database inspection error:", err);
    return {
      isAuthenticated: true,
      uid,
      email,
      role: "patient",
      onboardingCompleted: false,
      profile: null,
      patientProfile: null,
    };
  }
}
