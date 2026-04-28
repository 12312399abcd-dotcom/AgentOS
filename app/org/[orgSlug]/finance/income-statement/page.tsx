import { calculateIncomeStatement, getStatementRange } from '@/lib/services/finance-statements'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

type IncomeStatementPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ month?: string; quarter?: string; year?: string; start?: string; end?: string }>
}

export default async function IncomeStatementPage({ params, searchParams }: IncomeStatementPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const filters = await searchParams
  const range = getStatementRange(filters)
  const statement = await calculateIncomeStatement(organization.id, range)
  const defaultMonth = new Date().toISOString().slice(0, 7)

  return (
    <main className="shell">
      <h1>Income Statement</h1>
      <div className="actions">
        <a href={`/api/exports/income-statement?orgSlug=${orgSlug}&month=${filters.month ?? defaultMonth}`}>Export CSV</a>
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
        <div className="card"><strong>Revenue</strong><p>{statement.revenue.toLocaleString()}</p></div>
        <div className="card"><strong>Cost of Services</strong><p>{statement.costOfServices.toLocaleString()}</p></div>
        <div className="card"><strong>Gross Profit</strong><p>{statement.grossProfit.toLocaleString()}</p></div>
        <div className="card"><strong>Operating Expenses</strong><p>{statement.operatingExpenses.toLocaleString()}</p></div>
        <div className="card"><strong>Operating Profit</strong><p>{statement.operatingProfit.toLocaleString()}</p></div>
        <div className="card"><strong>Other Income</strong><p>{statement.otherIncome.toLocaleString()}</p></div>
        <div className="card"><strong>Other Expenses</strong><p>{statement.otherExpenses.toLocaleString()}</p></div>
        <div className="card"><strong>Tax</strong><p>{statement.tax.toLocaleString()}</p></div>
        <div className="card"><strong>Net Income</strong><p>{statement.netIncome.toLocaleString()}</p></div>
      </div>
      <section>
        <h2>Category Movement</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Net Movement</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(statement.byCategory).map(([category, amount]) => (
                <tr key={category}>
                  <td>{category}</td>
                  <td>{amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
