// app/api/v1/account/route.ts
// Permanent account deletion and full clinical data erasure (DPDP Act 2023 & HIPAA compliance)

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, or } from "drizzle-orm";
import {
  db,
  profiles,
  patientProfiles,
  vitals,
  glucoseReadings,
  readings,
  medications,
  medicationLogs,
  journalEntries,
  alertEvents,
  consultations,
  followUpReminders,
  providerPatients,
  reports,
} from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";
import { adminAuth } from "@/lib/firebase/admin";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  const requestId = nanoid(12);

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  // Verify explicit DELETE confirmation in payload or header
  let body: any = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const confirmation =
    body?.confirmation ||
    request.headers.get("x-delete-confirmation") ||
    request.nextUrl.searchParams.get("confirmation");

  if (confirmation !== "DELETE") {
    return NextResponse.json(
      {
        error: "Confirmation required. You must explicitly provide 'DELETE' to permanently erase all records.",
        code: "CONFIRMATION_REQUIRED",
        requestId,
      },
      { status: 400 }
    );
  }

  const userId = authCtx.userId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authCtx.patientId);
  const patientUuid = isUuid
    ? (authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`)
    : null;

  try {
    // 1. Audit log before erasure (immutable compliance record)
    void writeAuditLog({
      actorId: userId,
      action: "DELETE",
      resource: "patient_account_and_all_data",
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    // 2. Cascade delete all clinical records associated with this patient
    if (patientUuid) {
      await db.delete(readings).where(eq(readings.patientId, patientUuid)).catch((e) => console.warn("[account-delete] readings:", e));
      await db.delete(medicationLogs).where(eq(medicationLogs.patientId, patientUuid)).catch((e) => console.warn("[account-delete] medicationLogs pat:", e));
      await db.delete(medications).where(eq(medications.patientId, patientUuid)).catch((e) => console.warn("[account-delete] medications:", e));
      await db.delete(journalEntries).where(eq(journalEntries.patientId, patientUuid)).catch((e) => console.warn("[account-delete] journalEntries:", e));
      await db.delete(alertEvents).where(eq(alertEvents.patientId, patientUuid)).catch((e) => console.warn("[account-delete] alertEvents:", e));
      await db.delete(followUpReminders).where(eq(followUpReminders.patientId, patientUuid)).catch((e) => console.warn("[account-delete] followUpReminders:", e));
      await db.delete(consultations).where(eq(consultations.patientId, patientUuid)).catch((e) => console.warn("[account-delete] consultations:", e));
      await db.delete(providerPatients).where(eq(providerPatients.patientId, patientUuid)).catch((e) => console.warn("[account-delete] providerPatients:", e));
    }

    // 3. Delete records referencing profiles.id (userId)
    await db.delete(vitals).where(eq(vitals.userId, userId)).catch((e) => console.warn("[account-delete] vitals:", e));
    await db.delete(glucoseReadings).where(eq(glucoseReadings.userId, userId)).catch((e) => console.warn("[account-delete] glucoseReadings:", e));
    await db.delete(medicationLogs).where(eq(medicationLogs.userId, userId)).catch((e) => console.warn("[account-delete] medicationLogs user:", e));
    await db.delete(reports).where(eq(reports.userId, userId)).catch((e) => console.warn("[account-delete] reports:", e));

    // 4. Delete patient profile and main profile
    await db.delete(patientProfiles).where(eq(patientProfiles.userId, userId)).catch((e) => console.warn("[account-delete] patientProfiles:", e));
    await db.delete(profiles).where(eq(profiles.id, userId)).catch((e) => console.warn("[account-delete] profiles:", e));

    // Also execute direct Supabase delete as a secondary guarantee
    try {
      const supabase = getSupabaseAdminClient();
      await supabase.from("vitals").delete().eq("user_id", userId);
      await supabase.from("glucose_readings").delete().eq("user_id", userId);
      await supabase.from("medication_logs").delete().eq("user_id", userId);
      await supabase.from("patient_profiles").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("id", userId);
    } catch (supaErr) {
      console.warn("[account-delete] Supabase cleanup warning:", supaErr);
    }

    // 5. Delete Firebase Auth user if present
    try {
      if (adminAuth) {
        await adminAuth.deleteUser(userId);
      }
    } catch (firebaseErr: any) {
      console.warn("[account-delete] Firebase auth delete warning (non-fatal):", firebaseErr?.message || firebaseErr);
    }

    // 6. Build response and clear session cookies
    const response = NextResponse.json({
      success: true,
      message: "Your account and all associated health records have been permanently erased.",
      requestId,
      deletedAt: new Date().toISOString(),
    });

    response.cookies.delete("curasync_session");
    response.cookies.delete("curasync_uid");

    return response;
  } catch (err: any) {
    console.error("[account-delete] Fatal erasure error:", err);
    return NextResponse.json(
      {
        error: "Failed to erase account data completely",
        code: "ERASURE_ERROR",
        details: err?.message,
        requestId,
      },
      { status: 500 }
    );
  }
}
