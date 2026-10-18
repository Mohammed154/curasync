// lib/firebase/admin.ts
// Server-side Firebase Admin SDK initialization and ID token verification

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

function cleanPrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  let cleaned = key.trim();
  // Strip surrounding quotes if present (single or double)
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Replace literal escaped '\n' sequences with real newlines
  cleaned = cleaned.replace(/\\n/g, "\n");
  // Normalize Windows \r\n to \n
  cleaned = cleaned.replace(/\r\n/g, "\n");
  return cleaned;
}

function initializeFirebaseAdmin(): App {
  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    return existingApps[0];
  }

  // 1. Service Account JSON in env
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(
        serviceAccountJson.startsWith("{")
          ? serviceAccountJson
          : Buffer.from(serviceAccountJson, "base64").toString("utf-8")
      );
      if (parsed.private_key) {
        parsed.private_key = cleanPrivateKey(parsed.private_key);
      }
      return initializeApp({
        credential: cert(parsed),
      });
    } catch (e) {
      console.warn("[firebase-admin] Could not parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
    }
  }

  // 2. Individual credentials in env
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (e: any) {
      console.warn("[firebase-admin] Could not initialize with private key credential:", e?.message || e);
    }
  }

  // 3. Fallback safe initialization (project ID only - safe for build time and dev)
  try {
    return initializeApp({
      projectId: projectId || "curasync-app",
    });
  } catch (e) {
    const apps = getApps();
    if (apps.length > 0 && apps[0]) return apps[0];
    throw e;
  }
}

const adminApp = initializeFirebaseAdmin();
export const adminAuth = getAuth(adminApp);

/**
 * Verify a Firebase ID token on the server
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<DecodedFirebaseToken | null> {
  if (!idToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      displayName: (decoded.name as string) || (decoded.display_name as string) || undefined,
      photoURL: (decoded.picture as string) || undefined,
    };
  } catch (error: any) {
    console.warn("[firebase-admin] verifyIdToken error:", error.message);

    // Development fallback for unconfigured service account / testing
    if (process.env.NODE_ENV !== "production") {
      try {
        // Attempt basic JWT payload decode
        const parts = idToken.split(".");
        if (parts.length === 3 && parts[1]) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload.user_id || payload.sub) {
            return {
              uid: payload.user_id || payload.sub,
              email: payload.email,
              displayName: payload.name,
              photoURL: payload.picture,
            };
          }
        }
      } catch {
        // Ignore fallback failure
      }
    }

    return null;
  }
}
