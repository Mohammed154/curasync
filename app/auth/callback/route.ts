// app/auth/callback/route.ts
// Supabase & OAuth authentication callback handler with onboarding status inspection

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const returnTo = searchParams.get("returnTo") || searchParams.get("redirect") || searchParams.get("next");

  // Query parameter hygiene: never use /onboarding as stale fallback
  const sanitizedReturnTo = returnTo && returnTo !== "/onboarding" ? returnTo : null;

  let uid: string | null = null;

  // 1. If OAuth code is provided, exchange for Supabase session
  if (code) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data } = await supabase.auth.exchangeCodeForSession(code);
      if (data?.user?.id) {
        uid = data.user.id;
      }
    } catch (err) {
      console.warn("[auth/callback] Code exchange notice:", err);
    }
  }

  // 2. Inspect session cookies
  if (!uid) {
    try {
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get("curasync_session")?.value;
      const uidCookie = cookieStore.get("curasync_uid")?.value;

      if (sessionToken) {
        const decoded = await verifyFirebaseIdToken(sessionToken);
        if (decoded?.uid) {
          uid = decoded.uid;
        }
      }
      if (!uid && uidCookie) {
        uid = uidCookie;
      }
    } catch (err) {
      console.warn("[auth/callback] Session cookie inspection notice:", err);
    }
  }

  if (!uid) {
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
  }

  // 3. Query authenticated user's record from profiles in Supabase
  try {
    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, onboarding_complete, conditions, role")
      .eq("id", uid)
      .maybeSingle();

    if (profile?.role === "provider" || profile?.role === "doctor" || profile?.role === "admin") {
      return NextResponse.redirect(new URL(sanitizedReturnTo || "/provider/dashboard", origin));
    }

    const hasCompletedOnboarding = Boolean(
      profile?.onboarding_complete ||
      (Array.isArray(profile?.conditions) && profile.conditions.length > 0)
    );

    // If onboarding_completed === true: Immediately route them to /dashboard.
    // Returning patients must never be redirected to /onboarding.
    if (hasCompletedOnboarding) {
      return NextResponse.redirect(new URL(sanitizedReturnTo || "/dashboard", origin));
    }

    // If onboarding_completed === false (incomplete/abandoned setup): Route them to /onboarding
    return NextResponse.redirect(new URL("/onboarding", origin));
  } catch (err) {
    console.error("[auth/callback] Profile lookup error:", err);
    // Safe fallback for returning patient
    return NextResponse.redirect(new URL(sanitizedReturnTo || "/dashboard", origin));
  }
}
