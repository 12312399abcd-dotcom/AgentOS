import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function mustExist(path) {
  if (!existsSync(join(root, path))) {
    failures.push(`Missing ${path}`)
  }
}

function mustContain(path, text) {
  const absolute = join(root, path)
  if (!existsSync(absolute)) {
    failures.push(`Missing ${path}`)
    return
  }

  const content = readFileSync(absolute, 'utf8')
  if (!content.includes(text)) {
    failures.push(`${path} does not contain ${text}`)
  }
}

const requiredRoutes = [
  'app/org/[orgSlug]/workspace/page.tsx',
  'app/org/[orgSlug]/operation/dashboard/page.tsx',
  'app/org/[orgSlug]/operation/content/calendar/page.tsx',
  'app/org/[orgSlug]/operation/content/list/page.tsx',
  'app/org/[orgSlug]/operation/content/board/page.tsx',
  'app/org/[orgSlug]/operation/content/table/page.tsx',
  'app/org/[orgSlug]/operation/content/timeline/page.tsx',
  'app/org/[orgSlug]/finance/dashboard/page.tsx',
  'app/org/[orgSlug]/finance/forecast-budget/page.tsx',
  'app/org/[orgSlug]/finance/cashflow/page.tsx',
  'app/org/[orgSlug]/finance/income-statement/page.tsx',
  'app/org/[orgSlug]/finance/balance-sheet/page.tsx',
  'app/org/[orgSlug]/finance/business-expenses/page.tsx',
  'app/org/[orgSlug]/finance/invoices/page.tsx',
  'app/org/[orgSlug]/finance/payroll/page.tsx',
  'app/org/[orgSlug]/finance/tax/page.tsx',
  'app/org/[orgSlug]/finance/capital-loans/page.tsx',
  'app/org/[orgSlug]/finance/period-close/page.tsx',
  'app/org/[orgSlug]/settings/audit-logs/page.tsx',
  'app/org/[orgSlug]/settings/sessions/page.tsx',
  'app/org/[orgSlug]/notifications/page.tsx',
  'app/org/[orgSlug]/my-time/page.tsx'
]

const requiredApiRoutes = [
  'app/api/cron/overdue-tasks/route.ts',
  'app/api/cron/invoice-reminders/route.ts',
  'app/api/cron/weekly-reports/route.ts',
  'app/api/cron/session-summary/route.ts',
  'app/api/cron/forecast-activation/route.ts',
  'app/api/cron/daily-cashflow-review/route.ts',
  'app/api/cron/expense-due-reminders/route.ts',
  'app/api/cron/payroll-readiness/route.ts',
  'app/api/integrations/notion/sync-content/route.ts',
  'app/api/exports/[exportType]/route.ts',
  'app/api/session/heartbeat/route.ts',
  'app/api/session/end/route.ts'
]

const requiredServices = [
  'lib/services/permissions.ts',
  'lib/services/workspace.ts',
  'lib/services/content-booking.ts',
  'lib/services/finance-statements.ts',
  'lib/services/notifications.ts',
  'lib/services/sessions.ts',
  'lib/services/storage.ts',
  'lib/services/audit.ts',
  'lib/services/csv.ts',
  'lib/services/pdf.ts',
  'lib/services/financial-periods.ts'
]

for (const path of [...requiredRoutes, ...requiredApiRoutes, ...requiredServices]) {
  mustExist(path)
}

mustContain('middleware.ts', 'routeTail.startsWith(\'finance\')')
mustContain('middleware.ts', 'routeTail.startsWith(\'operation\')')
mustContain('middleware.ts', 'routeTail.startsWith(\'settings\')')
mustContain('supabase/migrations/0001_agency_os_foundation.sql', 'alter table public.clients enable row level security')
mustContain('supabase/migrations/0001_agency_os_foundation.sql', 'create policy "finance_access_cashflow"')
mustContain('supabase/migrations/0001_agency_os_foundation.sql', 'create policy "operation_read_content"')
mustContain('supabase/migrations/0003_storage_buckets.sql', "'client-assets'")
mustContain('supabase/migrations/0003_storage_buckets.sql', "'reports'")
mustContain('supabase/migrations/0003_storage_buckets.sql', "'invoices'")
mustContain('supabase/migrations/0004_invoice_file_url.sql', 'file_url')
mustContain('vercel.json', '/api/cron/payroll-readiness')
mustContain('vercel.json', '/api/cron/daily-cashflow-review')
mustContain('docs/qa_security_test_plan.md', 'Role-Based QA Matrix')
mustContain('docs/deployment_launch_checklist.md', 'Production Smoke Test')
mustContain('docs/deployment_launch_checklist.md', '0004_invoice_file_url.sql')
mustContain('lib/actions/finance.ts', 'assertFinancialPeriodEditable')
mustContain('lib/actions/invoices.ts', 'assertFinancialPeriodEditable')
mustContain('lib/actions/payroll.ts', 'assertFinancialPeriodEditable')
mustContain('lib/actions/reports.ts', 'Viewer can only export approved reports')
mustContain('app/org/[orgSlug]/operation/reports/page.tsx', "member.role === 'viewer'")
mustContain('app/api/exports/[exportType]/route.ts', 'getWorkspaceAccess')
mustContain('app/api/integrations/notion/sync-content/route.ts', 'getWorkspaceAccess')
mustContain('app/api/session/heartbeat/route.ts', 'No organization access')
mustContain('lib/services/sessions.ts', 'assertActiveMembership')
mustContain('README.md', 'npm run verify')
mustContain('README.md', 'SUPABASE_SERVICE_ROLE_KEY')
mustExist('eslint.config.mjs')

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Roadmap coverage checks passed')
