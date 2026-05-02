import { calculateBalanceSheet, getStatementRange } from '@/lib/services/finance-statements'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

type BalanceSheetPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ month?: string; quarter?: string; year?: string; start?: string; end?: string }>
}

export default async function BalanceSheetPage({ params, searchParams }: BalanceSheetPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const filters = await searchParams
  const range = getStatementRange(filters)
  const sheet = await calculateBalanceSheet(organization.id, range)
  const defaultMonth = new Date().toISOString().slice(0, 7)
  const exportParams = new URLSearchParams({ orgSlug })
  if (filters.month) exportParams.set('month', filters.month)
  if (filters.quarter) exportParams.set('quarter', filters.quarter)
  if (filters.year) exportParams.set('year', filters.year)
  if (filters.start) exportParams.set('start', filters.start)
  if (filters.end) exportParams.set('end', filters.end)

  return (
    <main className="shell">
      <h1>Balance Sheet</h1>
      <div className="actions">
        <a href={`/api/exports/balance-sheet?${exportParams.toString()}`}>Export CSV</a>
      </div>
      <form className="filter-bar">
        <input name="month" pattern="\d{4}-\d{2}" placeholder="Month" defaultValue={filters.month ?? defaultMonth} />
        <input name="quarter" pattern="\d{4}-Q[1-4]" placeholder="2026-Q2" defaultValue={filters.quarter ?? ''} />
        <input name="year" pattern="\d{4}" placeholder="Year" defaultValue={filters.year ?? ''} />
        <input name="start" type="date" defaultValue={filters.start ?? ''} />
        <input name="end" type="date" defaultValue={filters.end ?? ''} />
        <button type="submit">Apply</button>
      </form>
      <div className="grid">
        <section className="card">
          <h2>Assets</h2>
          <p>Cash: {sheet.cash.toLocaleString()}</p>
          <p>Accounts receivable: {sheet.accountsReceivable.toLocaleString()}</p>
          <p>Prepaid expenses: {sheet.prepaidExpenses.toLocaleString()}</p>
          <p>Equipment assets: {sheet.equipmentAssets.toLocaleString()}</p>
          <p>Deposits: {sheet.deposits.toLocaleString()}</p>
          <strong>Total assets: {sheet.totalAssets.toLocaleString()}</strong>
        </section>
        <section className="card">
          <h2>Liabilities</h2>
          <p>Accounts payable: {sheet.accountsPayable.toLocaleString()}</p>
          <p>Tax payable: {sheet.taxPayable.toLocaleString()}</p>
          <p>Payroll payable: {sheet.payrollPayable.toLocaleString()}</p>
          <p>Loans payable: {sheet.loansPayable.toLocaleString()}</p>
          <p>Unearned revenue: {sheet.unearnedRevenue.toLocaleString()}</p>
          <p>Credit card payable: {sheet.creditCardPayable.toLocaleString()}</p>
          <strong>Total liabilities: {sheet.totalLiabilities.toLocaleString()}</strong>
        </section>
        <section className="card">
          <h2>Equity</h2>
          <p>Owner capital: {sheet.ownerCapital.toLocaleString()}</p>
          <p>Owner draws: {sheet.ownerDraws.toLocaleString()}</p>
          <p>Retained earnings: {sheet.retainedEarnings.toLocaleString()}</p>
          <p>Current period profit: {sheet.currentPeriodProfit.toLocaleString()}</p>
          <strong>Total equity: {sheet.totalEquity.toLocaleString()}</strong>
        </section>
        <section className="card">
          <h2>Validation</h2>
          <p>Assets: {sheet.totalAssets.toLocaleString()}</p>
          <p>Liabilities + Equity: {(sheet.totalLiabilities + sheet.totalEquity).toLocaleString()}</p>
          <strong>{sheet.balanceStatus}</strong>
        </section>
      </div>
    </main>
  )
}
