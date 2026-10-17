// lib/location.ts — Client-side Geolocation capture utility with polite permission handling

export interface BrowserLocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface UserLocationPayload {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  timestamp?: number | null;
  source?: "browser" | "cloudflare" | "fallback";
}

const STORAGE_KEY_LOCATION = "curasync_user_location";
const STORAGE_KEY_PROMPTED = "curasync_location_permission_requested";

/**
 * Checks whether browser geolocation is supported.
 */
export function isGeolocationSupported(): boolean {
  return typeof window !== "undefined" && "geolocation" in navigator;
}

/**
 * Polite client-side location getter using navigator.geolocation.getCurrentPosition.
 * Non-blocking: returns null immediately upon permission dismissal, denial, or timeout without throwing.
 */
export async function getBrowserLocation(options?: {
  timeoutMs?: number;
  enableHighAccuracy?: boolean;
}): Promise<BrowserLocationCoordinates | null> {
  if (!isGeolocationSupported()) {
    console.warn("[location] navigator.geolocation not supported in this browser");
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? 7000;
  const enableHighAccuracy = options?.enableHighAccuracy ?? false;

  return new Promise<BrowserLocationCoordinates | null>((resolve) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY_PROMPTED, "true");
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: BrowserLocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          // Cache locally for snappy client reads
          try {
            window.localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(coords));
          } catch {
            // Ignore storage quota errors
          }

          resolve(coords);
        },
        (error) => {
          // Non-blocking fallback: Log politely and return null
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.info("[location] User politely declined or dismissed location permission.");
              break;
            case error.POSITION_UNAVAILABLE:
              console.warn("[location] Geolocation position unavailable.");
              break;
            case error.TIMEOUT:
              console.warn("[location] Geolocation request timed out.");
              break;
            default:
              console.warn("[location] Geolocation error:", error.message);
          }
          resolve(null);
        },
        {
          enableHighAccuracy,
          timeout: timeoutMs,
          maximumAge: 1000 * 60 * 15, // Cache for 15 minutes
        }
      );
    } catch (err) {
      console.warn("[location] Unexpected error during getCurrentPosition:", err);
      resolve(null);
    }
  });
}

/**
 * Retrieve cached location if available
 */
export function getCachedLocation(): BrowserLocationCoordinates | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_LOCATION);
    if (!raw) return null;
    return JSON.parse(raw) as BrowserLocationCoordinates;
  } catch {
    return null;
  }
}

/**
 * Check if the user has already been asked for location
 */
export function hasBeenPromptedForLocation(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY_PROMPTED) === "true";
}

/**
 * Send captured location to the user profile sync endpoint (/api/auth/sync)
 */
export async function syncLocationToBackend(
  coords?: BrowserLocationCoordinates | null,
  idToken?: string | null
): Promise<{ success: boolean; profile?: any; error?: string }> {
  try {
    const payload: {
      idToken?: string;
      location?: UserLocationPayload;
    } = {};

    if (idToken) {
      payload.idToken = idToken;
    }

    if (coords) {
      payload.location = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: coords.timestamp,
        source: "browser",
      };
    }

    const res = await fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, profile: data.profile };
    }

    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.error || `HTTP ${res.status}` };
  } catch (err: any) {
    console.error("[location] Failed to sync location to backend:", err);
    return { success: false, error: err.message || "Network error" };
  }
}
