# Push CuraSync to GitHub

## First-time setup

```bash
# 1. Unzip and enter the project
unzip curasync-complete.zip
cd curasync

# 2. Initialize git (if not already)
git init
git branch -M main

# 3. Connect to your GitHub repo (replace with your actual URL)
git remote add origin https://github.com/YOUR_USERNAME/curasync.git

# 4. Make sure .gitignore is correct (it is — check it covers .env.local)
cat .gitignore | grep env

# 5. Stage all files
git add .

# 6. First commit
git commit -m "feat: CuraSync MVP — full-stack health monitoring platform

- Next.js 14 App Router with TypeScript strict mode
- 30 pages: dashboard, conditions, medications, journal, calendar, alerts,
  settings, messages, AI Doctor, wearables, provider panel, onboarding
- 9 API routes: readings, alerts, medications, journal, messages,
  patients, sync, export, ocr, onboarding
- Clerk v7 auth middleware wired on all routes
- Drizzle ORM + Supabase schema (TimescaleDB hypertable for readings)
- Upstash Redis rate limiting
- Google Cloud Vision OCR for lab reports
- 47 unit tests passing (Vitest)
- GitHub Actions CI/CD (type-check + test + Vercel deploy)
- Vercel-ready: vercel.json configured for bom1 (Mumbai)"

# 7. Push
git push -u origin main
```

## After pushing

1. Go to your GitHub repo → **Actions** tab — you'll see the CI workflow running
2. It will fail if GitHub Secrets aren't set yet — add them first (see GITHUB_SECRETS.md)
3. Once secrets are added, re-run the failed workflow from the Actions tab

## Ongoing workflow

```bash
# Feature branch (recommended)
git checkout -b feat/your-feature
# ... make changes ...
git add .
git commit -m "feat: description"
git push origin feat/your-feature
# Create PR on GitHub → CI runs → preview URL posted → merge to main → auto-deploy
```

## Connect Vercel to GitHub (recommended alternative to CLI deploy)

Instead of using the `VERCEL_TOKEN` approach in CI, you can:

1. Vercel Dashboard → your project → Settings → Git
2. Connect to GitHub → select your repo
3. Set production branch: `main`
4. Vercel will auto-deploy on every push to main (bypasses the GitHub Actions deploy step)
5. Remove the `deploy` and `preview` jobs from `.github/workflows/ci.yml`
   — keep only the `quality` and `build` jobs for PR checks

This is simpler and is what most teams use.
