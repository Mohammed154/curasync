// app/api/v1/onboarding/route.ts
// Creates or updates the patient profile in Supabase after onboarding.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { db, patientProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const ConditionIdEnum = z.enum([
  "diabetes_t2","diabetes_t1","hypertension","ckd","copd",
  "chf","cad","hypothyroidism","ra","asthma",
]);

const OnboardingSchema = z.object({
  name:        z.string().min(1).max(200),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  conditions:  z.array(ConditionIdEnum).min(1).max(5),
  emergencyContact: z.object({
    name:         z.string().min(1),
    phone:        z.string().min(1),
    relationship: z.string().min(1),
  }).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId }, { status: 400 });
  }

  const { name, dateOfBirth, conditions, emergencyContact } = parsed.data;

  let profile;
  let existing;
  try {
    existing = await db
      .select({ id: patientProfiles.id })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, authCtx.clerkUserId))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      // Update existing profile
      const [updated] = await db
        .update(patientProfiles)
        .set({
          name,
          dateOfBirth,
          conditions,
          emergencyContact: emergencyContact ?? null,
          updatedAt: new Date(),
        })
        .where(eq(patientProfiles.userId, authCtx.clerkUserId))
        .returning();
      profile = updated;
    } else {
      // Create new profile
      const [inserted] = await db
        .insert(patientProfiles)
        .values({
          userId:           authCtx.clerkUserId,
          name,
          dateOfBirth,
          conditions,
          emergencyContact: emergencyContact ?? null,
        })
        .returning();
      profile = inserted;
    }
  } catch (dbErr: any) {
    console.error("[onboarding] POST database error:", dbErr);
    return NextResponse.json(
      { error: "Database error during onboarding", code: "DATABASE_ERROR", details: dbErr.message, requestId },
      { status: 500 }
    );
  }

  void writeAuditLog({
    actorId:    authCtx.clerkUserId,
    action:     "WRITE",
    resource:   "patient_profiles",
    resourceId: profile?.id,
    patientId:  profile?.id,
    ...getRequestMeta(request),
  });

  return NextResponse.json(
    { data: profile, requestId, timestamp: new Date().toISOString() },
    { status: existing.length > 0 ? 200 : 201 }
  );
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let profile;
  try {
    const rows = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, authCtx.clerkUserId))
      .limit(1);
    profile = rows[0];
  } catch (dbErr: any) {
    console.error("[onboarding] GET database error:", dbErr);
    return NextResponse.json(
      { error: "Database error retrieving profile", code: "DATABASE_ERROR", details: dbErr.message, requestId },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json({ data: null, onboardingComplete: false, requestId, timestamp: new Date().toISOString() }, { status: 200 });
  }

  return NextResponse.json(
    { data: profile, onboardingComplete: true, requestId, timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
