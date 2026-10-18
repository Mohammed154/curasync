// lib/telehealth-auth.ts — Telehealth connection verification, presence, & room token auth
import crypto from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase";

export interface ProviderInfo {
  id: string;
  name: string;
  specialty: string;
  avatarUrl?: string;
}

export interface ConnectionValidationResult {
  connected: boolean;
  status: "active" | "pending" | "not_connected" | "revoked";
  provider?: ProviderInfo;
  linkId?: string;
  message?: string;
}

export interface DoctorPresenceState {
  online: boolean;
  status: "available" | "in_call" | "busy" | "offline";
  lastSeen: string | null;
  activeRoomName?: string;
}

// In-memory presence registry (with 90-second TTL fallback for platform presence)
const presenceRegistry = new Map<string, { timestamp: number; status: "available" | "in_call" | "busy" }>();

const DEFAULT_DOCTOR: ProviderInfo = {
  id: "dev_provider_001",
  name: "Primary Care Physician",
  specialty: "Internal Medicine & Chronic Care",
};

const SECRET_SIGNING_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DAILY_API_KEY || "curasync-telehealth-secret-key-2026";

/**
 * Checks whether a patient and doctor share an active, accepted connection in the database.
 */
export async function verifyDoctorPatientConnection(
  patientId: string,
  providerId: string = "dev_provider_001"
): Promise<ConnectionValidationResult> {
  const supabase = getSupabaseAdminClient();

  try {
    // 1. Resolve UUID patient_id if given user_id
    let resolvedPatientId = patientId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
      const { data: patProfile } = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("user_id", patientId)
        .maybeSingle();

      if (patProfile?.id) {
        resolvedPatientId = patProfile.id;
      }
    }

    // 2. Query provider_patients linking table
    const { data: link, error } = await supabase
      .from("provider_patients")
      .select("id, provider_id, patient_id, status, linked_at")
      .eq("patient_id", resolvedPatientId)
      .eq("provider_id", providerId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[telehealth-auth] Connection lookup error:", error);
    }

    // Resolve provider name / info
    const { data: provProfile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", providerId)
      .maybeSingle();

    const provider: ProviderInfo = {
      id: providerId,
      name: provProfile?.display_name || DEFAULT_DOCTOR.name,
      specialty: DEFAULT_DOCTOR.specialty,
    };

    if (link && link.status === "active") {
      return {
        connected: true,
        status: "active",
        provider,
        linkId: link.id,
      };
    }

    if (link && link.status === "pending") {
      return {
        connected: false,
        status: "pending",
        provider,
        linkId: link.id,
        message: "Connection request is pending provider approval.",
      };
    }

    return {
      connected: false,
      status: "not_connected",
      provider,
      message: "No verified doctor-patient connection exists.",
    };
  } catch (err) {
    console.error("[telehealth-auth] Unexpected error during connection verification:", err);
    return {
      connected: false,
      status: "not_connected",
      message: "Unable to verify medical connection at this time.",
    };
  }
}

/**
 * Returns all active provider connections for a patient.
 */
export async function getPatientActiveConnections(patientId: string): Promise<ConnectionValidationResult[]> {
  const supabase = getSupabaseAdminClient();

  try {
    let resolvedPatientId = patientId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
      const { data: patProfile } = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("user_id", patientId)
        .maybeSingle();

      if (patProfile?.id) {
        resolvedPatientId = patProfile.id;
      }
    }

    const { data: links } = await supabase
      .from("provider_patients")
      .select("id, provider_id, patient_id, status, linked_at")
      .eq("patient_id", resolvedPatientId);

    if (!links || links.length === 0) return [];

    return links.map((l) => ({
      connected: l.status === "active",
      status: l.status as "active" | "pending" | "revoked",
      linkId: l.id,
      provider: {
        id: l.provider_id,
        name: l.provider_id === "dev_provider_001" ? DEFAULT_DOCTOR.name : "Healthcare Provider",
        specialty: DEFAULT_DOCTOR.specialty,
      },
    }));
  } catch (err) {
    console.error("[telehealth-auth] Error fetching patient connections:", err);
    return [];
  }
}

/**
 * Registers doctor presence heartbeat on the platform.
 */
export function recordDoctorPresence(
  providerId: string,
  status: "available" | "in_call" | "busy" = "available"
): void {
  presenceRegistry.set(providerId, {
    timestamp: Date.now(),
    status,
  });
}

/**
 * Evaluates real-time presence or active consultation room for a doctor.
 */
export async function getDoctorPresence(providerId: string): Promise<DoctorPresenceState> {
  const entry = presenceRegistry.get(providerId);
  const now = Date.now();
  const isHeartbeatActive = Boolean(entry && now - entry.timestamp < 90_000);

  // Check if doctor has an active in-progress room in consultations table
  let hasActiveRoom = false;
  let activeRoomName: string | undefined = undefined;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (key && key.length > 5) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data: activeConsultation } = await supabase
        .from("consultations")
        .select("room_name, status, scheduled_at")
        .eq("provider_id", providerId)
        .eq("status", "in_progress")
        .limit(1)
        .maybeSingle();

      if (activeConsultation) {
        hasActiveRoom = true;
        activeRoomName = activeConsultation.room_name;
      }
    } catch (err) {
      console.warn("[telehealth-auth] Error checking active consultation rooms:", err);
    }
  }

  if (hasActiveRoom) {
    return {
      online: true,
      status: "in_call",
      lastSeen: new Date().toISOString(),
      activeRoomName,
    };
  }

  if (isHeartbeatActive && entry) {
    return {
      online: entry.status !== "busy",
      status: entry.status,
      lastSeen: new Date(entry.timestamp).toISOString(),
    };
  }

  return {
    online: false,
    status: "offline",
    lastSeen: entry ? new Date(entry.timestamp).toISOString() : null,
  };
}

/**
 * Generates an encrypted session authorization token for the video room.
 */
export function generateVideoSessionToken(payload: {
  userId: string;
  role: "patient" | "provider";
  roomName: string;
  providerId: string;
  patientId: string;
  consultationId?: string;
}): { token: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
  const body = {
    sub: payload.userId,
    role: payload.role,
    room: payload.roomName,
    providerId: payload.providerId,
    patientId: payload.patientId,
    consultationId: payload.consultationId,
    exp: Math.floor(Date.now() / 1000) + 7200,
  };

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET_SIGNING_KEY)
    .update(`${header}.${claims}`)
    .digest("base64url");

  return {
    token: `${header}.${claims}.${signature}`,
    expiresAt,
  };
}

/**
 * Validates a video room session token.
 */
export function verifyVideoSessionToken(token: string, roomName: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Malformed session token" };
    }

    const [header, claims, sig] = parts;
    const expectedSig = crypto
      .createHmac("sha256", SECRET_SIGNING_KEY)
      .update(`${header}.${claims}`)
      .digest("base64url");

    if (!claims || !sig || !header || sig !== expectedSig) {
      return { valid: false, error: "Invalid token signature" };
    }

    const decoded = JSON.parse(Buffer.from(claims, "base64url").toString("utf8"));

    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Session token expired" };
    }

    if (decoded.room !== roomName) {
      return { valid: false, error: "Token does not match room session" };
    }

    return { valid: true, payload: decoded };
  } catch (err: any) {
    return { valid: false, error: err?.message || "Token verification failed" };
  }
}
