// app/api/v1/onboarding/route.ts
// Creates or updates patient profile, persists initial onboarding vitals and medications into Supabase

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { db, patientProfiles, vitals, readings, medications as medicationsTable, profiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { getSupabaseAdminClient } from "@/lib/supabase";

const ConditionIdEnum = z.enum([
  "diabetes_t2","diabetes_t1","hypertension","ckd","copd",
  "chf","cad","hypothyroidism","ra","asthma",
]);

const BaselinesSchema = z.record(
  z.string(),
  z.union([z.number(), z.string(), z.null()]).optional()
).optional();

const MedicationItemSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  conditionId: z.string().optional(),
});

const OnboardingSchema = z.object({
  name: z.string().max(200).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  conditions: z.array(z.string()).min(1).max(10).optional(),
  baselines: BaselinesSchema,
  medications: z.array(MedicationItemSchema).optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    relationship: z.string().min(1),
  }).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_JSON", requestId },
      { status: 400 }
    );
  }

  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const name = parsed.data.name || authCtx.displayName || "Patient";
  const dateOfBirth = parsed.data.dateOfBirth || "1990-01-01";
  const conditions = (parsed.data.conditions && parsed.data.conditions.length > 0)
    ? parsed.data.conditions
    : ["diabetes_t2"];
  const emergencyContact = parsed.data.emergencyContact;
  const baselines = parsed.data.baselines || {};
  const medicationsList = parsed.data.medications || [];

  let profileRecord: any = null;
  let patientUuid = authCtx.patientId;

  try {
    // 1. Ensure/Update patient_profiles record
    const existing = await db
      .select({ id: patientProfiles.id })
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, authCtx.userId))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      patientUuid = existing[0].id;
      const [updated] = await db
        .update(patientProfiles)
        .set({
          name,
          dateOfBirth,
          conditions,
          emergencyContact: emergencyContact ?? null,
          onboardingComplete: true,
          updatedAt: new Date(),
        })
        .where(eq(patientProfiles.userId, authCtx.userId))
        .returning();
      profileRecord = updated;
    } else {
      const [inserted] = await db
        .insert(patientProfiles)
        .values({
          userId: authCtx.userId,
          name,
          dateOfBirth,
          conditions,
          emergencyContact: emergencyContact ?? null,
          onboardingComplete: true,
        })
        .returning();
      profileRecord = inserted;
      if (inserted?.id) {
        patientUuid = inserted.id;
      }
    }

    // 2. Upsert into public.profiles
    const supabase = getSupabaseAdminClient();
    const userEmail = authCtx.email || `${authCtx.userId}@curasync.care`;
    const nowIso = new Date().toISOString();

    await supabase
      .from("profiles")
      .upsert(
        {
          id: authCtx.userId,
          email: userEmail,
          display_name: name,
          date_of_birth: dateOfBirth,
          conditions: conditions,
          emergency_contact: emergencyContact ?? null,
          onboarding_complete: true,
          updated_at: nowIso,
        },
        { onConflict: "id" }
      );

    // 3. Persist Initial Onboarding Baseline Vitals to database
    const recordedAtDate = new Date();
    const vitalDefinitions: Array<{
      inputKeys: string[];
      type: string;
      unit: string;
    }> = [
      { inputKeys: ["blood_glucose", "glucose"],              type: "blood_glucose",              unit: "mg/dL" },
      { inputKeys: ["systolic_bp", "systolic"],               type: "blood_pressure_systolic",   unit: "mmHg" },
      { inputKeys: ["diastolic_bp", "diastolic"],             type: "blood_pressure_diastolic",  unit: "mmHg" },
      { inputKeys: ["hba1c"],                                 type: "hba1c",                      unit: "%" },
      { inputKeys: ["heart_rate", "pulse"],                   type: "heart_rate",                 unit: "bpm" },
      { inputKeys: ["weight"],                                type: "weight",                     unit: "kg" },
      { inputKeys: ["height"],                                type: "height",                     unit: "cm" },
      { inputKeys: ["egfr"],                                  type: "egfr",                       unit: "mL/min" },
    ];

    for (const def of vitalDefinitions) {
      let rawVal: any = null;
      for (const k of def.inputKeys) {
        if (baselines[k] !== undefined && baselines[k] !== null && baselines[k] !== "") {
          rawVal = baselines[k];
          break;
        }
      }

      if (rawVal !== null && rawVal !== undefined) {
        const numVal = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal));
        if (!isNaN(numVal)) {
          try {
            // Insert into primary vitals table
            await db.insert(vitals).values({
              userId: authCtx.userId,
              type: def.type,
              value: String(numVal),
              unit: def.unit,
              source: "manual",
              recordedAt: recordedAtDate,
              notes: "Initial onboarding baseline reading",
            });

            // Insert into readings hypertable
            if (patientUuid) {
              await db.insert(readings).values({
                patientId: patientUuid as `${string}-${string}-${string}-${string}-${string}`,
                type: def.type as any,
                value: String(numVal),
                unit: def.unit,
                source: "manual" as any,
                recordedAt: recordedAtDate,
                notes: "Initial onboarding baseline reading",
              }).catch(() => {});
            }
          } catch (vitalErr) {
            console.warn(`[onboarding] Vital insertion error for ${def.type}:`, vitalErr);
          }
        }
      }
    }

    // 4. Persist Initial Medications to medications table
    if (patientUuid && medicationsList.length > 0) {
      const todayDateStr = recordedAtDate.toISOString().slice(0, 10);
      const fallbackCondition = (conditions && conditions.length > 0 && conditions[0]) ? conditions[0] : "diabetes_t2";
      for (const med of medicationsList) {
        if (med.name?.trim()) {
          try {
            const medCondition = med.conditionId || fallbackCondition;
            const medDosage = med.dosage?.trim() || "As prescribed";
            const medFrequency = med.frequency || "Once daily";
            await db.insert(medicationsTable).values({
              patientId: patientUuid as `${string}-${string}-${string}-${string}-${string}`,
              name: med.name.trim(),
              dosage: medDosage,
              frequency: medFrequency,
              conditionId: medCondition,
              scheduledTimes: ["08:00"],
              startDate: todayDateStr,
              active: true,
            });
          } catch (medErr) {
            console.warn(`[onboarding] Medication insertion error for ${med.name}:`, medErr);
          }
        }
      }
    }
  } catch (dbErr: any) {
    console.error("[onboarding] POST database error:", dbErr);
    return NextResponse.json(
      { error: "Database error during onboarding", code: "DATABASE_ERROR", details: dbErr.message, requestId },
      { status: 500 }
    );
  }

  void writeAuditLog({
    actorId: authCtx.userId,
    action: "WRITE",
    resource: "patient_profiles",
    resourceId: profileRecord?.id,
    patientId: profileRecord?.id,
    ...getRequestMeta(request),
  });

  return NextResponse.json(
    {
      success: true,
      data: profileRecord,
      message: "Onboarding health profile and baseline vitals saved successfully",
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export async function PATCH(request: NextRequest) {
  const requestId = nanoid(12);

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.has_seen_welcome !== undefined) {
      updatePayload.has_seen_welcome = Boolean(body.has_seen_welcome);
    }
    if (body.weekly_digest_enabled !== undefined) {
      updatePayload.weekly_digest_enabled = Boolean(body.weekly_digest_enabled);
    }
    if (body.onboarding_complete !== undefined) {
      updatePayload.onboarding_complete = Boolean(body.onboarding_complete);
    }
    if (Array.isArray(body.conditions)) {
      updatePayload.conditions = body.conditions;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", authCtx.userId)
      .select()
      .single();

    if (error) {
      console.warn("[onboarding:PATCH] Profile update warning:", error.message);
    }

    // Also keep patient_profiles in sync
    if (Array.isArray(body.conditions) || body.onboarding_complete !== undefined) {
      const patientUpdate: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (Array.isArray(body.conditions)) patientUpdate.conditions = body.conditions;
      if (body.onboarding_complete !== undefined) patientUpdate.onboarding_complete = Boolean(body.onboarding_complete);

      try {
        await supabase
          .from("patient_profiles")
          .update(patientUpdate)
          .eq("user_id", authCtx.userId);
      } catch (e) {
        console.warn("[onboarding:PATCH] patient_profiles update warning:", e);
      }
    }

    return NextResponse.json({
      success: true,
      profile: data || updatePayload,
      requestId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update profile", requestId },
      { status: 500 }
    );
  }
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
      .where(eq(patientProfiles.userId, authCtx.userId))
      .limit(1);
    profile = rows[0];
  } catch (dbErr: any) {
    console.error("[onboarding] GET database error:", dbErr);
    return NextResponse.json(
      { error: "Database error fetching profile", code: "DATABASE_ERROR", details: dbErr.message, requestId },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: profile, requestId, timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
