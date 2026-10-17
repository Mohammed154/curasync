"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, ArrowLeft, MapPin, CheckCircle2, Loader2, Globe, Shield } from "lucide-react";
import { clsx } from "clsx";
import { getBrowserLocation, syncLocationToBackend, BrowserLocationCoordinates } from "@/lib/location";
import { useAuth } from "@/context/AuthContext";

export default function OnboardingLocationPage() {
  const router = useRouter();
  const { user, profile, updateLocation } = useAuth();
  const [detecting, setDetecting] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<BrowserLocationCoordinates | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasPrompted, setHasPrompted] = useState(false);

  // Check if profile already has location
  useEffect(() => {
    if (profile?.latitude && profile?.longitude) {
      setDetectedCoords({
        latitude: Number(profile.latitude),
        longitude: Number(profile.longitude),
        accuracy: 10,
        timestamp: Date.now(),
      });
      setStatusMessage(profile.city ? `${profile.city}, ${profile.country || ""}` : "Location configured");
    }
  }, [profile]);

  const handleRequestLocation = async () => {
    setDetecting(true);
    setStatusMessage(null);
    setHasPrompted(true);

    try {
      const coords = await getBrowserLocation({ timeoutMs: 8000, enableHighAccuracy: true });
      if (coords) {
        setDetectedCoords(coords);
        setStatusMessage(`Latitude ${coords.latitude.toFixed(4)}, Longitude ${coords.longitude.toFixed(4)}`);
        
        // Persist to backend and context
        await updateLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
      } else {
        // Non-blocking fallback
        setStatusMessage("Permission not granted. Passive regional location will be used.");
      }
    } catch (err) {
      console.warn("[onboarding-location] Non-blocking fallback:", err);
      setStatusMessage("Location detection skipped. You can proceed without interruption.");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl gradient-violet flex items-center justify-center">
            <Heart size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-title-lg text-text-primary">CuraSync</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: step <= 4 ? "40px" : "12px",
                  background: step <= 4 ? "#6C5CE7" : "#E2E0F0",
                }}
              />
            ))}
          </div>
          <span className="text-xs text-text-tertiary ml-2">Step 4 of 5</span>
        </div>

        <div className="mb-6">
          <h1 className="font-bold text-title-lg text-text-primary mb-2">Set your care location</h1>
          <p className="text-body-md text-text-secondary">
            CuraSync uses your geographic location to calibrate emergency medical contacts, local clinical reference ranges, and regional healthcare providers.
          </p>
        </div>

        {/* Location Detection Card */}
        <div className="bg-bg-card rounded-2xl p-6 shadow-card border border-divider mb-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-bg-lavender flex items-center justify-center text-accent-violet flex-shrink-0">
              <MapPin size={24} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-title-sm text-text-primary">
                Geographic Detection
              </h2>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                We request browser geolocation with strict privacy compliance (HIPAA & DPDP Act 2023). You can accept or skip anytime without affecting health logging.
              </p>
            </div>
          </div>

          {detectedCoords ? (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-status-green-bg border border-status-green/30 text-status-green">
              <CheckCircle2 size={18} className="flex-shrink-0" />
              <div className="text-xs">
                <p className="font-semibold">Location successfully captured</p>
                <p className="opacity-90">{statusMessage || `Coordinates: ${detectedCoords.latitude.toFixed(4)}, ${detectedCoords.longitude.toFixed(4)}`}</p>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRequestLocation}
                disabled={detecting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl gradient-violet text-white font-semibold text-sm hover:opacity-95 transition-all shadow-md disabled:opacity-60"
              >
                {detecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Detecting geographic location…</span>
                  </>
                ) : (
                  <>
                    <MapPin size={16} />
                    <span>Allow & Detect Location</span>
                  </>
                )}
              </button>
            </div>
          )}

          {statusMessage && !detectedCoords && (
            <p className="text-xs text-text-secondary bg-bg-lavender/60 rounded-lg p-2.5 text-center">
              {statusMessage}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1 text-[11px] text-text-tertiary">
            <Shield size={13} className="text-accent-violet flex-shrink-0" />
            <span>End-to-end encrypted · Never shared with third-party advertisers.</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/onboarding/medications"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-divider font-semibold text-body-md text-text-secondary hover:bg-bg-lavender transition-all"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </Link>
          <Link
            href="/onboarding/complete"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-violet text-white font-semibold text-body-md hover:opacity-90 transition-opacity"
          >
            {detectedCoords ? "Continue" : "Skip for now"}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
