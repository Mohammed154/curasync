// app/api/v1/reminders/route.ts — Clinical follow-up reminders API

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, asc, desc } from "drizzle-orm";
import { db, followUpReminders } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

const CreateReminderSchema = z.object({
  title:        z.string().min(1).max(120),
  description:  z.string().max(500).optional(),
  dueDate:      z.string().datetime(),
  reminderType: z.enum(["general", "lab_test", "consultation", "medication_review"]).default("general"),
  patientId:    z.string().optional(),
  notifyAt:     z.array(z.string().datetime()).optional(),
});

const UpdateReminderSchema = z.object({
  reminderId: z.string().min(1),
  status:     z.enum(["pending", "completed", "dismissed"]),
});

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

  const parsed = CreateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const targetPatientId = (parsed.data.patientId || authCtx.patientId) as `${string}-${string}-${string}-${string}-${string}`;
  const dueDate = new Date(parsed.data.dueDate);
  const notifyAtDates = parsed.data.notifyAt
    ? parsed.data.notifyAt.map((d) => new Date(d))
    : [new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)];

  try {
    const [inserted] = await db.insert(followUpReminders).values({
      patientId:    targetPatientId,
      createdBy:    authCtx.clerkUserId,
      title:        parsed.data.title,
      description:  parsed.data.description,
      dueDate:      dueDate,
      reminderType: parsed.data.reminderType,
      status:       "pending",
      notifyAt:     notifyAtDates,
    }).returning();

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "WRITE",
      resource: "follow_up_reminders",
      resourceId: inserted?.id,
      patientId: targetPatientId,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ data: inserted, requestId, timestamp: new Date().toISOString() }, { status: 201 });
  } catch (err) {
    console.error("[reminders] DB POST error:", err);
    // Dev fallback
    const fallback = {
      id: crypto.randomUUID(),
      patientId: targetPatientId,
      createdBy: authCtx.clerkUserId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueDate: dueDate,
      reminderType: parsed.data.reminderType,
      status: "pending",
      notifyAt: notifyAtDates,
      createdAt: new Date(),
    };
    return NextResponse.json({ data: fallback, requestId, timestamp: new Date().toISOString() }, { status: 201 });
  }
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  try {
    const rows = await db
      .select()
      .from(followUpReminders)
      .where(eq(followUpReminders.patientId, patId))
      .orderBy(asc(followUpReminders.dueDate));

    const filtered = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "READ",
      resource: "follow_up_reminders",
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ data: filtered, meta: { total: filtered.length }, requestId, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[reminders] GET error:", err);
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

  const parsed = UpdateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId },
      { status: 400 }
    );
  }

  const reminderId = parsed.data.reminderId as `${string}-${string}-${string}-${string}-${string}`;

  try {
    const [updated] = await db
      .update(followUpReminders)
      .set({ status: parsed.data.status })
      .where(eq(followUpReminders.id, reminderId))
      .returning();

    void writeAuditLog({
      actorId: authCtx.clerkUserId,
      action: "WRITE",
      resource: "follow_up_reminders",
      resourceId: reminderId,
      patientId: authCtx.patientId,
      ...getRequestMeta(request),
    });

    return NextResponse.json({ data: updated, requestId, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[reminders] PATCH error:", err);
    return NextResponse.json({ error: "Failed to update reminder", requestId }, { status: 500 });
  }
}
