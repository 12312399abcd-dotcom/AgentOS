import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') return []
    if (statSync(path).isDirectory()) return walk(path)
    return [path]
  })
}

function mustContain(path, text) {
  if (!existsSync(join(root, path))) {
    failures.push(`Missing ${path}`)
    return
  }

  const content = read(path)
  if (!content.includes(text)) {
    failures.push(`${path} does not contain ${text}`)
  }
}

const exportRoutePath = 'app/api/exports/[exportType]/route.ts'
const exportRoute = read(exportRoutePath)
const exportSetMatches = [...exportRoute.matchAll(/new Set\(\[([^\]]+)\]\)/g)]
const supportedExports = new Set(
  exportSetMatches.flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]))
)

const sourceFiles = walk(root)
  .filter((file) => /\.(ts|tsx)$/.test(file))
  .filter((file) => !file.includes('/node_modules/') && !file.includes('/.next/'))

for (const file of sourceFiles) {
  const rel = file.replace(`${root}/`, '')
  const text = readFileSync(file, 'utf8')
  const exportLinks = [...text.matchAll(/\/api\/exports\/([a-z-]+)/g)].map((match) => match[1])

  for (const exportType of exportLinks) {
    if (!supportedExports.has(exportType)) {
      failures.push(`${rel}: links unsupported export type "${exportType}"`)
    }
  }
}

for (const match of exportRoute.matchAll(/const \{ data \} = await query/g)) {
  failures.push(`${exportRoutePath}: query at index ${match.index} reads data without checking Supabase error`)
}

for (const exportType of supportedExports) {
  if (!exportRoute.includes(`exportType === '${exportType}'`) && exportType !== 'tax-summary') {
    failures.push(`${exportRoutePath}: supports "${exportType}" but has no explicit branch`)
  }
}

const financePagesWithExpectedExports = [
  ['app/org/[orgSlug]/finance/balance-sheet/page.tsx', 'balance-sheet'],
  ['app/org/[orgSlug]/finance/business-expenses/page.tsx', 'business-expenses'],
  ['app/org/[orgSlug]/finance/capital-loans/page.tsx', 'capital-loans'],
  ['app/org/[orgSlug]/finance/cashflow/page.tsx', 'cashflow'],
  ['app/org/[orgSlug]/finance/forecast-budget/page.tsx', 'forecast-variance'],
  ['app/org/[orgSlug]/finance/income-statement/page.tsx', 'income-statement'],
  ['app/org/[orgSlug]/finance/invoices/page.tsx', 'invoices'],
  ['app/org/[orgSlug]/finance/payroll/page.tsx', 'payroll'],
  ['app/org/[orgSlug]/finance/tax/page.tsx', 'tax-summary']
]

for (const [page, exportType] of financePagesWithExpectedExports) {
  mustContain(page, `/api/exports/${exportType}`)
}

const operationPagesWithExpectedExports = [
  ['app/org/[orgSlug]/operation/content/table/page.tsx', 'content'],
  ['app/org/[orgSlug]/operation/social/page.tsx', 'social'],
  ['app/org/[orgSlug]/operation/tasks/page.tsx', 'tasks']
]

for (const [page, exportType] of operationPagesWithExpectedExports) {
  mustContain(page, `/api/exports/${exportType}`)
}

const dynamicOrgDetailPages = [
  'app/org/[orgSlug]/operation/content/[contentId]/page.tsx',
  'app/org/[orgSlug]/operation/reports/[reportId]/page.tsx',
  'app/org/[orgSlug]/operation/social/[postId]/page.tsx',
  'app/org/[orgSlug]/operation/tasks/[taskId]/page.tsx'
]

for (const page of dynamicOrgDetailPages) {
  mustContain(page, 'requireWorkspaceAccess(organization.id')
  mustContain(page, ".eq('organization_id', organization.id)")
}

mustContain('lib/actions/tasks.ts', 'assertMemberBelongsToOrg')
mustContain('lib/actions/tasks.ts', ".from('content_items')\n    .update({ status: contentStatus })\n    .eq('organization_id', organizationId)")
mustContain('lib/actions/reports.ts', "old_data: { status: report.status }")
mustContain('lib/actions/organizations.ts', "user.email?.toLowerCase() !== invitation.email.toLowerCase()")
mustContain('lib/actions/organizations.ts', "org.status !== 'active'")
mustContain('lib/services/post-login.ts', 'resolveDefaultWorkspaceRoute(organization.slug, membership.role)')
mustContain('app/auth/callback/route.ts', 'inviteToken')
mustContain('middleware.ts', "organization.status !== 'active'")
mustContain('middleware.ts', "routeTail.startsWith('finance') && !canAccessFinance(member.role)")
mustContain('middleware.ts', "routeTail.startsWith('operation') && !canAccessOperation(member.role)")
mustContain('middleware.ts', "routeTail.startsWith('settings') && member.role !== 'admin'")
mustContain('middleware.ts', "routeTail === 'workspace' && member.role !== 'admin'")
mustContain('lib/services/permissions.ts', "organization?.status === 'active'")
mustContain('app/org/[orgSlug]/workspace/page.tsx', 'requireAdmin(organization.id)')
mustContain('lib/actions/finance.ts', 'assertInvoiceBelongsToOrg')
mustContain('lib/actions/finance.ts', "parsed.status === 'paid'")
mustContain('lib/actions/finance.ts', 'assertMoneyOutAllowed(admin, parsed.organizationId, Number(expense.total_amount), member.role)')
mustContain('lib/actions/invoices.ts', 'assertBusinessAccountBelongsToOrg')
mustContain('lib/actions/payroll.ts', 'assertBusinessAccountBelongsToOrg')
mustContain('lib/actions/payroll.ts', 'assertMemberBelongsToOrg')
mustContain('lib/actions/payroll.ts', "Only planned, reserved, or blocked payroll cycles can be approved")
mustContain('app/api/integrations/notion/sync-content/route.ts', 'resolveMemberUserId')
mustContain('app/api/integrations/notion/sync-content/route.ts', 'syncProductionTasks')
mustContain('app/api/integrations/notion/sync-content/route.ts', ".update(payload).eq('organization_id', body.organizationId)")
mustContain('app/api/integrations/notion/sync-content/route.ts', 'parsedBody.success')
mustContain('app/api/integrations/notion/sync-content/route.ts', 'logError')
mustContain('lib/services/notifications.ts', 'createDailyCronNotifications')
mustContain('supabase/migrations/0001_agency_os_foundation.sql', "public.current_org_role(organization_id) = 'viewer'")
mustContain('supabase/migrations/0001_agency_os_foundation.sql', "and status = 'approved'")
mustContain('supabase/migrations/0001_agency_os_foundation.sql', 'user_id = auth.uid() and public.is_org_member(organization_id)')
mustContain('supabase/migrations/0003_storage_buckets.sql', "public.current_org_role((storage.foldername(name))[1]::uuid) in ('admin', 'marketing', 'channel_manager')")
mustContain('docs/deployment_launch_checklist.md', 'cannot read draft reports')

const cronRoutes = sourceFiles
  .map((file) => file.replace(`${root}/`, ''))
  .filter((file) => file.startsWith('app/api/cron/') && file.endsWith('/route.ts'))

for (const route of cronRoutes) {
  const content = read(route)
  mustContain(route, 'createDailyCronNotifications')
  if (content.includes('createNotifications(')) {
    failures.push(`${route}: cron route should use daily deduped notifications`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Smoke checks passed')
