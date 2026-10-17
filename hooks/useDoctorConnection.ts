"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export interface ProviderInfo {
  id: string;
  name: string;
  specialty: string;
}

export interface DoctorPresence {
  online: boolean;
  status: "available" | "in_call" | "busy" | "offline";
  lastSeen: string | null;
  activeRoomName?: string;
}

export interface ConnectionStatusResponse {
  connected: boolean;
  status: "active" | "pending" | "not_connected" | "revoked";
  provider?: ProviderInfo;
  linkId?: string;
  message?: string;
  doctorPresence?: DoctorPresence;
}

export interface VideoTokenResponse {
  authorized: boolean;
  token?: string;
  roomName?: string;
  roomUrl?: string;
  expiresAt?: string;
  error?: string;
  code?: string;
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

export function useDoctorConnection(providerId: string = "dev_provider_001") {
  const { data, error, isValidating, mutate } = useSWR<ConnectionStatusResponse>(
    `/api/v1/telehealth/status?providerId=${encodeURIComponent(providerId)}`,
    fetcher,
    {
      refreshInterval: 12_000,
      revalidateOnFocus: true,
    }
  );

  const [realtimePresence, setRealtimePresence] = useState<DoctorPresence | null>(null);

  // Supabase Realtime channel for instant doctor presence broadcasts
  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      const channel = supabase.channel(`telehealth:presence:${providerId}`);

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const doctorPresences = Object.values(state).flat() as Array<{ status?: string }>;
          if (doctorPresences.length > 0) {
            const latest = doctorPresences[0];
            setRealtimePresence({
              online: true,
              status: (latest?.status as any) || "available",
              lastSeen: new Date().toISOString(),
            });
          }
        })
        .on("presence", { event: "leave" }, () => {
          setRealtimePresence((prev) => (prev ? { ...prev, online: false, status: "offline" } : null));
        })
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    } catch {
      // Fallback to SWR periodic polling
    }
  }, [providerId]);

  const connectDoctor = useCallback(
    async (inviteCode?: string) => {
      const res = await fetch("/api/v1/telehealth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ providerId, inviteCode }),
      });
      const json = await res.json();
      await mutate();
      return json;
    },
    [providerId, mutate]
  );

  const requestVideoToken = useCallback(
    async (roomName?: string, consultationId?: string): Promise<VideoTokenResponse> => {
      const res = await fetch("/api/v1/telehealth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ providerId, roomName, consultationId }),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          authorized: false,
          error: json.error || "Access denied to video consultation room.",
          code: json.code || "TOKEN_REQUEST_FAILED",
        };
      }
      return json;
    },
    [providerId]
  );

  const effectivePresence: DoctorPresence = realtimePresence || data?.doctorPresence || {
    online: false,
    status: "offline",
    lastSeen: null,
  };

  return {
    loading: !data && !error,
    connected: Boolean(data?.connected),
    status: data?.status || "not_connected",
    provider: data?.provider || { id: providerId, name: "Dr. Priya Sharma", specialty: "Internal Medicine & Chronic Care" },
    doctorPresence: effectivePresence,
    isDoctorOnline: Boolean(effectivePresence.online),
    connectDoctor,
    requestVideoToken,
    mutate,
  };
}
