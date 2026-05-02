# Agency OS

Agency OS is a Next.js + Supabase operating system for agency operations, content production, business finance, reporting, and role-based workspace access.

## Stack

- Next.js App Router on Vercel
- Supabase Auth, Postgres, Storage, and RLS
- Server Actions for business operations
- API routes for cron jobs, exports, reports, sessions, and integrations

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment values:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` with Supabase and cron credentials.

4. Apply Supabase migrations in order:

```txt
supabase/migrations/0001_agency_os_foundation.sql
supabase/migrations/0002_reports_draft_data.sql
supabase/migrations/0003_storage_buckets.sql
supabase/migrations/0004_invoice_file_url.sql
```

Detailed setup guide:

```txt
docs/supabase_setup.md
```

5. Run the app:

```bash
npm run dev
```

## Verification

Run the full local verification pipeline:

```bash
npm run verify
```

This runs lint, static security checks, roadmap coverage checks, typecheck, and production build.

Check Supabase environment readiness:

```bash
npm run supabase:check
```

## Production Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Use a long random `CRON_SECRET`.
- Confirm RLS is enabled before using the public Supabase anon key with real data.
- Configure Supabase Auth redirect URLs for `/auth/callback`, `/login`, `/signup`, and `/invite/*`.
- Follow `docs/deployment_launch_checklist.md` before launch.
