"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Copy, Check, QrCode, Share2, Link, Users, ShieldCheck, Clock, Mail } from "lucide-react";
import { clsx } from "clsx";
import { format, addDays } from "date-fns";

// Mock invite codes — in production these are generated server-side as JWT tokens
// with 7-day expiry, stored in Supabase invite_codes table
const MOCK_EXISTING_INVITES = [
  { code: "CC-ARJUN-7K2M", patientId: "pat_001", patientName: "Arjun Mehta", createdAt: new Date(), expiresAt: addDays(new Date(), 7), status: "pending", usedAt: null },
];

export default function ProviderInvitePage() {
  const [invites, setInvites] = useState(MOCK_EXISTING_INVITES);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateInvite = () => {
    setGenerating(true);
    setTimeout(() => {
      // Generate a mock invite code — production: POST /api/v1/providers/invite
      const code = `CC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      setNewCode(code);
      setGenerating(false);
    }, 800);
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendEmail = () => {
    if (!emailInput.trim() || !newCode) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }, 1200);
  };

  return (
    <AppShell role="provider">
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">

        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="font-bold text-display text-text-primary">Patient Invite</h1>
          <p className="text-body-md text-text-secondary mt-1">
            Generate a secure code to link a patient to your care panel
          </p>
        </div>

        {/* How it works */}
        <div className="bg-bg-card rounded-xl shadow-card p-5 mb-5 card-enter">
          <h2 className="font-semibold text-title-md text-text-primary mb-4">How patient linking works</h2>
          <div className="space-y-3">
            {[
              { step: "1", icon: Link, text: "Generate a unique 7-day invite code below" },
              { step: "2", icon: Share2, text: "Share the code with your patient via SMS, email, or in-person" },
              { step: "3", icon: Users, text: "Patient enters the code in CuraSync app during onboarding or Settings" },
              { step: "4", icon: ShieldCheck, text: "Patient approves the data sharing consent — you gain access to their dashboard" },
            ].map(({ step, icon: Icon, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full gradient-violet flex items-center justify-center text-white text-xs font-bold flex-shrink-0" aria-hidden="true">
                  {step}
                </div>
                <Icon size={15} className="text-accent-lavender flex-shrink-0" aria-hidden="true" />
                <p className="text-label-sm text-text-secondary">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Generate new code */}
        <div className="bg-bg-card rounded-xl shadow-card p-5 mb-5 card-enter">
          <h2 className="font-semibold text-title-md text-text-primary mb-4">Generate Invite Code</h2>

          {!newCode ? (
            <button
              onClick={generateInvite}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl gradient-violet text-white font-bold text-body-md hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {generating ? (
                <><span className="animate-pulse">Generating…</span></>
              ) : (
                <><Link size={18} aria-hidden="true" /> Generate New Invite Code</>
              )}
            </button>
          ) : (
            <div className="space-y-4">
              {/* The code */}
              <div className="p-4 rounded-xl bg-bg-lavender border-2 border-accent-lavender/40 text-center">
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest mb-2">Invite Code</p>
                <p className="font-bold text-accent-violet metric-value" style={{ fontSize: "28px", letterSpacing: "0.08em" }}>
                  {newCode}
                </p>
                <p className="text-xs text-text-tertiary mt-2 flex items-center justify-center gap-1">
                  <Clock size={11} aria-hidden="true" />
                  Valid for 7 days · Expires {format(addDays(new Date(), 7), "MMM d, yyyy")}
                </p>
              </div>

              {/* Copy button */}
              <button
                onClick={() => copyCode(newCode)}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-label-sm transition-all",
                  copied ? "bg-status-green text-white" : "border border-divider bg-bg-card text-text-secondary hover:bg-bg-lavender hover:text-accent-violet"
                )}
              >
                {copied ? <><Check size={15} aria-hidden="true" /> Copied!</> : <><Copy size={15} aria-hidden="true" /> Copy Code</>}
              </button>

              {/* Email share */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Patient email address…"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-divider bg-bg-light text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet"
                  aria-label="Patient email"
                />
                <button
                  onClick={sendEmail}
                  disabled={!emailInput.trim() || sending || sent}
                  className={clsx(
                    "flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex-shrink-0",
                    sent ? "bg-status-green text-white"
                      : "gradient-violet text-white hover:opacity-90 disabled:opacity-40"
                  )}
                  aria-label="Send invite via email"
                >
                  {sent ? <><Check size={12} /> Sent!</> : sending ? "Sending…" : <><Mail size={12} /> Send</>}
                </button>
              </div>

              <button
                onClick={() => { setNewCode(null); setEmailInput(""); }}
                className="w-full text-center text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Generate a different code
              </button>
            </div>
          )}
        </div>

        {/* Existing invites */}
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden card-enter">
          <div className="px-4 py-3 border-b border-divider">
            <h2 className="font-semibold text-title-md text-text-primary">Pending Invites</h2>
          </div>
          {invites.length === 0 ? (
            <p className="text-label-sm text-text-tertiary text-center py-8">No pending invites.</p>
          ) : (
            invites.map((invite, i) => (
              <div key={invite.code} className={clsx("flex items-center gap-3 px-4 py-3", i < invites.length - 1 && "border-b border-divider")}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-label-sm text-text-primary font-mono tracking-wider">{invite.code}</p>
                  <p className="text-xs text-text-tertiary">
                    Expires {format(invite.expiresAt, "MMM d")} · Status: <span className="text-accent-violet font-semibold capitalize">{invite.status}</span>
                  </p>
                </div>
                <button
                  onClick={() => setInvites((prev) => prev.filter((inv) => inv.code !== invite.code))}
                  className="text-xs text-text-tertiary hover:text-status-red transition-colors px-2 py-1 rounded hover:bg-red-50"
                  aria-label={`Revoke invite ${invite.code}`}
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
