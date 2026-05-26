# CuraSync — Smart Health Monitoring Platform

> **MVP Scaffold · May 2026**  
> Next.js 14 · TypeScript strict · Supabase · Clerk v7 · Tailwind CSS · Vercel

---

## Quick Start (Local Dev)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Copy env template and fill in your values
cp .env.local .env.local.bak   # already has placeholders

# 3. Start dev server (works with mock data even without DB credentials)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → auto-redirects to `/dashboard`

---

## All Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build (runs env validation first) |
| `npm run start` | Start production server after build |
| `npm run type-check` | TypeScript strict check |
| `npm test` | Run 80 unit tests (Vitest) |
| `npm run test:coverage` | Tests with coverage report |
| `npm run lint` | ESLint check |
| `npm run db:push` | Push Drizzle schema to Supabase (uses DATABASE_URL_DIRECT) |
| `npm run db:studio` | Open Drizzle Studio GUI for the DB |
| `npm run db:generate` | Generate SQL migration files |

---

## Pages

| Route | Description |
|---|---|
| `/dashboard` | Patient dashboard — live vitals, medications, alerts, AI banner |
| `/conditions` | All conditions list with drill-down |
| `/conditions/[id]` | Per-condition metrics, chart, reference ranges |
| `/medications` | Medication manager + 30-day adherence chart |
| `/journal` | Symptom journal + frequency trends |
| `/calendar` | 365-day health calendar with 30-day range selector |
| `/alerts` | Alert history + DND scheduler |
| `/messages` | Secure patient-provider messaging |
| `/wearables` | Device management — Apple Watch, Fitbit, Garmin, BLE |
| `/ai-doctor` | AI Doctor chat (Claude Sonnet via server-side proxy) |
| `/settings` | Profile, notifications, privacy, data export |
| `/onboarding` | 5-step patient onboarding (saves to Supabase) |
| `/pdf-preview` | Server-rendered clinical report for Puppeteer PDF capture |
| `/provider` | Provider patient panel (sort, filter, search) |
| `/provider/patient/[id]` | Individual patient — timeline, labs, symptoms, thresholds |
| `/provider/invite` | Generate patient invite codes |

---

## API Routes

All under `/api/v1/`. All routes require Clerk session auth except `/api/v1/sync` (webhook).

```bash
# Test locally (get a Clerk session token from browser DevTools → Application → Cookies)
curl http://localhost:3000/api/v1/readings \
  -H "Cookie: __session=YOUR_CLERK_SESSION_COOKIE"

# Post a reading
curl -X POST http://localhost:3000/api/v1/readings \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=..." \
  -d '{"type":"blood_glucose","value":142,"unit":"mg/dL","source":"manual","recordedAt":"2026-05-07T09:00:00Z"}'
```

---

## Connect to Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Enable TimescaleDB: SQL Editor → `CREATE EXTENSION IF NOT EXISTS timescaledb;`
3. Run the schema: copy the SQL from the infrastructure guide (see `.github/GITHUB_SECRETS.md`)
4. Get credentials: Settings → API → copy URL + anon key + service_role key
5. Add to `.env.local`:

```env
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_URL_DIRECT=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

6. Push schema: `npm run db:push`

---

## Connect to Clerk

1. Create app at [clerk.com](https://clerk.com) → copy keys
2. Add to `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

3. Set user role in Clerk Dashboard → Users → [user] → Public Metadata:
```json
{ "role": "patient" }
```

---

## Push to GitHub + Deploy to Vercel

See `.github/PUSH_TO_GITHUB.md` for the exact git commands.  
See `.github/GITHUB_SECRETS.md` for the complete list of secrets to add.

```bash
git init && git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/curasync.git
git add . && git commit -m "feat: CuraSync MVP"
git push -u origin main
```

After pushing: GitHub Actions runs type-check → tests → deploys to Vercel automatically.

---

## Architecture

```
Browser → Clerk middleware → Next.js App Router
                                    ↓
                          API Routes (/api/v1/*)
                                    ↓
                    lib/auth.ts (Clerk v7 getPatientAuth)
                                    ↓
                    lib/ratelimit.ts (Upstash Redis)
                                    ↓
                    lib/db/index.ts (Drizzle ORM)
                                    ↓
                    Supabase PostgreSQL + TimescaleDB
```

**Alert flow:**
```
POST /api/v1/readings
    → evaluateReading() [lib/alerts.ts]
    → INSERT into readings hypertable
    → INSERT into alert_events (if triggered)
    → writeAuditLog() [lib/audit.ts]
```

---

## Environment Variables (complete list)

| Variable | Required | Service |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase (pooler port 6543) |
| `DATABASE_URL_DIRECT` | ✅ migrations | Supabase (direct port 5432) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk |
| `CLERK_SECRET_KEY` | ✅ | Clerk |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Upstash |
| `ANTHROPIC_API_KEY` | AI Doctor | Anthropic |
| `RESEND_API_KEY` | Email | Resend |
| `TWILIO_ACCOUNT_SID` | SMS | Twilio |
| `TWILIO_AUTH_TOKEN` | SMS | Twilio |
| `TWILIO_PHONE_NUMBER` | SMS | Twilio |
| `AWS_ACCESS_KEY_ID` | PDF | AWS |
| `AWS_SECRET_ACCESS_KEY` | PDF | AWS |
| `AWS_REGION` | PDF | AWS |
| `AWS_S3_BUCKET` | PDF | AWS |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | OCR | Google Cloud |
| `WEBHOOK_SECRET` | Wearables | — |

---

## Test

```bash
npm test          # 80 tests, ~2s
npm run test:coverage
```

Test files:
- `lib/__tests__/alerts.test.ts` — alert engine (47 tests)
- `lib/__tests__/extended.test.ts` — OCR, adherence, dedup, signatures (33 tests)

---

*CuraSync MVP · HIPAA compliant · DPDP Act 2023 · Data stored in ap-south-1 (Mumbai)*
