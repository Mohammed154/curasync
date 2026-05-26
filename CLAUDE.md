# CLAUDE.md — CuraSync Architecture Reference

> **For AI subagents:** Read this before touching any file. It documents the complete, current state of the codebase — what's done, what's stubbed, and how all pieces connect.

---

## Project Identity

| Field | Value |
|---|---|
| Product | CuraSync — Multi-Chronic Disease Health Monitoring Platform |
| Stack | Next.js 14 App Router · TypeScript strict · Tailwind CSS |
| DB | Supabase PostgreSQL + TimescaleDB (Drizzle ORM) |
| Auth | Clerk v7 (async `await auth()`) |
| Deploy | Vercel (region: bom1 Mumbai) |
| Compliance | HIPAA + DPDP Act 2023 |
| Tests | Vitest — 80 tests passing |

---

## Non-Negotiable Rules

1. **`await auth()`** — Clerk v7 is async. Never call `auth()` without await.
2. **No `any` types** — TypeScript strict mode enforced (`noImplicitAny: true`).
3. **No hardcoded colours** — use `lib/design-tokens.ts` or Tailwind tokens only.
4. **All API routes must call `getPatientAuth()` or `getProviderAuth()`** before touching DB.
5. **All PHI access must call `writeAuditLog()`** (fire-and-forget is fine).
6. **Rate limits via Upstash** — never in-memory Maps (breaks serverless).
7. **Readings go to TimescaleDB hypertable** — the `readings` table is partitioned on `recorded_at`.

---

## Directory Structure

```
curasync/
├── app/
│   ├── api/v1/
│   │   ├── ai/route.ts          ← Claude proxy (keeps API key server-side)
│   │   ├── alerts/route.ts      ← GET alerts, PATCH acknowledge/dismiss
│   │   ├── export/route.ts      ← PDF export (5/day rate limit)
│   │   ├── journal/route.ts     ← CRUD + 5/day limit + 2-day edit window
│   │   ├── medications/route.ts ← Medication logs
│   │   ├── messages/route.ts    ← Patient-provider messaging
│   │   ├── ocr/route.ts         ← Google Cloud Vision lab report OCR
│   │   ├── onboarding/route.ts  ← Profile creation (upsert)
│   │   ├── patients/route.ts    ← Provider panel + real adherence score
│   │   ├── readings/route.ts    ← Biometric ingestion + alert evaluation
│   │   └── sync/route.ts        ← Wearable webhook (HMAC-verified)
│   ├── ai-doctor/               ← Full dark Claude streaming chat
│   ├── alerts/                  ← Alert history + DND scheduler
│   ├── calendar/                ← 365-day range selector + stats
│   ├── conditions/[id]/         ← Per-condition detail + reference ranges
│   ├── conditions/              ← All conditions list
│   ├── dashboard/               ← Patient dashboard (live refresh + FAB)
│   ├── journal/                 ← Symptom logger + trends
│   ├── medications/             ← Medication manager + 30-day history
│   ├── messages/                ← Secure messaging thread
│   ├── onboarding/              ← 5-step onboarding (saves to DB)
│   ├── pdf-preview/             ← Server-rendered A4 report for Puppeteer
│   ├── provider/
│   │   ├── invite/              ← Patient invite code generation
│   │   └── patient/[id]/        ← Individual patient view + thresholds
│   ├── provider/                ← Clinical panel (sort/filter)
│   ├── settings/                ← Profile, notifications, privacy, data
│   └── wearables/               ← Device management + sync
│
├── components/
│   ├── charts/GlucoseChart.tsx          ← Recharts 24h area chart
│   ├── dashboard/
│   │   ├── UpcomingRemindersStrip.tsx   ← Next 3 doses
│   │   └── WeeklySummaryCard.tsx        ← Auto-generated narrative
│   ├── layout/AppShell.tsx              ← Sidebar + topbar
│   ├── modals/LogReadingModal.tsx       ← 2-tap reading entry
│   ├── patient/
│   │   ├── AdherenceStreakCard.tsx
│   │   ├── ConditionTile.tsx
│   │   ├── MedicationCard.tsx
│   │   └── VitalCard.tsx
│   ├── provider/
│   │   ├── AlertThresholdCustomizer.tsx ← Per-patient threshold overrides
│   │   ├── PatientRow.tsx
│   │   └── SymptomHeatmap.tsx
│   └── ui/AlertBanner.tsx
│
├── hooks/
│   ├── useApi.ts               ← SWR hooks for every API route (use these, not mock data)
│   └── useRealTimeReadings.ts  ← Polling hook (kept for dashboard live refresh)
│
├── lib/
│   ├── alerts.ts               ← Rule-based threshold engine (10 rules)
│   ├── audit.ts                ← HIPAA PHI access logger → audit_log table
│   ├── auth.ts                 ← Clerk v7 getPatientAuth / getProviderAuth
│   ├── db/
│   │   ├── index.ts            ← Drizzle client (singleton, serverless-safe)
│   │   └── schema.ts           ← All table definitions + TypeScript types
│   ├── design-tokens.ts        ← All colours/spacing (Design Doc §11)
│   ├── env.ts                  ← Startup env validation
│   ├── i18n.ts                 ← Locale stub (Phase 2: Hindi + Gujarati)
│   ├── mock-data.ts            ← Dev fallback data (replace with useApi hooks)
│   ├── ocr.ts                  ← Google Cloud Vision lab report extraction
│   └── ratelimit.ts            ← Upstash Redis limiters
│
├── types/index.ts              ← All domain TypeScript types
├── middleware.ts               ← Clerk v7 middleware (async protect())
├── drizzle.config.ts           ← drizzle-kit config (uses DATABASE_URL)
├── vitest.config.ts            ← Test config
├── vercel.json                 ← Vercel deploy config (region: bom1)
└── .github/
    ├── workflows/ci.yml        ← type-check + test + deploy on push to main
    ├── workflows/migrate.yml   ← drizzle-kit push on schema change (gated)
    ├── GITHUB_SECRETS.md       ← Exact secrets to add in GitHub repo settings
    └── PUSH_TO_GITHUB.md       ← Git commands to push the repo
```

