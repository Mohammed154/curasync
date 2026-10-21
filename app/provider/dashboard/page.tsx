"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import PatientRow from "@/components/provider/PatientRow";
import type { ProviderPatientRow } from "@/types";
import {
  Search,
  SlidersHorizontal,
  Users,
  AlertTriangle,
  TrendingUp,
  Download,
  Loader2,
  UserPlus,
  Bell,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { requestPdfExport } from "@/hooks/useApi";

type SortKey = "alertCount" | "adherenceScore" | "name" | "lastActivityDate";
type FilterStatus = "all" | "red" | "amber" | "green";

export default function ProviderDashboardPage() {
  const [allPatients, setAllPatients] = useState<ProviderPatientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch]       = useState("");
  const [sortKey, setSortKey]     = useState<SortKey>("alertCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filter, setFilter]       = useState<FilterStatus>("all");
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    fetch("/api/v1/patients")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data)) {
          setAllPatients(json.data);
        } else {
          setAllPatients([]);
        }
      })
      .catch(() => {
        setAllPatients([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      await requestPdfExport();
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Failed to export PDF panel summary. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  const filtered = useMemo(() => {
    let list = [...allPatients];

    if (filter !== "all") {
      list = list.filter((p) => p.alertStatus === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

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

  const redCount   = allPatients.filter((p) => p.alertStatus === "red").length;
  const amberCount = allPatients.filter((p) => p.alertStatus === "amber").length;
  const greenCount = allPatients.filter((p) => p.alertStatus === "green").length;
  const avgAdherence = allPatients.length > 0
    ? Math.round(allPatients.reduce((sum, p) => sum + (p.adherenceScore || 0), 0) / allPatients.length)
    : 0;

  return (
    <AppShell role="provider">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Provider Clinical Dashboard
            </h1>
            <p className="text-body-md text-text-secondary mt-1">
              Multi-Patient Care Panel · {allPatients.length} active patients assigned
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/provider/invite"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-90 transition-opacity"
            >
              <UserPlus size={15} />
              <span>Invite Patient</span>
            </Link>
            <Link
              href="/provider/alerts"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:text-accent-violet hover:border-accent-lavender transition-all shadow-card"
            >
              <Bell size={15} />
              <span>Active Alerts ({redCount + amberCount})</span>
            </Link>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-divider bg-bg-card text-label-sm font-semibold text-text-secondary hover:text-accent-violet hover:border-accent-lavender disabled:opacity-50 transition-all shadow-card cursor-pointer"
            >
              {exportingPdf ? (
                <>
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span className="hidden sm:inline">Export PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Clinical Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-bg-card p-4 rounded-2xl border border-divider shadow-xs">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Patients</span>
              <Users size={16} className="text-accent-violet" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{allPatients.length}</p>
            <p className="text-xs text-text-tertiary mt-1">Under clinical management</p>
          </div>

          <div
            onClick={() => setFilter(filter === "red" ? "all" : "red")}
            className={clsx(
              "p-4 rounded-2xl border shadow-xs cursor-pointer transition-all",
              filter === "red" ? "ring-2 ring-rose-500 bg-rose-50/80 dark:bg-rose-950/40 border-rose-300" : "bg-bg-card border-divider hover:border-rose-300"
            )}
          >
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Critical (Red)</span>
              <AlertTriangle size={16} />
            </div>
            <p className="text-2xl font-bold text-rose-600">{redCount}</p>
            <p className="text-xs text-rose-700/70 mt-1">Requires immediate intervention</p>
          </div>

          <div
            onClick={() => setFilter(filter === "amber" ? "all" : "amber")}
            className={clsx(
              "p-4 rounded-2xl border shadow-xs cursor-pointer transition-all",
              filter === "amber" ? "ring-2 ring-amber-500 bg-amber-50/80 dark:bg-amber-950/40 border-amber-300" : "bg-bg-card border-divider hover:border-amber-300"
            )}
          >
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Warning (Amber)</span>
              <AlertTriangle size={16} />
            </div>
            <p className="text-2xl font-bold text-amber-600">{amberCount}</p>
            <p className="text-xs text-amber-700/70 mt-1">Threshold excursions detected</p>
          </div>

          <div className="bg-bg-card p-4 rounded-2xl border border-divider shadow-xs">
            <div className="flex items-center justify-between text-text-secondary mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Adherence</span>
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{avgAdherence}%</p>
            <p className="text-xs text-text-tertiary mt-1">{greenCount} patients fully controlled</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bg-card p-3 rounded-2xl border border-divider shadow-xs">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search patients by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-light/70 border border-divider rounded-xl text-sm focus:outline-none focus:border-accent-violet transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-medium text-text-tertiary whitespace-nowrap hidden md:inline">Filter:</span>
            {(["all", "red", "amber", "green"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer",
                  filter === s
                    ? "bg-accent-violet text-white shadow-xs"
                    : "bg-bg-light text-text-secondary hover:text-text-primary"
                )}
              >
                {s}
              </button>
            ))}

            <div className="h-4 w-px bg-divider mx-1" />

            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <SlidersHorizontal size={14} className="text-text-tertiary" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-bg-light border border-divider rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-accent-violet"
              >
                <option value="alertCount">Alerts</option>
                <option value="adherenceScore">Adherence</option>
                <option value="name">Name</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="p-1 rounded-md bg-bg-light border border-divider hover:bg-bg-lavender/50 text-xs font-bold"
                title="Toggle sort direction"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>

        {/* Patient Rows Table */}
        <div className="bg-bg-card rounded-2xl border border-divider shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-divider bg-bg-light/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
              Assigned Patients ({filtered.length})
            </span>
            <span className="text-xs text-text-tertiary">
              Click any patient to review biometrics & custom threshold overrides
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 size={24} className="animate-spin mx-auto text-accent-violet" />
              <p className="text-xs text-text-secondary">Loading patient records from database…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users size={32} className="mx-auto text-text-tertiary opacity-40" />
              <p className="text-sm font-semibold text-text-primary">No patients match the selected filter</p>
              <p className="text-xs text-text-tertiary max-w-sm mx-auto">
                Try clearing your search query or switching the status filter to view all assigned individuals.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-divider">
              {filtered.map((patient) => (
                <PatientRow
                  key={patient.patientId}
                  patient={patient}
                  onClick={() => {
                    window.location.href = `/provider/patient/${patient.patientId}`;
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
