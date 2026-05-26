// lib/audit.ts
// HIPAA-required audit logging for all PHI access.
// Every READ, WRITE, DELETE, EXPORT of patient data must be logged here.
// In production: writes to Supabase audit_log table asynchronously (fire-and-forget).
// Never throws — a logging failure must not break the actual request.

import { db, auditLog } from "./db";

export type AuditAction = "READ" | "WRITE" | "DELETE" | "EXPORT" | "LOGIN" | "LOGOUT";

interface AuditParams {
  actorId:    string;        // Clerk user ID
  action:     AuditAction;
  resource:   string;        // table name e.g. "readings"
  resourceId?: string;       // row ID if applicable
  patientId?: string;        // patient UUID
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId:    params.actorId,
      action:     params.action,
      resource:   params.resource,
      resourceId: params.resourceId,
      patientId:  params.patientId ? params.patientId as `${string}-${string}-${string}-${string}-${string}` : undefined,
      ipAddress:  params.ipAddress,
      userAgent:  params.userAgent,
    });
  } catch (err) {
    // Never throw — log failure must not break the request
    console.error("[audit] Failed to write audit log:", err);
  }
}

// ─── Helper — extract request metadata for audit context ─────────────────────

export function getRequestMeta(request: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  };
}
