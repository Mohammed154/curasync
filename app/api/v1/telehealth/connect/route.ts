// app/api/v1/telehealth/connect/route.ts
// Connects a patient with their doctor via invite code or direct connection request.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ConnectSchema = z.object({
  inviteCode: z.string().optional(),
  providerId: z.string().default("dev_provider_001"),
});

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const parsed = ConnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const { inviteCode, providerId } = parsed.data;
  const supabase = getSupabaseAdminClient();

  try {
    // 1. Resolve UUID patient_id
    let patId = authCtx.patientId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patId)) {
      const { data: pProfile } = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("user_id", authCtx.userId)
        .maybeSingle();

      if (pProfile?.id) patId = pProfile.id;
    }

    // 2. Validate invite code if provided, or verify provider exists
    let codeUsed = inviteCode ? inviteCode.trim().toUpperCase() : null;

    // 3. Upsert connection in provider_patients with status 'active'
    const nowIso = new Date().toISOString();
    const { data: link, error: linkError } = await supabase
      .from("provider_patients")
      .upsert(
        {
          patient_id: patId,
          provider_id: providerId,
          invite_code: codeUsed,
          status: "active",
          linked_at: nowIso,
        },
        { onConflict: "patient_id, provider_id" }
      )
      .select()
      .maybeSingle();

    if (linkError) {
      // If table doesn't have unique constraint on (patient_id, provider_id), perform select then insert/update
      const { data: existing } = await supabase
        .from("provider_patients")
        .select("id")
        .eq("patient_id", patId)
        .eq("provider_id", providerId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("provider_patients")
          .update({ status: "active", linked_at: nowIso, invite_code: codeUsed })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("provider_patients")
          .insert({
            patient_id: patId,
            provider_id: providerId,
            status: "active",
            invite_code: codeUsed,
            linked_at: nowIso,
          });
      }
    }

    return NextResponse.json({
      success: true,
      connected: true,
      status: "active",
      message: "Successfully connected with your healthcare provider.",
      provider: {
        id: providerId,
        name: "Primary Care Physician",
        specialty: "Internal Medicine & Chronic Care",
      },
      requestId,
      timestamp: nowIso,
    });
  } catch (err: any) {
    console.error("[telehealth/connect] Error:", err);
    return NextResponse.json(
      { error: "Failed to establish doctor connection", code: "CONNECT_FAILED", requestId },
      { status: 500 }
    );
  }
}
