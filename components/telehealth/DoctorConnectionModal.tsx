"use client";

import React, { useState } from "react";
import { X, ShieldAlert, CheckCircle2, UserCheck, Stethoscope, Loader2, ArrowRight } from "lucide-react";
import { clsx } from "clsx";

interface DoctorConnectionModalProps {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
  doctorName?: string;
  specialty?: string;
  onConnect: (inviteCode?: string) => Promise<{ success?: boolean; error?: string }>;
}

export default function DoctorConnectionModal({
  open,
  onClose,
  onConnected,
  doctorName = "Dr. Priya Sharma",
  specialty = "Internal Medicine & Chronic Care",
  onConnect,
}: DoctorConnectionModalProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await onConnect(inviteCode.trim() || undefined);
      if (res?.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onConnected) onConnected();
          onClose();
          setSuccess(false);
        }, 1200);
      } else {
        setError(res?.error || "Could not establish connection. Please verify the code.");
      }
    } catch (err: any) {
      setError(err?.message || "Connection failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connection-modal-title"
    >
      <div className="bg-bg-card rounded-2xl shadow-xl border border-divider w-full max-w-md overflow-hidden card-enter">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-divider flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent-violet/10 flex items-center justify-center text-accent-violet">
              <Stethoscope size={18} />
            </div>
            <div>
              <h2 id="connection-modal-title" className="font-bold text-title-md text-text-primary">
                Doctor Connection Required
              </h2>
              <p className="text-xs text-text-secondary">Clinical Care Team Authorization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-light transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-900">Live Video Session Restriction</p>
              <p className="text-amber-800/90 leading-relaxed">
                Under HIPAA and DPDP medical guidelines, live telehealth sessions are restricted strictly to patients
                with an active, verified doctor link.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-divider bg-bg-light/40 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full gradient-violet flex items-center justify-center text-white flex-shrink-0 font-bold text-sm">
              PS
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-text-primary truncate">{doctorName}</h3>
              <p className="text-xs text-text-secondary truncate">{specialty}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold text-accent-violet bg-bg-lavender px-2 py-0.5 rounded-full">
                Primary Chronic Specialist
              </span>
            </div>
          </div>

          {success ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-status-green-bg text-status-green flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <p className="font-bold text-sm text-text-primary">Connection Approved!</p>
              <p className="text-xs text-text-secondary">You are now authorized for video telehealth sessions.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div>
                <label htmlFor="invite-code" className="block text-xs font-semibold text-text-secondary mb-1">
                  Doctor Invite Code <span className="font-normal text-text-tertiary">(Optional)</span>
                </label>
                <input
                  id="invite-code"
                  type="text"
                  placeholder="e.g. CC-CARE-2026 or leave blank for primary link"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-divider text-xs focus:outline-none focus:ring-2 focus:ring-accent-violet uppercase tracking-wider"
                />
                <p className="text-[11px] text-text-tertiary mt-1">
                  If your doctor provided an onboarding PIN or code, enter it above.
                </p>
              </div>

              {error && (
                <p className="text-xs text-status-red bg-status-red-bg p-2 rounded-lg font-medium">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-divider text-xs font-semibold text-text-secondary hover:bg-bg-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl gradient-violet text-white text-xs font-bold shadow-card hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <span>Establish Connection</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
