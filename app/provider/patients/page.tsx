"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import PatientRow from "@/components/provider/PatientRow";
import type { ProviderPatientRow } from "@/types";
import {
  Search,
  SlidersHorizontal,
  Users,
  Loader2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

type SortKey = "alertCount" | "adherenceScore" | "name" | "lastActivityDate";
type FilterStatus = "all" | "red" | "amber" | "green";

export default function ProviderPatientsPage() {
  const [allPatients, setAllPatients] = useState<ProviderPatientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch]       = useState("");
  const [sortKey, setSortKey]     = useState<SortKey>("alertCount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filter, setFilter]       = useState<FilterStatus>("all");

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

  return (
    <AppShell role="provider">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Patient Panel Management
            </h1>
            <p className="text-body-md text-text-secondary mt-1">
              Active Patient Roster · {allPatients.length} registered individuals
            </p>
          </div>
          <Link
            href="/provider/invite"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl gradient-violet text-white text-label-sm font-semibold shadow-card hover:opacity-90 transition-opacity self-start sm:self-auto"
          >
            <UserPlus size={15} />
            <span>Invite New Patient</span>
          </Link>
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

        {/* Patient Table */}
        <div className="bg-bg-card rounded-2xl border border-divider shadow-card overflow-hidden">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 size={24} className="animate-spin mx-auto text-accent-violet" />
              <p className="text-xs text-text-secondary">Loading patient records…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users size={32} className="mx-auto text-text-tertiary opacity-40" />
              <p className="text-sm font-semibold text-text-primary">No patients found</p>
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
