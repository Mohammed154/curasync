// app/api/auth/sync/route.ts
// Authenticates Firebase session, verifies Turnstile, captures geographic metadata, and upserts user record into Supabase public.profiles

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getSupabaseAdminClient } from "@/lib/supabase";

const locationSchema = z.object({
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  timestamp: z.number().nullable().optional(),
  source: z.string().optional(),
});

const syncSchema = z.object({
  idToken: z.string().min(10, "ID token is required").optional(),
  turnstileToken: z.string().optional(),
  location: locationSchema.optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => ({}));

    const validation = syncSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: validation.error.format(),
        },
        { status: 422 }
      );
    }

    const { idToken: bodyToken, turnstileToken, location } = validation.data;

    // 1. Verify Cloudflare Turnstile token if present
    if (turnstileToken) {
      const clientIp =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        undefined;

      const turnstileRes = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstileRes.success) {
        return NextResponse.json(
          { success: false, error: "Cloudflare Turnstile verification failed" },
          { status: 403 }
        );
      }
    }

    // 2. Identify token from body, Authorization header, or session cookie
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const cookieToken = request.cookies.get("curasync_session")?.value;
    const activeToken = bodyToken || bearerToken || cookieToken;

    if (!activeToken) {
      return NextResponse.json(
        { success: false, error: "Authentication token is required" },
        { status: 401 }
      );
    }

    // Verify Firebase ID Token via firebase-admin
    const decoded = await verifyFirebaseIdToken(activeToken);
    if (!decoded || !decoded.uid) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired Firebase ID token" },
        { status: 401 }
      );
    }

    const firebaseUid = decoded.uid;
    const userEmail = decoded.email || `${firebaseUid}@curasync.patient`;
    const displayName = decoded.displayName || "Patient";
    const photoUrl = decoded.photoURL || null;

    // 3. Extract and resolve User Location
    // Priority:
    //  a. Explicit client-side browser Geolocation API values (latitude, longitude, accuracy)
    //  b. Secondary passive fallback: Cloudflare headers (cf-iplatitude, cf-iplongitude, cf-ipcity, cf-region, cf-ipcountry)
    const clientLat = location?.latitude ?? validation.data.latitude ?? null;
    const clientLon = location?.longitude ?? validation.data.longitude ?? null;
    const clientCity = location?.city ?? validation.data.city ?? null;
    const clientRegion = location?.region ?? validation.data.region ?? null;
    const clientCountry = location?.country ?? validation.data.country ?? null;

    const cfLatHeader = request.headers.get("cf-iplatitude") || request.headers.get("x-vercel-ip-latitude");
    const cfLonHeader = request.headers.get("cf-iplongitude") || request.headers.get("x-vercel-ip-longitude");
    const cfCityHeader = request.headers.get("cf-ipcity") || request.headers.get("x-vercel-ip-city");
    const cfRegionHeader = request.headers.get("cf-region") || request.headers.get("x-vercel-ip-country-region");
    const cfCountryHeader = request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country");

    const parsedCfLat = cfLatHeader ? parseFloat(cfLatHeader) : null;
    const parsedCfLon = cfLonHeader ? parseFloat(cfLonHeader) : null;

    const resolvedLatitude = clientLat !== null && clientLat !== undefined ? clientLat : (!isNaN(parsedCfLat as number) ? parsedCfLat : null);
    const resolvedLongitude = clientLon !== null && clientLon !== undefined ? clientLon : (!isNaN(parsedCfLon as number) ? parsedCfLon : null);
    function safeDecode(val: string | null): string | null {
      if (!val) return null;
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }

    const resolvedCity = clientCity || safeDecode(cfCityHeader);
    const resolvedRegion = clientRegion || safeDecode(cfRegionHeader);
    const resolvedCountry = clientCountry || cfCountryHeader || null;

    const hasNewLocation =
      resolvedLatitude !== null ||
      resolvedLongitude !== null ||
      resolvedCity !== null ||
      resolvedRegion !== null ||
      resolvedCountry !== null;

    // 4. Upsert user record into Supabase public.profiles using service role client
    const supabase = getSupabaseAdminClient();

    // Check if profile already exists to preserve created_at and last_report_sent_at
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, created_at, last_report_sent_at, onboarding_complete, latitude, longitude, city, region, country, location_updated_at")
      .eq("id", firebaseUid)
      .maybeSingle();

    if (fetchError) {
      console.error("[auth:sync] Supabase lookup error:", fetchError.message);
    }

    const now = new Date().toISOString();
    const profilePayload: Record<string, any> = {
      id: firebaseUid,
      email: userEmail,
      display_name: displayName,
      photo_url: photoUrl,
      updated_at: now,
      created_at: existingProfile?.created_at || now,
      last_report_sent_at: existingProfile?.last_report_sent_at ?? null,
      onboarding_complete: existingProfile?.onboarding_complete ?? false,
      latitude: resolvedLatitude !== null ? resolvedLatitude : (existingProfile?.latitude ?? null),
      longitude: resolvedLongitude !== null ? resolvedLongitude : (existingProfile?.longitude ?? null),
      city: resolvedCity !== null ? resolvedCity : (existingProfile?.city ?? null),
      region: resolvedRegion !== null ? resolvedRegion : (existingProfile?.region ?? null),
      country: resolvedCountry !== null ? resolvedCountry : (existingProfile?.country ?? null),
      location_updated_at: hasNewLocation ? now : (existingProfile?.location_updated_at ?? null),
    };

    const { data: upsertedProfile, error: upsertError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })
      .select()
      .single();

    if (upsertError) {
      console.error("[auth:sync] Supabase upsert error:", upsertError.message, upsertError.details);
      if (existingProfile) {
        // Return existing profile if upsert failed due to permission/lock but profile exists
        return NextResponse.json({
          success: true,
          profile: existingProfile,
          user: {
            uid: firebaseUid,
            email: userEmail,
            displayName,
            photoURL: photoUrl,
          },
          warning: `Profile update warning: ${upsertError.message}`,
        });
      }
      return NextResponse.json(
        { success: false, error: `Database sync failed: ${upsertError.message}` },
        { status: 500 }
      );
    }

    // Also sync to legacy patient_profiles if needed for existing table relations
    try {
      await supabase
        .from("patient_profiles")
        .upsert(
          {
            user_id: firebaseUid,
            name: displayName,
            date_of_birth: "1990-01-01",
            conditions: [],
            onboarding_complete: existingProfile?.onboarding_complete ?? false,
          },
          { onConflict: "user_id" }
        );
    } catch {
      // Non-fatal legacy sync
    }

    // 5. Set session cookie for Next.js middleware and API routes
    const response = NextResponse.json({
      success: true,
      profile: upsertedProfile,
      user: {
        uid: firebaseUid,
        email: userEmail,
        displayName: displayName,
        photoURL: photoUrl,
      },
      location: {
        latitude: upsertedProfile.latitude,
        longitude: upsertedProfile.longitude,
        city: upsertedProfile.city,
        region: upsertedProfile.region,
        country: upsertedProfile.country,
        location_updated_at: upsertedProfile.location_updated_at,
        source: clientLat !== null ? "browser" : (cfLatHeader ? "cloudflare" : "existing"),
      },
    });

    response.cookies.set("curasync_session", activeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set("curasync_uid", firebaseUid, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("[auth:sync] Unhandled error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
