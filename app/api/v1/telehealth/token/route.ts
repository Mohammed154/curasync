// app/api/v1/telehealth/token/route.ts
// Secure video room token issuance endpoint.
// Rejects token issuance with 403 Forbidden if no active doctor-patient connection exists.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getPatientAuth, getProviderAuth, isNextResponse } from "@/lib/auth";
import { verifyDoctorPatientConnection, generateVideoSessionToken, getDoctorPresence } from "@/lib/telehealth-auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const TokenRequestSchema = z.object({
  providerId: z.string().min(1).default("dev_provider_001"),
  roomName: z.string().min(1).optional(),
  consultationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const parsed = TokenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const { providerId, consultationId } = parsed.data;
  let roomName = parsed.data.roomName;

  // 1. Determine whether caller is Provider or Patient
  const url = new URL(request.url);
  const isProvider = url.searchParams.get("role") === "provider";

  if (isProvider) {
    const provAuth = await getProviderAuth(request);
    if (isNextResponse(provAuth)) return provAuth;

    if (!roomName) {
      roomName = `curasync-${nanoid(8).toLowerCase()}`;
    }

    const { token, expiresAt } = generateVideoSessionToken({
      userId: provAuth.userId,
      role: "provider",
      roomName,
      providerId: provAuth.userId,
      patientId: "patient_session",
      consultationId,
    });

    return NextResponse.json({
      authorized: true,
      token,
      expiresAt,
      roomName,
      roomUrl: `https://curasync.daily.co/${roomName}?t=${token}`,
      requestId,
    });
  }

  // 2. Patient Caller Flow
  const patAuth = await getPatientAuth(request);
  if (isNextResponse(patAuth)) return patAuth;

  // 3. MANDATORY SECURITY CHECK: Check active doctor-patient connection in DB
  const connection = await verifyDoctorPatientConnection(patAuth.patientId, providerId);

  if (!connection.connected || connection.status !== "active") {
    console.warn(`[telehealth/token] 403 Forbidden: Patient ${patAuth.patientId} has no active link with Provider ${providerId}`);
    return NextResponse.json(
      {
        error: "Forbidden: Video calls require an approved and active doctor-patient connection. Please connect with your healthcare practitioner before joining video consultations.",
        code: "DOCTOR_CONNECTION_REQUIRED",
        connected: false,
        status: connection.status,
        provider: connection.provider,
        requestId,
      },
      { status: 403 }
    );
  }

  // 4. Verify Doctor Presence & Availability
  const presence = await getDoctorPresence(providerId);

  // If a consultationId was provided, verify it belongs to this patient and provider
  if (consultationId) {
    const supabase = getSupabaseAdminClient();
    const { data: consult } = await supabase
      .from("consultations")
      .select("id, patient_id, provider_id, room_name, room_url, status")
      .eq("id", consultationId)
      .maybeSingle();

    if (consult) {
      if (consult.patient_id !== patAuth.patientId && consult.patient_id !== patAuth.userId) {
        return NextResponse.json(
          { error: "Forbidden: Consultation appointment does not belong to your account", code: "UNAUTHORIZED_CONSULTATION", requestId },
          { status: 403 }
        );
      }
      if (consult.room_name) roomName = consult.room_name;
    }
  }

  if (!roomName) {
    roomName = presence.activeRoomName || `curasync-${nanoid(8).toLowerCase()}`;
  }

  // 5. Generate cryptographically signed video room session token
  const { token, expiresAt } = generateVideoSessionToken({
    userId: patAuth.userId,
    role: "patient",
    roomName,
    providerId,
    patientId: patAuth.patientId,
    consultationId,
  });

  return NextResponse.json({
    authorized: true,
    connected: true,
    token,
    expiresAt,
    roomName,
    roomUrl: `https://curasync.daily.co/${roomName}?t=${token}`,
    provider: connection.provider,
    doctorPresence: presence,
    requestId,
    timestamp: new Date().toISOString(),
  });
}
