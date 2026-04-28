# Agency OS QA and Security Test Plan

## Scope

This plan validates the MVP against the roadmap security model:

- Organization isolation is mandatory.
- Role is read from `organization_members`.
- Operation and Finance workspaces are separated.
- Middleware, server actions, and Supabase RLS all enforce access.
- Finance totals and sensitive state changes are calculated server-side.
- Audit logs record business-critical changes.

## Environment Checklist

- `NEXT_PUBLIC_SUPABASE_URL` is configured.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and absent from browser bundles.
- `CRON_SECRET` is configured in Vercel and local test env.
- Supabase migrations are applied in order.
- Storage buckets exist: `client-assets`, `reports`, `invoices`.
- RLS is enabled on all business tables and storage objects.

## Role-Based QA Matrix

| Role | Expected landing | Operation | Finance | Settings |
| --- | --- | ---: | ---: | ---: |
| admin | `/org/[orgSlug]/workspace` | Full | Full | Full |
| finance_moderator | `/org/[orgSlug]/finance/dashboard` | No | Manage | No |
| designer | `/org/[orgSlug]/operation/dashboard` | Role-scoped | No | No |
| editor | `/org/[orgSlug]/operation/dashboard` | Role-scoped | No | No |
| marketing | `/org/[orgSlug]/operation/dashboard` | Manage content/reports | No | No |
| channel_manager | `/org/[orgSlug]/operation/dashboard` | Publish/social | No | No |
| viewer | `/org/[orgSlug]/operation/dashboard` | Read-only target | No | No |

## Access Tests

1. Admin can open Operation, Finance, Workspace selector, Settings, Audit Logs.
2. Finance Moderator opening `/operation/dashboard` redirects to Finance dashboard.
3. Designer opening `/finance/dashboard` redirects to Operation dashboard.
4. Operation roles cannot fetch finance rows with anon Supabase client.
5. Finance Moderator cannot fetch operation-only rows unless future permission is granted.
6. A user from Organization A cannot open `/org/[orgB]/...`.
7. A user with no active membership is redirected to `/unauthorized`.
8. Non-admin opening `/org/[orgSlug]/settings/*` redirects to default workspace.

## Organization Isolation Matrix

| Table group | Required assertion |
| --- | --- |
| Clients/tasks/content/social/reports | Every query filters by `organization_id`. |
| Finance accounts/cashflow/expenses/payroll/invoices | Every query filters by `organization_id` and finance role. |
| Notifications/sessions/audit logs | User sees own records; admin sees org-level records. |
| Storage objects | First path segment is `organization_id`; policies check org role. |

## Workflow Tests

1. Content schedule with publish date creates content item and linked production tasks.
2. Content schedule without publish date does not auto-book production tasks.
3. Published content requires a live published URL.
4. Publishing creates or updates the linked `social_posts` row.
5. Designer/editor/channel tasks remain linked to `content_item_id`.
6. Task status transitions reject invalid jumps.
7. Approved/completed task updates content production status when applicable.
8. Notion sync preview returns mapped actions without inserting rows.
9. Notion sync import inserts new content and tasks.
10. Notion sync update modifies existing content by `notion_page_id`.

## Finance Tests

1. Cashflow transaction rejects negative amount.
2. Invoice totals are calculated server-side from invoice items.
3. Marking invoice paid creates `money_in` cashflow.
4. Paid business expense creates `money_out` cashflow.
5. Payroll payment creates payroll cashflow rows and marks items paid.
6. Payroll payment below reserve requires admin.
7. Owner draw below reserve requires admin override note.
8. Income statement excludes owner draw and loan principal repayment from expenses.
9. Balance sheet calculates loans payable from loan received minus loan repayment.
10. Period close creates balance sheet snapshot and locks the financial period.
11. Out-of-balance period close requires admin override note.
12. Finance dashboard shows cash gap, payroll gap, spending allowance, and forecast variance.

## Cron Tests

1. Cron route without `Authorization: Bearer $CRON_SECRET` returns 401.
2. Overdue task cron notifies owners and admins for severe overdue tasks.
3. Invoice reminder cron marks overdue invoices and notifies finance users.
4. Expense reminder cron marks overdue expenses and notifies finance users.
5. Forecast activation cron activates approved current-month forecasts.
6. Daily cashflow review warns finance when cash is below reserve.
7. Payroll readiness cron warns when payroll threatens reserve.
8. Session summary cron warns admins when daily session limit is reached.

## Storage Tests

1. Operation member can upload content asset to `client-assets`.
2. Uploaded asset path starts with `organization_id`.
3. Content detail page renders a signed URL, not a public file URL.
4. Finance invoice files are not public.
5. Non-admin cannot hard-delete finance files.

## Audit Tests

1. Organization creation writes audit log.
2. Member invitation writes audit log.
3. Client creation writes audit log.
4. Task status changes write audit log.
5. Content scheduling/publishing writes audit log.
6. Finance transactions, invoices, payroll, owner draw, and period close write audit logs.
7. Audit Logs page filters by entity type, actor, date range, and workspace.
8. Sensitive fields such as tokens/secrets are hidden in audit display.

## Manual Security Review

- Search for `SUPABASE_SERVICE_ROLE_KEY` usage; it must only appear in server-only code.
- Search all data reads for missing `organization_id` filters.
- Confirm middleware protects `/org/[orgSlug]/finance`, `/operation`, `/settings`, and `/workspace`.
- Confirm every server action calls `requireWorkspaceAccess`, `requireAdmin`, or `requireOrgAccess`.
- Confirm all cron routes call `verifyCron`.
- Confirm no finance route is linked for operation-only roles except via redirect-protected paths.
