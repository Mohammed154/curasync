"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Stethoscope, Pill, BookOpen, Bell,
  Settings, LogOut, Menu, X, Heart, ChevronDown, MapPin,
  MessageSquare, CalendarDays, Watch, UserPlus, Droplets,
} from "lucide-react";
import { clsx } from "clsx";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const PATIENT_NAV: NavItem[] = [
  { label: "Dashboard",        href: "/dashboard",   icon: LayoutDashboard },
  { label: "Conditions",       href: "/conditions",  icon: Heart },
  { label: "Glucose Tracker",  href: "/glucose",     icon: Droplets },
  { label: "Medications",      href: "/medications", icon: Pill },
  { label: "Journal",          href: "/journal",     icon: BookOpen },
  { label: "Calendar",         href: "/calendar",    icon: CalendarDays },
  { label: "Wearables",        href: "/wearables",   icon: Watch },
  { label: "Messages",         href: "/messages",    icon: MessageSquare },
  { label: "Alerts",           href: "/alerts",      icon: Bell },
];

const PROVIDER_NAV: NavItem[] = [
  { label: "Patient Panel",  href: "/provider",         icon: Stethoscope },
  { label: "Invite Patient", href: "/provider/invite",  icon: UserPlus },
  { label: "Alerts",         href: "/alerts",           icon: Bell },
  { label: "Settings",       href: "/settings",         icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  role?: "patient" | "provider";
  alertCount?: number;
}

export default function AppShell({
  children,
  role = "patient",
  alertCount = 0,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = role === "provider" ? PROVIDER_NAV : PATIENT_NAV;

  return (
    <div className="min-h-screen flex bg-bg-light">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-64 bg-bg-card border-r border-divider z-50",
          "flex flex-col transition-transform duration-300 ease-out",
          "lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ boxShadow: "4px 0 24px rgba(108,92,231,0.06)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-divider">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center gradient-violet"
            >
              <Heart size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-title-md text-text-primary tracking-tight">
              CuraSync
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-text-tertiary hover:text-text-primary transition-colors p-1"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-divider">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-lavender">
            <div
              className="w-9 h-9 rounded-full gradient-violet flex items-center justify-center text-white font-semibold text-label-sm flex-shrink-0"
            >
              AM
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-label-sm text-text-primary truncate">
                Arjun Mehta
              </p>
              <p className="text-xs text-text-tertiary truncate capitalize">
                {role} · Mumbai
              </p>
            </div>
            <ChevronDown size={14} className="text-text-tertiary flex-shrink-0 ml-auto" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest px-3 mb-3">
            {role === "provider" ? "Provider Tools" : "My Health"}
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                      isActive
                        ? "bg-accent-violet text-white shadow-sm"
                        : "text-text-secondary hover:bg-bg-lavender hover:text-text-primary"
                    )}
                  >
                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={clsx(
                        "transition-colors flex-shrink-0",
                        isActive ? "text-white" : "text-text-tertiary group-hover:text-accent-violet"
                      )}
                    />
                    <span className="font-medium text-label-sm">{item.label}</span>
                    {item.label === "Alerts" && alertCount > 0 && (
                      <span
                        className={clsx(
                          "ml-auto text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-status-red text-white"
                        )}
                      >
                        {alertCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* AI Doctor CTA */}
          {role === "patient" && (
            <div className="mt-4 px-3">
              <Link
                href="/ai-doctor"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white text-label-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ background: "#0A0A0A" }}
              >
                <span className="text-base" aria-hidden="true">✨</span>
                Ask AI Doctor
                <span className="ml-auto text-xs text-white/40">Beta</span>
              </Link>
            </div>
          )}

          {/* Role switcher (MVP demo only) */}
          <div className="mt-6 pt-4 border-t border-divider">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-widest px-3 mb-3">
              Demo
            </p>
            <Link
              href={role === "patient" ? "/provider" : "/dashboard"}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-bg-lavender hover:text-accent-violet transition-all text-label-sm font-medium"
            >
              <Stethoscope size={17} strokeWidth={2} className="text-text-tertiary" />
              Switch to {role === "patient" ? "Provider" : "Patient"} view
            </Link>
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-divider space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-bg-lavender transition-all text-label-sm font-medium"
          >
            <Settings size={17} strokeWidth={2} className="text-text-tertiary" />
            Settings
          </Link>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:bg-status-red-bg hover:text-status-red transition-all text-label-sm font-medium">
            <LogOut size={17} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 bg-bg-card/80 glass border-b border-divider"
          style={{ height: "60px" }}
        >
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-bg-lavender"
                aria-label="Open sidebar"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-1.5 text-label-sm text-text-secondary">
                <MapPin size={13} className="text-accent-violet" />
                <span className="font-semibold text-text-primary">Mumbai</span>
                <span className="text-divider mx-1">·</span>
                <span className="text-text-tertiary">400 001</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Live sync indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green-bg">
                <span className="status-dot bg-status-green animate-pulse-slow" />
                <span className="text-xs font-medium text-status-green">Live</span>
              </div>

              {/* Bell */}
              <button
                className="relative p-2 rounded-lg hover:bg-bg-lavender text-text-secondary hover:text-text-primary transition-all"
                aria-label={`${alertCount} notifications`}
              >
                <Bell size={18} strokeWidth={2} />
                {alertCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-red rounded-full" />
                )}
              </button>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full gradient-violet flex items-center justify-center text-white font-semibold text-xs cursor-pointer">
                AM
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
