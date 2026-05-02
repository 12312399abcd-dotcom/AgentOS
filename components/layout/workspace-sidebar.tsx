import Link from 'next/link'

type WorkspaceSidebarProps = {
  orgSlug: string
  workspace: 'operation' | 'finance' | 'settings'
}

const operationLinks = [
  ['Dashboard', 'dashboard'],
  ['Content', 'content/calendar'],
  ['Tasks', 'tasks'],
  ['Clients', 'clients'],
  ['Team', 'team'],
  ['Social', 'social'],
  ['Reports', 'reports']
]

const financeLinks = [
  ['Tổng quan', 'dashboard'],
  ['Sổ thu chi', 'journal'],
  ['Ngân sách', 'forecast-budget'],
  ['Báo giá / Hóa đơn', 'invoices'],
  ['Dòng tiền', 'cashflow'],
  ['Báo cáo', 'income-statement']
]

const settingsLinks = [
  ['Members', 'members'],
  ['Sessions', 'sessions'],
  ['Audit Logs', 'audit-logs'],
  ['Organization', 'organization']
]

export function WorkspaceSidebar({ orgSlug, workspace }: WorkspaceSidebarProps) {
  const links = workspace === 'operation' ? operationLinks : workspace === 'finance' ? financeLinks : settingsLinks

  return (
    <aside className="sidebar">
      <nav aria-label={`${workspace} navigation`}>
        {links.map(([label, href]) => (
          <Link key={href} href={`/org/${orgSlug}/${workspace}/${href}`}>
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
