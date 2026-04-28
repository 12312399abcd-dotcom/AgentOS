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
  ['Social', 'social'],
  ['Reports', 'reports']
]

const financeLinks = [
  ['Dashboard', 'dashboard'],
  ['Forecast Budget', 'forecast-budget'],
  ['Cashflow', 'cashflow'],
  ['Income Statement', 'income-statement'],
  ['Balance Sheet', 'balance-sheet'],
  ['Business Expenses', 'business-expenses'],
  ['Payroll', 'payroll'],
  ['Invoices', 'invoices'],
  ['Tax', 'tax'],
  ['Capital / Loans', 'capital-loans'],
  ['Period Close', 'period-close']
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
