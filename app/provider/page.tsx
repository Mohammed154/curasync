"use client";

import React, { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import PatientRow from "@/components/provider/PatientRow";
import { getMockProviderPanel } from "@/lib/mock-data";
import type { ProviderPatientRow } from "@/types";
import {
  Search,
  SlidersHorizontal,
  Users,
  AlertTriangle,
  TrendingUp,
  Download,
} from "lucide-react";
import { clsx } from "clsx";

type SortKey = "alertCount" | "adherenceScore" | "name" | "lastActivityDate";
type FilterStatus = "all" | "red" | "amber" | "green";

export default function ProviderDashboardPage() {
  const allPatients = useMemo(() => getMockProviderPanel(), []);

  const [search, setSearch]       = useState("");
  const [sortKey, setSortKey]     = useState<SortKey>("alertCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filter, setFilter]       = useState<FilterStatus>("all");

  const filtered = useMemo(() => {
    let list = [...allPatients];

    // Filter by status
    if (filter !== "all") {
      list = list.filter((p) => p.alertStatus === filter);
    }

    // Search by name
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Sort
    list.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "name") {
        av = a.name;
        bv = b.name;
        return sortOrder === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
      av = a[sortKey] as number;
      bv = b[sortKey] as number;
      return sortOrder === "asc" ? av - bv : bv - av;
    });

    return list;
  }, [allPatients, search, sortKey, sortOrder, filter]);

  // Stats summary
  const redCount   = allPatients.filter((p) => p.alertStatus === "red").length;
  const amberCount = allPatients.filter((p) => p.alertStatus === "amber").length;
  const avgAdherence = Math.round(
    allPatients.reduce((s, p) => s + p.adherenceScore, 0) / allPatients.length
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const FILTER_OPTS: { value: FilterStatus; label: string; color: string; bg: string }[] = [
    { value: "all",   label: "All Patients",    color: "#4A4A68", bg: "#F0EFF8" },
    { value: "red",   label: "Urgent",          color: "#D63031", bg: "#FDECEA" },
    { value: "amber", label: "Monitor",         color: "#F39C12", bg: "#FEF9E7" },
    { value: "green", label: "Stable",          color: "#00B894", bg: "#E8F8F5" },
  ];

  return (
    <AppShell role="provider" alertCount={redCount}>
      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="font-bold text-display text-text-primary leading-tight">
              Patient Panel
            </h1>
            <p className="text-body-md text-text-secondary mt-1">
              Dr. Priya · {allPatients.length} patients assigned
            </p>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:text-accent-violet hover:border-accent-lavender transition-all shadow-card">
            <Download size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>

        {/* ── Summary stat cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Total Patients",
              value: allPatients.length,
              icon: <Users size={16} />,
              color: "#6C5CE7",
              bg: "#F0EFF8",
            },
            {
              label: "Urgent",
              value: redCount,
              icon: <AlertTriangle size={16} />,
              color: "#D63031",
              bg: "#FDECEA",
            },
            {
              label: "Monitoring",
              value: amberCount,
              icon: <SlidersHorizontal size={16} />,
              color: "#F39C12",
              bg: "#FEF9E7",
            },
            {
              label: "Avg. Adherence",
              value: `${avgAdherence}%`,
              icon: <TrendingUp size={16} />,
              color: "#00B894",
              bg: "#E8F8F5",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-bg-card rounded-lg p-4 shadow-card card-enter flex items-center gap-3"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: stat.bg, color: stat.color }}
                aria-hidden="true"
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-text-tertiary">{stat.label}</p>
                <p
                  className="font-bold metric-value"
                  style={{ fontSize: "20px", color: stat.color, lineHeight: "1.2" }}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters + Search ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search patients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-bg-card border border-divider text-label-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-lavender/40 focus:border-accent-violet transition-all shadow-card"
              aria-label="Search patients"
            />
          </div>

          {/* Status filter buttons */}
          <div className="flex gap-2" role="group" aria-label="Filter by alert status">
            {FILTER_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-label-sm font-semibold transition-all whitespace-nowrap",
                  filter === opt.value
                    ? "shadow-sm"
                    : "bg-bg-card border border-divider text-text-secondary hover:border-accent-lavender"
                )}
                style={
                  filter === opt.value
                    ? { background: opt.bg, color: opt.color, borderColor: opt.color + "44", borderWidth: "1px", borderStyle: "solid" }
                    : undefined
                }
                aria-pressed={filter === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Patient table ────────────────────────────────────────────────── */}
        <div className="bg-bg-card rounded-xl shadow-card overflow-hidden card-enter">
          <table className="w-full" role="table" aria-label="Patient panel">
            <thead>
              <tr className="border-b border-divider bg-bg-light/60">
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort("name")}
                    className="text-xs font-semibold text-text-tertiary uppercase tracking-wider hover:text-accent-violet transition-colors flex items-center gap-1"
                  >
                    Patient
                    {sortKey === "name" && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left hidden md:table-cell">
                  <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    Conditions
                  </span>
                </th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">
                  <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                    Last Active
                  </span>
                </th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">
                  <button
                    onClick={() => toggleSort("adherenceScore")}
                    className="text-xs font-semibold text-text-tertiary uppercase tracking-wider hover:text-accent-violet transition-colors flex items-center gap-1"
                  >
                    Adherence
                    {sortKey === "adherenceScore" && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort("alertCount")}
                    className="text-xs font-semibold text-text-tertiary uppercase tracking-wider hover:text-accent-violet transition-colors flex items-center gap-1"
                  >
                    Status
                    {sortKey === "alertCount" && (
                      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-tertiary text-label-sm">
                    No patients match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((patient) => (
                  <PatientRow
                    key={patient.patientId}
                    patient={patient}
                    onClick={() => {
                      window.location.href = `/provider/patient/${patient.patientId}`;
                    }}
                  />
                ))
              )}
            </tbody>
          </table>

          <div className="px-4 py-3 border-t border-divider flex items-center justify-between">
            <p className="text-xs text-text-tertiary">
              Showing {filtered.length} of {allPatients.length} patients
            </p>
            <p className="text-xs text-text-tertiary">
              Sorted by: <span className="font-semibold text-accent-violet">{sortKey}</span>{" "}
              {sortOrder === "desc" ? "↓" : "↑"}
            </p>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </AppShell>
  );
}
