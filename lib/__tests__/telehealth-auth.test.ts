import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateVideoSessionToken,
  verifyVideoSessionToken,
  recordDoctorPresence,
  getDoctorPresence,
} from "@/lib/telehealth-auth";

describe("Telehealth Video Token Authorization", () => {
  const samplePayload = {
    userId: "patient_user_123",
    role: "patient" as const,
    roomName: "curasync-room-xyz",
    providerId: "dev_provider_001",
    patientId: "0bfccbd4-326a-4d9c-94bb-3159e808e109",
    consultationId: "c79f9720-3333-4444-5555-666677778888",
  };

  it("generates a signed video session token with expiration", () => {
    const res = generateVideoSessionToken(samplePayload);
    expect(res.token).toBeDefined();
    expect(typeof res.token).toBe("string");
    expect(res.token.split(".")).toHaveLength(3);
    expect(new Date(res.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("successfully verifies a valid session token bound to the room", () => {
    const { token } = generateVideoSessionToken(samplePayload);
    const verification = verifyVideoSessionToken(token, "curasync-room-xyz");
    expect(verification.valid).toBe(true);
    expect(verification.payload?.sub).toBe("patient_user_123");
    expect(verification.payload?.room).toBe("curasync-room-xyz");
    expect(verification.payload?.role).toBe("patient");
  });

  it("rejects token when attempting to join a different room", () => {
    const { token } = generateVideoSessionToken(samplePayload);
    const verification = verifyVideoSessionToken(token, "unauthorized-room-abc");
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain("Token does not match room session");
  });

  it("rejects tampered token signature", () => {
    const { token } = generateVideoSessionToken(samplePayload);
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.invalidsignaturexyz123`;
    const verification = verifyVideoSessionToken(tampered, "curasync-room-xyz");
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain("Invalid token signature");
  });

  it("rejects malformed tokens", () => {
    const verification = verifyVideoSessionToken("not-a-real-jwt", "curasync-room-xyz");
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain("Malformed session token");
  });
});

describe("Doctor Platform Presence", () => {
  it("records doctor presence and reflects online status", async () => {
    recordDoctorPresence("test_doctor_01", "available");
    const presence = await getDoctorPresence("test_doctor_01");
    expect(presence.online).toBe(true);
    expect(presence.status).toBe("available");
    expect(presence.lastSeen).toBeDefined();
  });

  it("reflects offline status for unknown or inactive providers", async () => {
    const presence = await getDoctorPresence("nonexistent_doctor_99");
    expect(presence.online).toBe(false);
    expect(presence.status).toBe("offline");
  });
});
