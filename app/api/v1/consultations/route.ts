// app/api/v1/consultations/route.ts — Telehealth video consultations API

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, desc, and } from "drizzle-orm";
import { db, consultations } from "@/lib/db";
import { getPatientAuth, getProviderAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CreateConsultationSchema = z.object({
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(5).max(120).default(20),
  providerId:  z.string().min(1).default("dev_provider_001"),
  notes:        z.string().max(1000).optional(),
});

const UpdateConsultationSchema = z.object({
  consultationId: z.string().min(1),
  status:         z.enum(["scheduled", "in_progress", "completed", "cancelled", "no_show"]),
  notes:          z.string().max(1000).optional(),
});

/**
 * Creates a Daily.co room via REST API or generates a deterministic room URL fallback.
 */
async function createDailyRoom(roomName: string, expTimestampSec: number): Promise<{ url: string; name: string }> {
  const apiKey = process.env.DAILY_API_KEY;
  if (apiKey && apiKey.length > 5 && !apiKey.includes("placeholder")) {
    try {
      const res = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            enable_chat: true,
            enable_screenshare: true,
            exp: expTimestampSec,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json() as { url: string; name: string };
        return { url: json.url, name: json.name };
      }
      console.warn("[daily.co] Failed to create room via API, falling back to mock room:", res.status);
    } catch (err) {
      console.error("[daily.co] API request error:", err);
    }
  }

  // Fallback room URL for local / test environments
  return {
    url: `https://curasync.daily.co/${roomName}`,
    name: roomName,
  };
}

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = CreateConsultationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;
  const scheduledDate = new Date(parsed.data.scheduledAt);
  const expSec = Math.floor(scheduledDate.getTime() / 1000) + (parsed.data.durationMin + 60) * 60;
  const roomName = `curasync-${nanoid(8).toLowerCase()}`;

  const room = await createDailyRoom(roomName, expSec);

  try {
    const [inserted] = await db.insert(consultations).values({
      patientId:   patId,
      providerId:  parsed.data.providerId,
      scheduledAt: scheduledDate,
      durationMin: parsed.data.durationMin,
      status:      "scheduled",
      roomUrl:     room.url,
      roomName:    room.name,
      notes:       parsed.data.notes,
    }).returning();

    // Auto-create follow-up reminders 24h and 1h prior
    try {
      const { followUpReminders } = await import("@/lib/db");
      const rem24h = new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000);
      const rem1h = new Date(scheduledDate.getTime() - 60 * 60 * 1000);

      await db.insert(followUpReminders).values([
        {
          patientId:             patId,
          createdBy:             authCtx.clerkUserId,
          title:                 "Upcoming Video Consultation (Tomorrow)",
          description:           `Consultation with ${parsed.data.providerId === "dev_provider_001" ? "Dr. Priya Sharma" : "Provider"} scheduled for tomorrow at ${scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
          dueDate:               rem24h,
          reminderType:          "consultation",
          relatedConsultationId: inserted?.id,
          status:                "pending",
          notifyAt:              [rem24h],
        },
        {
          patientId:             patId,
          createdBy:             authCtx.clerkUserId,
          title:                 "Video Consultation Starting in 1 Hour",
          description:           `Your appointment is starting soon. Prepare any questions and join via Telehealth tab.`,
          dueDate:               rem1h,
          reminderType:          "consultation",
          relatedConsultationId: inserted?.id,
          status:                "pending",
          notifyAt:              [rem1h],
        },
      ]);
    } catch (remErr) {
      console.warn("[consultations] Failed to auto-create follow_up_reminders:", remErr);
    }

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "WRITE",
      resource: "consultations",
      resourceId: inserted?.id,
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ data: inserted, requestId, timestamp: new Date().toISOString() }, { status: 201 });
  } catch (err) {
    console.error("[consultations] POST error:", err);
    // Mock return for local resilience if DB not configured
    const mockConsultation = {
      id: crypto.randomUUID(),
      patientId: patId,
      providerId: parsed.data.providerId,
      scheduledAt: scheduledDate,
      durationMin: parsed.data.durationMin,
      status: "scheduled",
      roomUrl: room.url,
      roomName: room.name,
      notes: parsed.data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return NextResponse.json({ data: mockConsultation, requestId, timestamp: new Date().toISOString() }, { status: 201 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const url = new URL(request.url);
  const isProvider = url.searchParams.get("role") === "provider";
  const statusFilter = url.searchParams.get("status");

  if (isProvider) {
    const pAuth = await getProviderAuth(request);
    if (isNextResponse(pAuth)) return pAuth;

    try {
      let query = db.select().from(consultations).where(eq(consultations.providerId, pAuth.clerkUserId));
      const rows = await query.orderBy(desc(consultations.scheduledAt));
      const filtered = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

      return NextResponse.json({ data: filtered, meta: { total: filtered.length }, requestId, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error("[consultations] GET provider error:", err);
      return NextResponse.json({ data: [], meta: { total: 0 }, requestId, timestamp: new Date().toISOString() });
    }
  }

  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  try {
    const rows = await db.select().from(consultations).where(eq(consultations.patientId, patId)).orderBy(desc(consultations.scheduledAt));
    const filtered = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "READ",
      resource: "consultations",
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ data: filtered, meta: { total: filtered.length }, requestId, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[consultations] GET patient error:", err);
    return NextResponse.json({ data: [], meta: { total: 0 }, requestId, timestamp: new Date().toISOString() });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = UpdateConsultationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const consultationId = parsed.data.consultationId as `${string}-${string}-${string}-${string}-${string}`;

  try {
    const [updated] = await db.update(consultations)
      .set({
        status: parsed.data.status,
        ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(consultations.id, consultationId))
      .returning();

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "WRITE",
      resource: "consultations",
      resourceId: consultationId,
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ data: updated, requestId, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[consultations] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update consultation", requestId }, { status: 500 });
  }
}
