"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Stethoscope, Pill, BookOpen, Bell,
  Settings, LogOut, Menu, X, Heart, ChevronDown, MapPin,
  MessageSquare, CalendarDays, Watch, UserPlus, Droplets,
  Check, CheckCheck
} from "lucide-react";
import { clsx } from "clsx";
import { severityBg, severityColor, severityIcon } from "@/lib/alerts";
import { getMockDashboardData } from "@/lib/mock-data";
import type { Alert } from "@/types";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Alert[]>([]);

  useEffect(() => {
    // Load alerts from mock data
    const data = getMockDashboardData();
    setNotifications(data.activeAlerts);
  }, []);

  const activeCount = notifications.filter((n) => n.status === "active").length;

  const handleMarkAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, status: "acknowledged" as const }))
    );
  };

  const handleAcknowledge = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "acknowledged" as const } : n))
    );
  };

  const pathname = usePathname();

  // Close popovers on page navigation
  useEffect(() => {
    setProfileOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  const closeProfile = () => setTimeout(() => setProfileOpen(false), 10);
  const closeNotifications = () => setTimeout(() => setNotificationsOpen(false), 10);

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
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center gradient-violet"
            >
              <Heart size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-title-md text-text-primary tracking-tight">
              CuraSync
            </span>
          </Link>
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

            <div className="flex items-center gap-2 relative">
              {/* Click-outside backdrop */}
              {(notificationsOpen || profileOpen) && (
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => {
                    setNotificationsOpen(false);
                    setProfileOpen(false);
                  }}
                />
              )}

              {/* Live sync indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green-bg">
                <span className="status-dot bg-status-green animate-pulse-slow" />
                <span className="text-xs font-medium text-status-green">Live</span>
              </div>

              {/* Bell */}
              <div className={clsx("relative", notificationsOpen && "z-50")}>
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setProfileOpen(false);
                  }}
                  className={clsx(
                    "relative p-2 rounded-lg hover:bg-bg-lavender text-text-secondary hover:text-text-primary transition-all",
                    notificationsOpen && "bg-bg-lavender text-text-primary"
                  )}
                  aria-label={`${activeCount} notifications`}
                >
                  <Bell size={18} strokeWidth={2} />
                  {activeCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-red rounded-full animate-pulse-slow" />
                  )}
                </button>

                {/* Notifications Popover */}
                {notificationsOpen && (
                  <div
                    className="absolute right-0 lg:right-[-40px] top-11 mt-1 w-80 sm:w-96 bg-bg-card rounded-xl border border-divider shadow-lg z-50 overflow-hidden animate-fade-in"
                    style={{ boxShadow: "0 10px 30px rgba(108,92,231,0.12)" }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-divider bg-bg-lavender/30">
                      <span className="font-bold text-label-sm text-text-primary">Notifications</span>
                      {activeCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-accent-violet hover:text-accent-violet/85 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto divide-y divide-divider">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
                          <Bell size={24} className="opacity-30 mb-2" />
                          <p className="text-xs font-medium">No new notifications</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const isActive = n.status === "active";
                          return (
                            <div
                              key={n.id}
                              className={clsx(
                                "p-3 flex items-start gap-3 transition-colors hover:bg-bg-lavender/10 relative",
                                !isActive && "opacity-60"
                              )}
                            >
                              <span className="text-base mt-0.5" aria-hidden="true">
                                {severityIcon(n.severity)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={clsx(
                                  "text-xs text-text-primary leading-snug",
                                  isActive ? "font-semibold" : "font-normal"
                                )}>
                                  {n.message}
                                </p>
                                <span className="text-[10px] text-text-tertiary mt-1 block">
                                  {new Date(n.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {isActive && (
                                <button
                                  onClick={(e) => handleAcknowledge(e, n.id)}
                                  className="p-1 rounded hover:bg-bg-lavender text-text-tertiary hover:text-status-green transition-colors flex-shrink-0"
                                  title="Mark as read"
                                >
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-divider p-2.5 bg-bg-lavender/5 text-center">
                      <Link
                        href="/alerts"
                        onClick={closeNotifications}
                        className="text-xs font-bold text-accent-violet hover:underline block py-0.5"
                      >
                        View all alerts
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className={clsx("relative", profileOpen && "z-50")}>
                <div
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    setNotificationsOpen(false);
                  }}
                  className={clsx(
                    "w-8 h-8 rounded-full gradient-violet flex items-center justify-center text-white font-semibold text-xs cursor-pointer select-none transition-all hover:opacity-90 active:scale-95 relative",
                    profileOpen && "ring-2 ring-accent-lavender"
                  )}
                >
                  AM
                </div>

                {/* Profile Popover */}
                {profileOpen && (
                  <div
                    className="absolute right-0 top-11 mt-1 w-64 bg-bg-card rounded-xl border border-divider shadow-lg z-50 overflow-hidden animate-fade-in"
                    style={{ boxShadow: "0 10px 30px rgba(108,92,231,0.12)" }}
                  >
                    <div className="p-4 border-b border-divider flex items-center gap-3 bg-bg-lavender/25">
                      <div className="w-10 h-10 rounded-full gradient-violet flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        AM
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-label-sm text-text-primary truncate">Arjun Mehta</p>
                        <p className="text-[11px] text-text-tertiary truncate">arjun.mehta@outlook.com</p>
                        <span className="text-[10px] font-bold text-accent-violet uppercase bg-bg-lavender/50 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {role}
                        </span>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                      <Link
                        href="/settings"
                        onClick={closeProfile}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-secondary hover:bg-bg-lavender hover:text-text-primary transition-all text-xs font-medium"
                      >
                        <Settings size={15} className="text-text-tertiary" />
                        Settings
                      </Link>
                      <Link
                        href="/conditions"
                        onClick={closeProfile}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-secondary hover:bg-bg-lavender hover:text-text-primary transition-all text-xs font-medium"
                      >
                        <Heart size={15} className="text-text-tertiary" />
                        My Conditions
                      </Link>
                      <Link
                        href="/wearables"
                        onClick={closeProfile}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-secondary hover:bg-bg-lavender hover:text-text-primary transition-all text-xs font-medium"
                      >
                        <Watch size={15} className="text-text-tertiary" />
                        Wearables
                      </Link>
                    </div>

                    <div className="border-t border-divider p-1.5 bg-status-red-bg/10">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          alert("Signing out... (Demo Mode)");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-status-red hover:bg-status-red-bg transition-all text-xs font-semibold"
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
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
