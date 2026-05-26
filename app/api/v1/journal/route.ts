// app/api/v1/journal/route.ts — Clerk auth + Supabase DB + Upstash rate limit

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc, gte } from "drizzle-orm";
import { db, journalEntries } from "@/lib/db";
import { getPatientAuth, isNextResponse } from "@/lib/auth";
import { checkRateLimit, journalLimiter } from "@/lib/ratelimit";
import { writeAuditLog, getRequestMeta } from "@/lib/audit";

const BiometricTypeEnum = z.enum(["diabetes_t2","hypertension","ckd","copd","chf","cad","hypothyroidism","ra","asthma","diabetes_t1"]);

const CreateSchema = z.object({
  text:         z.string().min(1).max(2000),
  severity:     z.number().int().min(1).max(10),
  conditionId:  BiometricTypeEnum,
  bodyLocation: z.string().max(100).optional(),
  contextTags:  z.array(z.string().max(50)).max(5).optional(),
  recordedAt:   z.string().datetime().optional(),
});

const EditSchema = z.object({
  entryId:      z.string().min(1),
  text:         z.string().min(1).max(2000).optional(),
  severity:     z.number().int().min(1).max(10).optional(),
  bodyLocation: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const rl = await checkRateLimit(journalLimiter, authCtx.patientId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Daily journal entry limit reached (5 per 24 hours)", code: "ENTRY_LIMIT_EXCEEDED", requestId }, { status: 429 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", details: parsed.error.flatten(), requestId }, { status: 400 });
  }

  const editableUntil = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2-day edit window
  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  const [inserted] = await db.insert(journalEntries).values({
    patientId:    patId,
    text:         parsed.data.text,
    severity:     parsed.data.severity,
    conditionId:  parsed.data.conditionId,
    bodyLocation: parsed.data.bodyLocation,
    contextTags:  parsed.data.contextTags,
    recordedAt:   parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date(),
    editableUntil,
  }).returning();

  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "WRITE", resource: "journal_entries", resourceId: inserted?.id, patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json(
    { data: inserted, meta: { entriesRemainingToday: rl.remaining }, requestId, timestamp: new Date().toISOString() },
    { status: 201, headers: { "X-RateLimit-Remaining": String(rl.remaining) } }
  );
}

export async function PATCH(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "INVALID_JSON", requestId }, { status: 400 });
  }

  const parsed = EditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", code: "INVALID_PAYLOAD", requestId }, { status: 400 });
  }

  const entryId = parsed.data.entryId as `${string}-${string}-${string}-${string}-${string}`;
  const patId   = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  // Fetch entry to check 2-day edit window
  const [existing] = await db.select().from(journalEntries).where(and(eq(journalEntries.id, entryId), eq(journalEntries.patientId, patId))).limit(1);
  if (!existing) return NextResponse.json({ error: "Entry not found", code: "NOT_FOUND", requestId }, { status: 404 });
  if (existing.editableUntil && new Date() > existing.editableUntil) {
    return NextResponse.json({ error: "Edit window expired (2 days)", code: "EDIT_WINDOW_EXPIRED", requestId }, { status: 403 });
  }

  const updates: Partial<typeof journalEntries.$inferInsert> = {};
  if (parsed.data.text)         updates.text         = parsed.data.text;
  if (parsed.data.severity)     updates.severity     = parsed.data.severity;
  if (parsed.data.bodyLocation) updates.bodyLocation = parsed.data.bodyLocation;

  const [updated] = await db.update(journalEntries).set(updates).where(eq(journalEntries.id, entryId)).returning();
  return NextResponse.json({ data: updated, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}

export async function GET(request: NextRequest) {
  const requestId = nanoid(12);
  const authCtx = await getPatientAuth(request);
  if (isNextResponse(authCtx)) return authCtx;

  const { searchParams } = new URL(request.url);
  const conditionId = searchParams.get("conditionId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

  const filters = [
    eq(journalEntries.patientId, patId),
    ...(conditionId ? [eq(journalEntries.conditionId, conditionId)] : []),
  ];

  const rows = await db.select().from(journalEntries).where(and(...filters)).orderBy(desc(journalEntries.recordedAt)).limit(limit);
  void writeAuditLog({ actorId: authCtx.clerkUserId, action: "READ", resource: "journal_entries", patientId: authCtx.patientId, ...getRequestMeta(request) });

  return NextResponse.json({ data: rows, meta: { total: rows.length, limit }, requestId, timestamp: new Date().toISOString() }, { status: 200 });
}
