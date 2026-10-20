"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  auth,
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  checkRedirectResult,
  signOutFirebase,
  onAuthStateChanged,
  User,
} from "@/lib/firebase/client";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  created_at: string;
  last_report_sent_at: string | null;
  onboarding_complete?: boolean;
  conditions?: string[];
  date_of_birth?: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  location_updated_at?: string | null;
}

export interface SignInResult {
  user: User;
  profile: UserProfile | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  turnstileToken: string | null;
  setTurnstileToken: (token: string | null) => void;
  signInWithGoogle: (turnstile?: string) => Promise<SignInResult | null>;
  signInWithRedirectFlow: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocation: (coords?: { latitude: number; longitude: number; accuracy?: number }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  turnstileToken: null,
  setTurnstileToken: () => {},
  signInWithGoogle: async () => null,
  signInWithRedirectFlow: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  updateLocation: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const syncUserToSupabase = useCallback(async (firebaseUser: User, turnstile?: string, locationCoords?: { latitude: number; longitude: number; accuracy?: number }): Promise<UserProfile | null> => {
    try {
      const idToken = await firebaseUser.getIdToken();
      let cachedLoc: { latitude: number; longitude: number; accuracy?: number } | null = locationCoords || null;
      if (!cachedLoc && typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("curasync_user_location");
          if (raw) cachedLoc = JSON.parse(raw);
        } catch {
          // ignore
        }
      }

      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          turnstileToken: turnstile || undefined,
          location: cachedLoc ? {
            latitude: cachedLoc.latitude,
            longitude: cachedLoc.longitude,
            accuracy: cachedLoc.accuracy,
            source: "browser",
          } : undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.profile) {
          setProfile(json.profile);
          return json.profile;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn("[auth-context] Sync error status:", res.status, errJson);
      }
    } catch (err) {
      console.error("[auth-context] User sync error:", err);
    }
    return null;
  }, []);

  const updateLocation = useCallback(async (coords?: { latitude: number; longitude: number; accuracy?: number }) => {
    try {
      let idToken: string | undefined;
      if (user) {
        idToken = await user.getIdToken();
      }

      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          location: coords ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            source: "browser",
          } : undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.profile) {
          setProfile(json.profile);
        }
      }
    } catch (err) {
      console.error("[auth-context] Location update error:", err);
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const json = await res.json();
        if (json.user) {
          setProfile(json.user);
        }
      }
    } catch (err) {
      console.error("[auth-context] Refresh profile error:", err);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    // 1. Check for redirect sign-in result
    checkRedirectResult()
      .then(async (redirectUser) => {
        if (redirectUser) {
          setUser(redirectUser);
          const syncedProfile = await syncUserToSupabase(redirectUser);
          if (typeof window !== "undefined") {
            const hasCompleted = Boolean(
              syncedProfile?.onboarding_complete ||
              (Array.isArray(syncedProfile?.conditions) && syncedProfile.conditions.length > 0)
            );
            const path = window.location.pathname;
            if (path === "/login" || path === "/onboarding" || path === "/") {
              window.location.href = hasCompleted ? "/dashboard" : "/onboarding";
            }
          }
        }
      })
      .catch((err) => {
        console.warn("[auth-context] Redirect result check:", err);
      });

    // 2. Listen to Firebase auth state changes
    unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserToSupabase(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [syncUserToSupabase]);

  const signInWithGoogle = async (turnstile?: string): Promise<SignInResult | null> => {
    setLoading(true);
    try {
      let signedInUser: User;
      try {
        signedInUser = await signInWithGooglePopup();
      } catch (popupErr: any) {
        // Automatic graceful fallback to redirect flow if popup is blocked on mobile or desktop
        if (
          popupErr.code === "auth/popup-blocked" ||
          popupErr.code === "auth/cancelled-popup-request" ||
          popupErr.message?.includes("popup-blocked")
        ) {
          console.warn("[auth-context] Popup blocked by browser. Seamlessly initiating redirect flow...");
          await signInWithGoogleRedirect();
          return null;
        }
        throw popupErr;
      }

      setUser(signedInUser);
      const syncedProfile = await syncUserToSupabase(signedInUser, turnstile || turnstileToken || undefined);
      return {
        user: signedInUser,
        profile: syncedProfile,
      };
    } catch (err) {
      console.error("[auth-context] Google popup error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithRedirectFlow = async () => {
    setLoading(true);
    try {
      await signInWithGoogleRedirect();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await signOutFirebase();
      await fetch("/api/auth/session", { method: "DELETE" });
      setUser(null);
      setProfile(null);
      window.location.href = "/login";
    } catch (err) {
      console.error("[auth-context] Sign-out error:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        turnstileToken,
        setTurnstileToken,
        signInWithGoogle,
        signInWithRedirectFlow,
        signOut,
        refreshProfile,
        updateLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
