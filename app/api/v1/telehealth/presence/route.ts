// app/api/v1/telehealth/presence/route.ts
// Provider presence heartbeat & real-time availability check.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getProviderAuth, isNextResponse } from "@/lib/auth";
import { recordDoctorPresence, getDoctorPresence } from "@/lib/telehealth-auth";

export const dynamic = "force-dynamic";

const PresencePostSchema = z.object({
  providerId: z.string().optional(),
  status: z.enum(["available", "in_call", "busy", "offline"]).default("available"),
});

export async function POST(request: NextRequest) {
  const pAuth = await getProviderAuth(request);
  if (isNextResponse(pAuth)) return pAuth;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const parsed = PresencePostSchema.safeParse(body);
  const providerId = parsed.success && parsed.data.providerId ? parsed.data.providerId : pAuth.userId;
  const status = parsed.success ? parsed.data.status : "available";

  if (status !== "offline") {
    recordDoctorPresence(providerId, status);
    // Also record for default provider if running in dev environment
    if (providerId !== "dev_provider_001") {
      recordDoctorPresence("dev_provider_001", status);
    }
  }

  return NextResponse.json({
    success: true,
    providerId,
    status,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const providerId = url.searchParams.get("providerId") || "dev_provider_001";
  const presence = await getDoctorPresence(providerId);

  return NextResponse.json({
    providerId,
    ...presence,
    timestamp: new Date().toISOString(),
  });
}
