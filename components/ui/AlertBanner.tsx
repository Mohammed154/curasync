"use client";

import React from "react";
import { X, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { clsx } from "clsx";
import type { Alert } from "@/types";
import { severityColor, severityBg, severityIcon } from "@/lib/alerts";
import { formatDistanceToNow } from "date-fns";

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

export default function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 card-enter">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="relative flex items-start gap-3 px-4 py-3 rounded-lg border"
          style={{
            background: severityBg(alert.severity),
            borderColor: severityColor(alert.severity) + "33",
          }}
        >
          {/* Pulsing ring for critical */}
          {alert.severity === "critical" && (
            <span className="absolute left-3 top-3.5 w-2 h-2 rounded-full bg-status-red animate-ping" />
          )}

          <span className="text-base leading-none flex-shrink-0 mt-0.5">
            {severityIcon(alert.severity)}
          </span>

          <div className="flex-1 min-w-0">
            <p
              className="text-label-sm font-semibold"
              style={{ color: severityColor(alert.severity) }}
            >
              {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)} Alert
            </p>
            <p className="text-label-sm text-text-secondary mt-0.5 leading-snug">
              {alert.message}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
            </p>
          </div>

          {onDismiss && alert.severity !== "critical" && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors text-text-tertiary hover:text-text-secondary"
              aria-label="Dismiss alert"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
