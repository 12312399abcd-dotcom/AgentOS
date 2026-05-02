# Supabase Setup for Agency OS

## 1. Create Supabase Project

Create one Supabase project for the environment you are setting up.

Recommended project names:

- `agency-os-dev`
- `agency-os-production`

Use the same region as most users when possible.

## 2. Copy API Credentials

In Supabase Dashboard, open:

```txt
Project Settings -> API
```

Copy these values into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are browser-safe only because RLS is required.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- `CRON_SECRET` should be a long random string.

## 3. Apply Database Migrations

Open Supabase SQL Editor and run migrations in this exact order:

```txt
supabase/migrations/0001_agency_os_foundation.sql
supabase/migrations/0002_reports_draft_data.sql
supabase/migrations/0003_storage_buckets.sql
supabase/migrations/0004_invoice_file_url.sql
```

After applying, confirm these tables exist:

- `organizations`
- `organization_members`
- `clients`
- `tasks`
- `content_items`
- `business_accounts`
- `cashflow_transactions`
- `invoices`
- `reports`
- `audit_logs`

## 4. Confirm Storage Buckets

Confirm private buckets exist:

- `client-assets`
- `reports`
- `invoices`

Storage object paths must start with `organization_id`.

Examples:

```txt
{organization_id}/content/{content_id}/asset.png
{organization_id}/reports/{report_id}.pdf
{organization_id}/invoices/{invoice_id}.pdf
```

## 5. Configure Auth URLs

For local development:

```txt
Site URL: http://localhost:3000
Redirect URL: http://localhost:3000/auth/callback
```

For production, add:

```txt
https://your-domain.com/auth/callback
https://your-domain.com/login
https://your-domain.com/signup
https://your-domain.com/invite/*
```

## 6. Run Local Verification

After filling `.env.local`, run:

```bash
npm run supabase:check
npm run verify
npm run dev
```

Open:

```txt
http://localhost:3000
```

Then test:

1. Sign up first admin.
2. Create organization.
3. Confirm redirect to `/org/[orgSlug]/workspace`.
4. Create one client.
5. Schedule one content item.
6. Confirm linked production tasks are created.

## 7. Production Checklist

Before production launch, follow:

```txt
docs/deployment_launch_checklist.md
```
