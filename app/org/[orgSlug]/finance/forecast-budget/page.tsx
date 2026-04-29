import {
  addForecastBudgetItemFromForm,
  createForecastBudgetFromForm,
  updateForecastStatusFromForm
} from '@/lib/actions/forecasts'
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

  const [{ data: budgets }, { data: clients }] = await Promise.all([
    budgetsQuery,
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name')
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
        const filteredItems = (budget.forecast_budget_items ?? []).filter((item) => {
          if (filters.clientId && item.client_id !== filters.clientId) return false
          if (filters.category && !item.category.toLowerCase().includes(filters.category.toLowerCase())) return false
          return true
        })

        return (
          <section className="card" key={budget.id}>
            <h2>{budget.forecast_month} · {budget.status}</h2>
            <div className="grid">
              <div><strong>Opening cash</strong><p>{Number(budget.opening_cash).toLocaleString()}</p></div>
              <div><strong>Expected in</strong><p>{Number(budget.expected_money_in).toLocaleString()}</p></div>
              <div><strong>Expected out</strong><p>{Number(budget.expected_money_out).toLocaleString()}</p></div>
              <div><strong>Tax reserve</strong><p>{Number(budget.expected_tax_reserve).toLocaleString()}</p></div>
              <div><strong>Expected closing</strong><p>{Number(budget.expected_closing_cash).toLocaleString()}</p></div>
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
              <input name="category" required placeholder="Category" />
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
