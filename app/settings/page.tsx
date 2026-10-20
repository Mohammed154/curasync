"use client";

import React, { useState } from "react";
import AppShell, { SafeSignOutButton } from "@/components/layout/AppShell";
import {
  User, Bell, Shield, MapPin, Download, Trash2, ChevronRight,
  Moon, Globe, LogOut, Lock, FileText, Smartphone, Loader2,
  AlertTriangle, ShieldAlert, X
} from "lucide-react";
import { clsx } from "clsx";
import { requestPdfExport } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { getBrowserLocation } from "@/lib/location";

interface SettingRow {
  id: string;
  label: string;
  description?: string;
  type: "navigate" | "toggle" | "info";
  value?: boolean;
  danger?: boolean;
}

type SectionKey = "profile" | "notifications" | "location" | "privacy" | "data" | null;

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
  const [pdfDownloadsToday, setPdfDownloadsToday] = useState(1); // max 5/day
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { user, profile, updateLocation, signOut } = useAuth();

  const handleExportPdf = async () => {
    if (exportingPdf || pdfDownloadsToday >= 5) return;
    setExportingPdf(true);
    try {
      await requestPdfExport();
      setPdfDownloadsToday((prev) => Math.min(5, prev + 1));
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF report. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    if (exportingCsv) return;
    setExportingCsv(true);
    try {
      const res = await fetch("/api/v1/export?format=csv");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Export failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0];
      a.download = `curasync-health-data-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("CSV export error:", err);
      alert(err.message || "Failed to download CSV data export. Please try again.");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE" || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/v1/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account. Please try again.");
      }

      // Clear local storage and session items
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("curasync_user_location");
          window.sessionStorage.clear();
        } catch {}
      }

      // Clear client auth state
      try {
        await signOut();
      } catch (e) {
        console.warn("Client signout warning:", e);
      }

      // Hard redirect to login page with notification
      window.location.href = "/login?deleted=true";
    } catch (err: any) {
      console.error("Account deletion error:", err);
      setDeleteError(err.message || "An unexpected error occurred while deleting your account.");
      setIsDeleting(false);
    }
  };

  const toggle = (key: keyof typeof toggles) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  const sections: { key: SectionKey; label: string; icon: React.ElementType; description: string }[] = [
    { key: "profile",       label: "Profile",               icon: User,      description: "Name, DOB, emergency contact" },
    { key: "notifications", label: "Notifications",          icon: Bell,      description: "Push, SMS, email preferences" },
    { key: "location",      label: "Geographic Location",   icon: MapPin,    description: "Regional care detection & coordinates" },
    { key: "privacy",      label: "Privacy & Security",     icon: Shield,    description: "Data sharing, session, biometrics" },
    { key: "data",         label: "My Data & Export",       icon: Download,  description: "Download, delete, export options" },
  ];

  const displayName = user?.displayName || profile?.display_name || "Patient";
  const email = user?.email || profile?.email || "patient@curasync.care";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "PT";

  const handleUpdateLocation = async () => {
    setUpdatingLocation(true);
    setLocationStatus(null);
    try {
      const coords = await getBrowserLocation({ timeoutMs: 8000, enableHighAccuracy: true });
      if (coords) {
        await updateLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
        setLocationStatus("Location updated successfully!");
      } else {
        setLocationStatus("Location permission dismissed or unavailable.");
      }
    } catch {
      setLocationStatus("Failed to update location.");
    } finally {
      setUpdatingLocation(false);
    }
  };

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
            {initials}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-title-md text-text-primary">{displayName}</p>
            <p className="text-label-sm text-text-secondary">{email}</p>
            <p className="text-xs text-text-tertiary mt-0.5">Patient · Live Authenticated Account</p>
          </div>
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
                        { label: "Full name", value: displayName },
                        { label: "Email", value: email },
                        { label: "Language", value: "English" },
                        { label: "Security & Encryption", value: "End-to-End Encrypted (AES-256)" },
                        { label: "Authentication Provider", value: user?.providerData?.[0]?.providerId || "Google OAuth" },
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

                  {/* LOCATION */}
                  {key === "location" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b border-divider">
                          <span className="text-label-sm text-text-secondary">Latitude / Longitude</span>
                          <span className="text-label-sm font-medium text-text-primary">
                            {profile?.latitude && profile?.longitude
                              ? `${Number(profile.latitude).toFixed(4)}, ${Number(profile.longitude).toFixed(4)}`
                              : "Not detected"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-divider">
                          <span className="text-label-sm text-text-secondary">City / Region</span>
                          <span className="text-label-sm font-medium text-text-primary">
                            {[profile?.city, profile?.region].filter(Boolean).join(", ") || "Auto-detected from network"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-divider">
                          <span className="text-label-sm text-text-secondary">Country</span>
                          <span className="text-label-sm font-medium text-text-primary">
                            {profile?.country || "Auto-detected"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-divider last:border-0">
                          <span className="text-label-sm text-text-secondary">Last Updated</span>
                          <span className="text-label-sm font-medium text-text-primary">
                            {profile?.location_updated_at
                              ? new Date(profile.location_updated_at).toLocaleString()
                              : "Not updated yet"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          onClick={handleUpdateLocation}
                          disabled={updatingLocation}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-accent-lavender text-accent-violet text-label-sm font-semibold hover:bg-bg-lavender transition-all disabled:opacity-50"
                        >
                          {updatingLocation ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span>Detecting coordinates…</span>
                            </>
                          ) : (
                            <>
                              <MapPin size={15} />
                              <span>Update Current Location</span>
                            </>
                          )}
                        </button>
                      </div>

                      {locationStatus && (
                        <p className="text-xs text-center text-text-secondary bg-bg-lavender/50 rounded-lg py-1.5">
                          {locationStatus}
                        </p>
                      )}

                      <p className="text-xs text-text-tertiary">
                        Geographic metadata calibrates local health system references and emergency routing in full compliance with HIPAA and DPDP Act 2023.
                      </p>
                    </div>
                  )}

                  {/* PRIVACY */}
                  {key === "privacy" && (
                    <div className="space-y-3">
                      {[
                        { id: "biometricUnlock", label: "Biometric / Face ID unlock", desc: "Unlock app with Face ID or fingerprint" },
                        { id: "shareWithProviders", label: "Share data with care team", desc: "Your care team can view your health data" },
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
                          onClick={handleExportPdf}
                          disabled={exportingPdf || pdfDownloadsToday >= 5}
                          className="w-full py-2.5 rounded-lg gradient-violet text-white text-label-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          {exportingPdf ? (
                            <>
                              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                              Generating PDF Report...
                            </>
                          ) : (
                            <>
                              <Download size={14} aria-hidden="true" />
                              Download 30-Day Report PDF
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        onClick={handleExportCsv}
                        disabled={exportingCsv}
                        className="w-full flex items-center gap-3 py-3 px-3 rounded-lg border border-divider hover:bg-bg-light transition-all text-left disabled:opacity-60"
                      >
                        {exportingCsv ? (
                          <Loader2 size={16} className="text-accent-violet animate-spin flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <FileText size={16} className="text-text-secondary flex-shrink-0" aria-hidden="true" />
                        )}
                        <div className="flex-1">
                          <p className="text-label-sm font-semibold text-text-primary">
                            {exportingCsv ? "Preparing CSV Export..." : "Export all data (CSV)"}
                          </p>
                          <p className="text-xs text-text-tertiary">All readings, medications, and journal entries</p>
                        </div>
                        {exportingCsv ? (
                          <span className="text-xs text-accent-violet font-medium animate-pulse">Exporting...</span>
                        ) : (
                          <ChevronRight size={14} className="text-text-tertiary" />
                        )}
                      </button>

                      <div className="pt-2 border-t border-divider">
                        <button
                          onClick={() => {
                            setDeleteConfirmText("");
                            setDeleteError(null);
                            setShowDeleteModal(true);
                          }}
                          className="w-full flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-left group"
                        >
                          <Trash2 size={16} className="text-status-red flex-shrink-0" aria-hidden="true" />
                          <div className="flex-1">
                            <p className="text-label-sm font-semibold text-status-red">Delete my account & all data</p>
                            <p className="text-xs text-text-tertiary">Permanent — cannot be undone. DPDP right to erasure.</p>
                          </div>
                          <ChevronRight size={14} className="text-text-tertiary group-hover:text-status-red transition-colors" />
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
        <SafeSignOutButton className="w-full flex items-center justify-center gap-2 mt-5 py-3 rounded-xl border border-divider text-label-sm font-semibold text-text-secondary hover:bg-red-50 hover:text-status-red hover:border-status-red transition-all">
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </SafeSignOutButton>

        <p className="text-center text-xs text-text-tertiary mt-4">
          CuraSync v0.1.0 · HIPAA Compliant · DPDP Act 2023
        </p>

        <div className="h-8" />
      </div>

      {/* Delete Confirmation Modal (DPDP Act 2023 Right to Erasure / HIPAA Compliance) */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-bg-card rounded-2xl max-w-lg w-full border border-status-red/40 shadow-2xl overflow-hidden p-6 space-y-5 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-status-red shadow-sm flex-shrink-0">
                  <AlertTriangle size={26} className="text-status-red animate-pulse" />
                </div>
                <div>
                  <h3 id="delete-modal-title" className="text-title-md font-bold text-text-primary">
                    Delete Account & All Data
                  </h3>
                  <p className="text-xs text-status-red font-medium flex items-center gap-1.5 mt-0.5">
                    <ShieldAlert size={14} />
                    Permanent & Irreversible Right to Erasure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-bg-light transition-colors disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Warning Details Callout */}
            <div className="p-4 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-2.5 text-xs text-text-secondary">
              <p className="font-semibold text-text-primary">
                ⚠️ Warning: Deleting your account will thoroughly and permanently erase each and every detail from the database:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-text-secondary">
                <li>All blood pressure, heart rate, oxygen, & vital biometric readings</li>
                <li>Continuous & capillary glucose logs, meal context, & stats</li>
                <li>Active medication regimens, dosage schedules, & adherence history</li>
                <li>Health journal entries, symptom notes, severity, & mood logs</li>
                <li>Care team connections, doctor consultations, & tele-visit rooms</li>
                <li>Monthly PDF summary reports & emergency contact profiles</li>
                <li>Authentication credentials & active security sessions</li>
              </ul>
              <p className="font-bold text-status-red pt-1 border-t border-red-200/60 dark:border-red-900/40">
                This action is immediate and CANNOT be undone. No recovery is possible once deleted.
              </p>
            </div>

            {/* Type DELETE Input */}
            <div className="space-y-2">
              <label htmlFor="confirm-delete-input" className="block text-xs font-semibold text-text-primary">
                To confirm permanent deletion, please type{" "}
                <span className="font-mono font-bold text-status-red bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                  DELETE
                </span>{" "}
                below:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                autoComplete="off"
                disabled={isDeleting}
                className="w-full px-3.5 py-2.5 rounded-lg border border-divider focus:border-status-red focus:ring-2 focus:ring-status-red/20 text-sm font-mono tracking-wider outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* Error Message */}
            {deleteError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-status-red flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-lg border border-divider text-text-secondary text-label-sm font-semibold hover:bg-bg-light transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim() !== "DELETE" || isDeleting}
                className="px-4 py-2.5 rounded-lg bg-status-red text-white text-label-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Permanently Erasing Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Permanently Delete Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
