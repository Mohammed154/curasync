# GitHub Repository Secrets

Add these in: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

## Required for CI to pass

| Secret Name | Where to get it |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | vercel.com → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | Vercel project → Settings → General → Project ID |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (pooler, port 6543) |
| `DATABASE_URL_DIRECT` | Supabase → Settings → Database → Connection string (direct, port 5432) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Web App SDK config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project Settings → Web App SDK config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Console → Storage / Project Settings |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project Settings → Cloud Messaging |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Console → Project Settings → Web App SDK config |
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → Service accounts → Generate new private key |
| `FIREBASE_PRIVATE_KEY` | Firebase Console → Project Settings → Service accounts → private_key from JSON |

## Required for full functionality (add before go-live)

| Secret Name | Where to get it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | Your verified sending domain |
| `TWILIO_ACCOUNT_SID` | console.twilio.com |
| `TWILIO_AUTH_TOKEN` | console.twilio.com |
| `TWILIO_PHONE_NUMBER` | Your Twilio number |
| `AWS_ACCESS_KEY_ID` | AWS IAM → curasync-app user |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM → curasync-app user |
| `AWS_REGION` | `ap-south-1` |
| `AWS_S3_BUCKET` | `curasync-reports-prod` |
| `AWS_LAMBDA_PDF_ARN` | Lambda function ARN |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Base64-encoded GCP service account JSON |
| `WEBHOOK_SECRET` | Random 32-char string (openssl rand -hex 32) |

## Setting up Vercel CLI link (one-time)

```bash
# In your project directory:
npm install -g vercel
vercel login
vercel link   # links to your existing Vercel project

# This creates .vercel/project.json — get IDs from there:
cat .vercel/project.json
# { "orgId": "team_xxx", "projectId": "prj_xxx" }
```

Add `VERCEL_ORG_ID=team_xxx` and `VERCEL_PROJECT_ID=prj_xxx` as GitHub secrets.

## GitHub Environments (for migration safety)

Go to **repo → Settings → Environments → New environment → `production`**

Add a **Required reviewers** rule — this means the `db:migrate` workflow
will pause and wait for a human to approve before pushing schema changes to production.
