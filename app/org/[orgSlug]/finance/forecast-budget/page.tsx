import {
  addForecastBudgetItemFromForm,
  createForecastBudgetFromForm,
  updateForecastStatusFromForm
} from '@/lib/actions/forecasts'
import { forecastCategories } from '@/lib/finance/categories'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type ForecastBudgetPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ forecastMonth?: string; status?: string; clientId?: string; category?: string }>
}

function monthBounds(period: string) {
  const [year, month] = period.split('-').map(Number)
  return {
    start: `${period}-01`,
    end: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
  }
}

function previousMonth(period: string) {
  const [year, month] = period.split('-').map(Number)
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7)
}

export default async function ForecastBudgetPage({ params, searchParams }: ForecastBudgetPageProps) {
  const { orgSlug } = await params
  const filters = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  let budgetsQuery = supabase
    .from('forecast_budgets')
    .select('id, forecast_month, opening_cash, expected_money_in, expected_money_out, expected_tax_reserve, expected_closing_cash, status, forecast_budget_items(id, item_type, category, description, expected_date, expected_amount, client_id, clients(name))')
    .eq('organization_id', organization.id)
    .order('forecast_month', { ascending: false })

  if (filters.forecastMonth) budgetsQuery = budgetsQuery.eq('forecast_month', filters.forecastMonth)
  if (filters.status) budgetsQuery = budgetsQuery.eq('status', filters.status)

  const [{ data: budgets }, { data: budgetSummaries }, { data: clients }, { data: expenses }] = await Promise.all([
    budgetsQuery,
    supabase
      .from('forecast_budgets')
      .select('forecast_month, expected_money_out')
      .eq('organization_id', organization.id),
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name'),
    supabase
      .from('business_expenses')
      .select('expense_date, total_amount, status')
      .eq('organization_id', organization.id)
      .neq('status', 'cancelled')
  ])
  const createAction = createForecastBudgetFromForm.bind(null, organization.id, orgSlug)
  const itemAction = addForecastBudgetItemFromForm.bind(null, organization.id, orgSlug)
  const statusAction = updateForecastStatusFromForm.bind(null, organization.id, orgSlug)
  const defaultMonth = new Date().toISOString().slice(0, 7)
  const exportMonth = filters.forecastMonth ?? defaultMonth
  const exportParams = new URLSearchParams({ orgSlug, month: exportMonth })
  if (filters.clientId) exportParams.set('clientId', filters.clientId)
  if (filters.category) exportParams.set('category', filters.category)

  return (
    <main className="shell">
      <h1>Forecast Budget</h1>
      <div className="actions">
        <a href={`/api/exports/forecast-variance?${exportParams.toString()}`}>Export Variance CSV</a>
      </div>
      <section>
        <h2>Filters</h2>
        <form className="filter-bar">
          <input name="forecastMonth" pattern="\d{4}-\d{2}" placeholder="Month" defaultValue={filters.forecastMonth ?? ''} />
          <select name="status" defaultValue={filters.status ?? ''}>
            <option value="">Any status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
          <select name="clientId" defaultValue={filters.clientId ?? ''}>
            <option value="">All clients</option>
            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <input name="category" placeholder="Item category" defaultValue={filters.category ?? ''} />
          <button type="submit">Filter</button>
        </form>
      </section>
      <section className="card">
        <h2>Create forecast</h2>
        <form className="form" action={createAction}>
          <label>Forecast month<input name="forecastMonth" required pattern="\d{4}-\d{2}" defaultValue={defaultMonth} /></label>
          <label>Opening cash<input name="openingCash" type="number" step="0.01" defaultValue="0" /></label>
          <label>Expected tax reserve<input name="expectedTaxReserve" type="number" min="0" step="0.01" defaultValue="0" /></label>
          <button type="submit">Create forecast</button>
        </form>
      </section>
      {(budgets ?? []).map((budget) => {
        const bounds = monthBounds(budget.forecast_month)
        const previousPeriod = previousMonth(budget.forecast_month)
        const previousBounds = monthBounds(previousPeriod)
        const previousForecastOut = Number((budgetSummaries ?? []).find((item) => item.forecast_month === previousPeriod)?.expected_money_out ?? 0)
        const previousActualExpense = (expenses ?? [])
          .filter((expense) => expense.expense_date >= previousBounds.start && expense.expense_date <= previousBounds.end)
          .reduce((sum, expense) => sum + Number(expense.total_amount), 0)
        const carriedDebt = Math.max(previousActualExpense - previousForecastOut, 0)
        const expectedMoneyIn = Number(budget.expected_money_in)
        const expectedMoneyOut = Number(budget.expected_money_out)
        const expectedTaxReserve = Number(budget.expected_tax_reserve)
        const totalOutWithDebt = expectedMoneyOut + carriedDebt
        const closingAfterDebt = Number(budget.opening_cash) + expectedMoneyIn - totalOutWithDebt
        const filteredItems = (budget.forecast_budget_items ?? []).filter((item) => {
          if (filters.clientId && item.client_id !== filters.clientId) return false
          if (filters.category && !item.category.toLowerCase().includes(filters.category.toLowerCase())) return false
          return true
        })
        const categoryRows = Object.values(filteredItems.reduce<Record<string, { category: string; moneyIn: number; moneyOut: number }>>((acc, item) => {
          const row = acc[item.category] ?? { category: item.category, moneyIn: 0, moneyOut: 0 }
          if (['money_in', 'owner_equity'].includes(item.item_type)) {
            row.moneyIn += Number(item.expected_amount)
          } else {
            row.moneyOut += Number(item.expected_amount)
          }
          acc[item.category] = row
          return acc
        }, {}))

        return (
          <section className="card" key={budget.id}>
            <h2>{budget.forecast_month} · {budget.status}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Budget line</th>
                    <th>Amount</th>
                    <th>How it is calculated</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Opening cash</td>
                    <td>{Number(budget.opening_cash).toLocaleString()}</td>
                    <td>Cash planned at the start of this month</td>
                  </tr>
                  <tr>
                    <td>Expected money in</td>
                    <td>{expectedMoneyIn.toLocaleString()}</td>
                    <td>Total money in forecast items</td>
                  </tr>
                  <tr>
                    <td>Expected monthly expenses</td>
                    <td>{expectedMoneyOut.toLocaleString()}</td>
                    <td>Total money out forecast items</td>
                  </tr>
                  <tr>
                    <td>Debt carried from {previousPeriod}</td>
                    <td>{carriedDebt.toLocaleString()}</td>
                    <td>{previousActualExpense.toLocaleString()} actual expense - {previousForecastOut.toLocaleString()} previous forecast</td>
                  </tr>
                  <tr>
                    <td>Total cash needed this month</td>
                    <td>{totalOutWithDebt.toLocaleString()}</td>
                    <td>Expected monthly expenses + carried debt</td>
                  </tr>
                  <tr>
                    <td>Tax reserve</td>
                    <td>{expectedTaxReserve.toLocaleString()}</td>
                    <td>Planned tax reserve for this month</td>
                  </tr>
                  <tr>
                    <td><strong>Projected closing cash</strong></td>
                    <td><strong>{closingAfterDebt.toLocaleString()}</strong></td>
                    <td>Opening cash + money in - total cash needed</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <form className="inline-form" action={statusAction}>
              <input type="hidden" name="forecastBudgetId" value={budget.id} />
              <select name="status" defaultValue={budget.status}>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
              <button type="submit">Update status</button>
            </form>
            <h3>Monthly budget by category</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Money in</th>
                    <th>Money out</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map((row) => (
                    <tr key={row.category}>
                      <td>{row.category.replaceAll('_', ' ')}</td>
                      <td>{row.moneyIn.toLocaleString()}</td>
                      <td>{row.moneyOut.toLocaleString()}</td>
                      <td>{(row.moneyIn - row.moneyOut).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr>
                    <td><strong>Total</strong></td>
                    <td><strong>{expectedMoneyIn.toLocaleString()}</strong></td>
                    <td><strong>{totalOutWithDebt.toLocaleString()}</strong></td>
                    <td><strong>{(expectedMoneyIn - totalOutWithDebt).toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3>Add forecast item</h3>
            <form className="filter-bar" action={itemAction}>
              <input type="hidden" name="forecastBudgetId" value={budget.id} />
              <select name="itemType" defaultValue="money_out">
                <option value="money_in">Money in</option>
                <option value="money_out">Money out</option>
                <option value="tax_reserve">Tax reserve</option>
                <option value="asset_purchase">Asset purchase</option>
                <option value="liability_payment">Liability payment</option>
                <option value="owner_equity">Owner equity</option>
              </select>
              <select name="category" required defaultValue="payroll">
                {forecastCategories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input name="description" placeholder="Description" />
              <select name="clientId" defaultValue="">
                <option value="">Company-level</option>
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              <input name="expectedDate" type="date" min={bounds.start} max={bounds.end} />
              <input name="expectedAmount" type="number" min="0" step="0.01" required placeholder="Amount" />
              <button type="submit">Add item</button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const client = Array.isArray(item.clients) ? item.clients[0] : item.clients
                    return (
                      <tr key={item.id}>
                        <td>{item.item_type}</td>
                        <td>{item.category}</td>
                        <td>{item.description ?? ''}</td>
                        <td>{client?.name ?? 'Company-level'}</td>
                        <td>{item.expected_date ?? ''}</td>
                        <td>{Number(item.expected_amount).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </main>
  )
}