---

## Clerk Auth Pattern (CRITICAL — v7 is async)

```typescript
// ✅ CORRECT — Clerk v7
import { auth } from "@clerk/nextjs/server";
const session = await auth();         // must await
const userId = session.userId;
const claims = session.sessionClaims;

// ❌ WRONG — this is v5/v6 style, will throw in v7
const { userId } = auth();
```

**Always use the helpers in `lib/auth.ts`, not raw `auth()` calls in routes:**

```typescript
import { getPatientAuth, isNextResponse } from "@/lib/auth";
const authCtx = await getPatientAuth(request);
if (isNextResponse(authCtx)) return authCtx; // 401 or 403
// authCtx.patientId  — Supabase UUID
// authCtx.clerkUserId — Clerk user ID
// authCtx.role       — "patient" | "provider" | "admin"
```

---

## Database Pattern

```typescript
import { db, readings, patientProfiles } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

// Always cast UUID strings to the Drizzle UUID type:
const patId = authCtx.patientId as `${string}-${string}-${string}-${string}-${string}`;

const rows = await db.select()
  .from(readings)
  .where(eq(readings.patientId, patId))
  .orderBy(desc(readings.recordedAt))
  .limit(100);
```

**Connection strings:**
- `DATABASE_URL` (port 6543, PgBouncer) — used by the app at runtime
- `DATABASE_URL_DIRECT` (port 5432) — used by `drizzle-kit push` only

---

## Mock Data → Production Migration

Pages still using mock data for display (Supabase is wired for writes):

| Page | Currently uses | Replace with |
|---|---|---|
| `app/dashboard/page.tsx` | `getMockDashboardData()` | `useReadings()`, `useAlerts()`, `useMedications()` from `hooks/useApi.ts` |
| `app/provider/page.tsx` | `getMockProviderPanel()` | `usePatientPanel()` from `hooks/useApi.ts` |
| `app/journal/page.tsx` | `MOCK_ENTRIES` | `useJournalEntries()` |
| `app/messages/page.tsx` | `MOCK_THREAD` | `useMessages(threadId)` |
| `app/conditions/[id]/page.tsx` | `getMockDashboardData()` | `useReadings(type)` |

**Pattern to follow:**
```typescript
const { data, error, isLoading } = useReadings("blood_glucose", 24);
```

---

## API Quick Reference

| Method | Route | Auth | Rate Limit |
|---|---|---|---|
| POST | `/api/v1/readings` | patient | 1000/min |
| GET | `/api/v1/readings` | patient | — |
| GET/PATCH | `/api/v1/alerts` | patient | — |
| POST/GET | `/api/v1/medications` | patient | — |
| POST/PATCH/GET | `/api/v1/journal` | patient | 5/24h |
| POST/PATCH/GET | `/api/v1/messages` | patient | — |
| GET | `/api/v1/patients` | **provider** | — |
| GET | `/api/v1/export` | patient | 5/24h |
| POST | `/api/v1/ocr` | patient | — |
| POST/GET | `/api/v1/onboarding` | clerk session | — |
| POST | `/api/v1/ai` | patient | 100/hr |
| POST/GET | `/api/v1/sync` | webhook signature | — |

---

## GitHub Actions Secrets Required

See `.github/GITHUB_SECRETS.md` for the complete list.
Minimum to make CI pass: `VERCEL_TOKEN`, `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

---

## What Requires External Infrastructure (not in this repo)

| Feature | Service | Status |
|---|---|---|
| Auth sessions | Clerk | ✅ Wired (needs keys in .env) |
| Database reads | Supabase | ✅ Wired (needs DATABASE_URL) |
| Rate limiting | Upstash Redis | ✅ Wired (gracefully disabled without keys) |
| Email | Resend | Stub in lib/ — implement `sendWeeklyDigest()` |
| SMS alerts | Twilio | Stub — call after `evaluateReading()` in readings route |
| PDF generation | AWS Lambda + Puppeteer | Stub in export route — implement `invokePdfLambda()` |
| OCR | Google Cloud Vision | ✅ Wired (needs GOOGLE_APPLICATION_CREDENTIALS_JSON) |
| AI Doctor | Anthropic | ✅ Wired via `/api/v1/ai` proxy (needs ANTHROPIC_API_KEY) |
| CI/CD | GitHub Actions + Vercel | ✅ `.github/workflows/` ready (needs secrets) |
| Wearable OAuth | Fitbit/Garmin | Stub — implement OAuth callback routes |

---

*Last updated: May 2026 — final MVP scaffold*
