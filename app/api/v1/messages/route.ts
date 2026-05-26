// app/api/v1/messages/route.ts — Clerk auth + Supabase DB

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc, or } from "drizzle-orm";
import { db, messages } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const MessageSchema = z.object({
  threadId:    z.string().uuid(),
  recipientId: z.string().min(1),
  content:     z.string().min(1).max(5000),
  senderRole:  z.enum(["patient", "provider"]),
});

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId }, { status: 400 });
  }

  const [inserted] = await db.insert(messages).values({
    threadId:    parsed.data.threadId as `${string}-${string}-${string}-${string}-${string}`,
    senderId:    authCtx.clerkUserId,
    recipientId: parsed.data.recipientId,
    senderRole:  parsed.data.senderRole,
    content:     parsed.data.content, // encrypt here in production
  }).returning();

  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "WRITE", resource: "messages", resourceId: inserted?.id, patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json({ data: inserted, requestId, timestamp: new Date().toISOString() }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");

  const rows = await db.select().from(messages)
    .where(threadId
      ? eq(messages.threadId, threadId as `${string}-${string}-${string}-${string}-${string}`)
      : or(eq(messages.senderId, authCtx.clerkUserId), eq(messages.recipientId, authCtx.clerkUserId))
    )
    .orderBy(desc(messages.sentAt))
    .limit(100);

  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "READ", resource: "messages", patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json({ data: rows, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const body = await request.json() as { messageId: string };
  if (!body.messageId) return NextResponse.json({ error: "messageId required", code: "MISSING_PARAM", requestId }, { status: 400 });

  await db.update(messages).set({ readAt: new Date() })
    .where(and(
      eq(messages.id, body.messageId as `${string}-${string}-${string}-${string}-${string}`),
      eq(messages.recipientId, authCtx.clerkUserId)
    ));

  return NextResponse.json({ data: { messageId: body.messageId, readAt: new Date().toISOString() }, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}
