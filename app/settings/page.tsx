"use client";

import React, { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  User, Bell, Shield, Watch, Download, Trash2, ChevronRight,
  Moon, Globe, LogOut, Lock, FileText, Smartphone
} from "lucide-react";
import { clsx } from "clsx";

interface SettingRow {
  id: string;
  label: string;
  description?: string;
  type: "navigate" | "toggle" | "info";
  value?: boolean;
  danger?: boolean;
}

const WEARABLE_DEVICES = [
  { id: "apple_watch", name: "Apple Watch Series 9", status: "connected", lastSync: "8 min ago", icon: "⌚" },
  { id: "fitbit", name: "Fitbit Charge 6", status: "disconnected", lastSync: "Never", icon: "📿" },
  { id: "garmin", name: "Garmin Fenix 7", status: "disconnected", lastSync: "Never", icon: "🏃" },
];

type SectionKey = "profile" | "notifications" | "wearables" | "privacy" | "data" | null;

export default function SettingsPage() {
  const [expanded, setExpanded] = useState<SectionKey>("profile");
  const [toggles, setToggles] = useState({
    pushNotifications: true,
    emailDigest: true,
    smsAlerts: true,
    biometricUnlock: false,
    largeText: false,
    shareWithProviders: true,
  });
  const [pdfDownloadsToday] = useState(1); // max 5/day

  const toggle = (key: keyof typeof toggles) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const sections: { key: SectionKey; label: string; icon: React.ElementType; description: string }[] = [
    { key: "profile",       label: "Profile",               icon: User,      description: "Name, DOB, emergency contact" },
    { key: "notifications", label: "Notifications",          icon: Bell,      description: "Push, SMS, email preferences" },
    { key: "wearables",    label: "Wearables & Devices",    icon: Watch,     description: "Sync Apple Watch, Fitbit, Garmin" },
    { key: "privacy",      label: "Privacy & Security",     icon: Shield,    description: "Data sharing, session, biometrics" },
    { key: "data",         label: "My Data & Export",       icon: Download,  description: "Download, delete, export options" },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6">

        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <h1 className="font-bold text-display text-text-primary">Settings</h1>
          <p className="text-body-md text-text-secondary mt-1">Account, privacy, devices & preferences</p>
        </div>

        {/* Profile card */}
        <div className="bg-bg-card rounded-xl shadow-card p-4 mb-4 flex items-center gap-4 card-enter">
          <div className="w-14 h-14 rounded-full gradient-violet flex items-center justify-center text-white font-bold text-xl flex-shrink-0" aria-hidden="true">
            AM
          </div>
          <div className="flex-1">
            <p className="font-semibold text-title-md text-text-primary">Arjun Mehta</p>
            <p className="text-label-sm text-text-secondary">arjun.mehta@email.com</p>
            <p className="text-xs text-text-tertiary mt-0.5">Patient · Mumbai · Member since Jan 2026</p>
          </div>
          <button className="text-accent-violet text-label-sm font-semibold hover:text-accent-lavender transition-colors" aria-label="Edit profile">
            Edit
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {sections.map(({ key, label, icon: Icon, description }) => (
            <div key={key} className="bg-bg-card rounded-xl shadow-card overflow-hidden card-enter">
              {/* Section header */}
              <button
                onClick={() => setExpanded(expanded === key ? null : key)}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-bg-light/50 transition-colors"
                aria-expanded={expanded === key}
              >
                <div className="w-9 h-9 rounded-lg bg-bg-lavender flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-accent-violet" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-label-sm text-text-primary">{label}</p>
                  <p className="text-xs text-text-tertiary">{description}</p>
                </div>
                <ChevronRight size={16} className={clsx("text-text-tertiary transition-transform duration-200", expanded === key && "rotate-90")} />
              </button>

              {/* Expanded content */}
              {expanded === key && (
                <div className="border-t border-divider px-4 py-4 space-y-4 animate-fade-in">

                  {/* PROFILE */}
                  {key === "profile" && (
                    <div className="space-y-3">
                      {[
                        { label: "Full name", value: "Arjun Mehta" },
                        { label: "Date of birth", value: "March 14, 1967 (Age 58)" },
                        { label: "Phone", value: "+91 98765 43210" },
                        { label: "Emergency contact", value: "Sunita Mehta — Spouse" },
                        { label: "Language", value: "English" },
                      ].map((f) => (
                        <div key={f.label} className="flex items-center justify-between py-2 border-b border-divider last:border-0">
                          <span className="text-label-sm text-text-secondary">{f.label}</span>
                          <span className="text-label-sm font-medium text-text-primary">{f.value}</span>
                        </div>
                      ))}
                      <button className="w-full py-2.5 rounded-lg border border-accent-lavender text-accent-violet text-label-sm font-semibold hover:bg-bg-lavender transition-all">
                        Edit Profile Information
                      </button>
                    </div>
                  )}

                  {/* NOTIFICATIONS */}
                  {key === "notifications" && (
                    <div className="space-y-3">
                      {[
                        { id: "pushNotifications", label: "Push notifications", desc: "Medication reminders & alert updates" },
                        { id: "emailDigest", label: "Weekly email digest", desc: "Summary of your health week" },
                        { id: "smsAlerts", label: "SMS for critical alerts", desc: "Twilio SMS when BP or glucose is critical" },
                      ].map((n) => (
                        <div key={n.id} className="flex items-center justify-between py-2 border-b border-divider last:border-0">
                          <div>
                            <p className="text-label-sm font-semibold text-text-primary">{n.label}</p>
                            <p className="text-xs text-text-tertiary">{n.desc}</p>
                          </div>
                          <button
                            onClick={() => toggle(n.id as keyof typeof toggles)}
                            className={clsx("relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0", toggles[n.id as keyof typeof toggles] ? "bg-accent-violet" : "bg-divider")}
                            role="switch"
                            aria-checked={toggles[n.id as keyof typeof toggles]}
                            aria-label={`Toggle ${n.label}`}
                          >
                            <span className={clsx("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", toggles[n.id as keyof typeof toggles] ? "left-5" : "left-0.5")} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* WEARABLES */}
                  {key === "wearables" && (
                    <div className="space-y-3">
                      {WEARABLE_DEVICES.map((device) => (
                        <div key={device.id} className="flex items-center gap-3 py-2 border-b border-divider last:border-0">
                          <span className="text-2xl flex-shrink-0" aria-hidden="true">{device.icon}</span>
                          <div className="flex-1">
                            <p className="text-label-sm font-semibold text-text-primary">{device.name}</p>
                            <p className="text-xs text-text-tertiary">Last sync: {device.lastSync}</p>
                          </div>
                          <button
                            className={clsx(
                              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                              device.status === "connected"
                                ? "bg-status-green-bg text-status-green hover:bg-red-50 hover:text-status-red"
                                : "bg-bg-lavender text-accent-violet hover:bg-accent-violet hover:text-white"
                            )}
                          >
                            {device.status === "connected" ? "Connected ✓" : "Connect"}
                          </button>
                        </div>
                      ))}
                      <p className="text-xs text-text-tertiary pt-1">
                        Fitbit & Garmin sync via OAuth 2.0 every 15 minutes. Apple Watch syncs passively via HealthKit.
                      </p>
                    </div>
                  )}

                  {/* PRIVACY */}
                  {key === "privacy" && (
                    <div className="space-y-3">
                      {[
                        { id: "biometricUnlock", label: "Biometric / Face ID unlock", desc: "Unlock app with Face ID or fingerprint" },
                        { id: "shareWithProviders", label: "Share data with care team", desc: "Dr. Priya can view your health data" },
                      ].map((n) => (
                        <div key={n.id} className="flex items-center justify-between py-2 border-b border-divider">
                          <div>
                            <p className="text-label-sm font-semibold text-text-primary">{n.label}</p>
                            <p className="text-xs text-text-tertiary">{n.desc}</p>
                          </div>
                          <button
                            onClick={() => toggle(n.id as keyof typeof toggles)}
                            className={clsx("relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0", toggles[n.id as keyof typeof toggles] ? "bg-accent-violet" : "bg-divider")}
                            role="switch"
                            aria-checked={toggles[n.id as keyof typeof toggles]}
                            aria-label={`Toggle ${n.label}`}
                          >
                            <span className={clsx("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all", toggles[n.id as keyof typeof toggles] ? "left-5" : "left-0.5")} />
                          </button>
                        </div>
                      ))}
                      <div className="pt-1 space-y-1">
                        {[
                          { icon: Lock, label: "Session timeout: 30 minutes idle" },
                          { icon: Shield, label: "AES-256 encryption at rest" },
                          { icon: Globe, label: "Data stored in ap-south-1 (Mumbai) — DPDP Act 2023" },
                        ].map(({ icon: I, label }) => (
                          <div key={label} className="flex items-center gap-2 text-xs text-text-tertiary">
                            <I size={12} aria-hidden="true" />
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DATA & EXPORT */}
                  {key === "data" && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-bg-lavender">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-label-sm font-semibold text-text-primary">PDF Health Report</p>
                          <span className="text-xs text-text-tertiary">{pdfDownloadsToday}/5 today</span>
                        </div>
                        <p className="text-xs text-text-secondary mb-3">2-page clinical summary of your last 30 days — ready for your doctor appointment.</p>
                        <button
                          disabled={pdfDownloadsToday >= 5}
                          className="w-full py-2.5 rounded-lg gradient-violet text-white text-label-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          <Download size={14} aria-hidden="true" />
                          Download 30-Day Report PDF
                        </button>
                      </div>

                      <button className="w-full flex items-center gap-3 py-3 px-3 rounded-lg border border-divider hover:bg-bg-light transition-all text-left">
                        <FileText size={16} className="text-text-secondary flex-shrink-0" aria-hidden="true" />
                        <div className="flex-1">
                          <p className="text-label-sm font-semibold text-text-primary">Export all data (CSV)</p>
                          <p className="text-xs text-text-tertiary">All readings, medications, and journal entries</p>
                        </div>
                        <ChevronRight size={14} className="text-text-tertiary" />
                      </button>

                      <div className="pt-2 border-t border-divider">
                        <button className="w-full flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-red-50 transition-all text-left group">
                          <Trash2 size={16} className="text-status-red flex-shrink-0" aria-hidden="true" />
                          <div className="flex-1">
                            <p className="text-label-sm font-semibold text-status-red">Delete my account & all data</p>
                            <p className="text-xs text-text-tertiary">Permanent — cannot be undone. DPDP right to erasure.</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sign out */}
        <button className="w-full flex items-center justify-center gap-2 mt-5 py-3 rounded-xl border border-divider text-label-sm font-semibold text-text-secondary hover:bg-red-50 hover:text-status-red hover:border-status-red transition-all">
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>

        <p className="text-center text-xs text-text-tertiary mt-4">
          CuraSync v0.1.0 · HIPAA Compliant · DPDP Act 2023
        </p>

        <div className="h-8" />
      </div>
    </AppShell>
  );
}
