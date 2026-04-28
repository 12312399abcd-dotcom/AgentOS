# Agency OS Deployment and Launch Checklist

## Supabase Production

1. Create the production Supabase project.
2. Apply migrations in order:
   - `0001_agency_os_foundation.sql`
   - `0002_reports_draft_data.sql`
   - `0003_storage_buckets.sql`
   - `0004_invoice_file_url.sql`
3. Confirm RLS is enabled on all business tables.
4. Confirm storage buckets are private:
   - `client-assets`
   - `reports`
   - `invoices`
5. Confirm storage object policies use the first path segment as `organization_id`.
6. Configure Auth site URL to the Vercel production URL.
7. Configure Auth redirect URLs:
   - `/auth/callback`
   - `/login`
   - `/signup`
   - `/invite/*`
8. Create the first production admin account.

## Vercel Production

Set environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
NEXT_PUBLIC_SITE_URL=
```

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser.
- `CRON_SECRET` must be long, random, and different from local/dev.
- Public Supabase anon key is acceptable only because RLS is mandatory.

## Deployment

1. Run local verification:

```bash
npm run typecheck
npm run build
```

2. Deploy to Vercel.
3. Confirm Vercel Cron routes are listed:
   - `/api/cron/overdue-tasks`
   - `/api/cron/invoice-reminders`
   - `/api/cron/expense-due-reminders`
   - `/api/cron/forecast-activation`
   - `/api/cron/daily-cashflow-review`
   - `/api/cron/payroll-readiness`
   - `/api/cron/weekly-reports`
   - `/api/cron/session-summary`
4. Manually call one cron route without auth and verify `401`.
5. Manually call one cron route with `Authorization: Bearer $CRON_SECRET` and verify JSON response.

## Production Smoke Test

1. Sign up first Admin.
2. Create first organization.
3. Verify Admin lands on `/org/[orgSlug]/workspace`.
4. Verify Operation and Finance cards are visible.
5. Invite:
   - Finance Moderator
   - Designer
   - Editor
   - Marketing
   - Channel Manager
6. Accept each invite and verify default landing route.
7. Confirm operation users cannot open Finance URLs.
8. Confirm Finance Moderator cannot open Operation URLs.
9. Create first client.
10. Schedule first content item with publish date.
11. Verify designer/editor/channel tasks are auto-booked.
12. Upload a content asset.
13. Publish content with a live URL.
14. Enter social metrics.
15. Create first business account.
16. Enter opening cash.
17. Create first forecast budget.
18. Add forecast items.
19. Create payroll cycle and payroll items.
20. Create invoice and mark it paid.
21. Confirm paid invoice creates cashflow money in.
22. Create business expense and mark paid.
23. Confirm paid expense creates cashflow money out.
24. Confirm Finance Dashboard values update.
25. Close a financial period in a test month.
26. Confirm audit logs show the above actions.

## Launch Criteria

Agency OS is ready for MVP launch when:

- Production build deploys cleanly.
- Auth signup/login/callback works.
- Organization onboarding creates org, admin membership, workspaces, finance settings, and default account.
- Role routing is correct for every role.
- RLS blocks cross-organization access.
- Finance workspace is inaccessible to operation roles.
- Operation workspace is inaccessible to Finance Moderator.
- Cron endpoints are protected.
- Storage files are private and served through signed URLs.
- Audit logs capture sensitive business actions.
- The QA plan in `docs/qa_security_test_plan.md` has been run at least once.
