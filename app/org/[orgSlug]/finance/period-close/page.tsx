import { closeFinancialPeriodFromForm, createFinancialPeriodFromForm } from '@/lib/actions/forecasts'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type PeriodClosePageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function PeriodClosePage({ params }: PeriodClosePageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  const [{ data: periods }, { data: forecasts }, { data: snapshots }] = await Promise.all([
    supabase
      .from('financial_periods')
      .select('id, period_month, period_start, period_end, opening_cash, closing_cash, projected_closing_cash, actual_closing_cash, minimum_cash_reserve, tax_reserve_rate, cash_risk_status, status, forecast_budgets(forecast_month)')
      .eq('organization_id', organization.id)
      .order('period_month', { ascending: false }),
    supabase
      .from('forecast_budgets')
      .select('id, forecast_month, status, opening_cash')
      .eq('organization_id', organization.id)
      .order('forecast_month', { ascending: false })
      ,
    supabase
      .from('balance_sheet_snapshots')
      .select('id, period_month, total_assets, total_liabilities, total_equity, balance_status, created_at')
      .eq('organization_id', organization.id)
      .order('period_month', { ascending: false })
  ])
  const createAction = createFinancialPeriodFromForm.bind(null, organization.id, orgSlug)
  const closeAction = closeFinancialPeriodFromForm.bind(null, organization.id, orgSlug)
  const defaultMonth = new Date().toISOString().slice(0, 7)

  return (
    <main className="shell">
      <h1>Period Close</h1>
      <section className="card">
        <h2>Create financial period</h2>
        <form className="form" action={createAction}>
          <label>Period month<input name="periodMonth" required pattern="\d{4}-\d{2}" defaultValue={defaultMonth} /></label>
          <label>
            Forecast
            <select name="forecastBudgetId" defaultValue="">
              <option value="">No forecast</option>
              {(forecasts ?? []).map((forecast) => (
                <option key={forecast.id} value={forecast.id}>{forecast.forecast_month} · {forecast.status}</option>
              ))}
            </select>
          </label>
          <label>Opening cash<input name="openingCash" type="number" step="0.01" defaultValue="0" /></label>
          <button type="submit">Create period</button>
        </form>
      </section>
      <section>
        <h2>Financial periods</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th>Opening</th>
                <th>Projected Close</th>
                <th>Actual Close</th>
                <th>Reserve</th>
                <th>Cash Risk</th>
                <th>Close</th>
              </tr>
            </thead>
            <tbody>
              {(periods ?? []).map((period) => (
                <tr key={period.id}>
                  <td>{period.period_month}</td>
                  <td>{period.status}</td>
                  <td>{period.period_start ?? ''}</td>
                  <td>{period.period_end ?? ''}</td>
                  <td>{Number(period.opening_cash).toLocaleString()}</td>
                  <td>{Number(period.projected_closing_cash).toLocaleString()}</td>
                  <td>{Number(period.actual_closing_cash).toLocaleString()}</td>
                  <td>{Number(period.minimum_cash_reserve).toLocaleString()}</td>
                  <td>{period.cash_risk_status}</td>
                  <td>
                    {period.status !== 'locked' ? (
                      <form className="inline-form" action={closeAction}>
                        <input type="hidden" name="periodMonth" value={period.period_month} />
                        <input name="reviewNotes" placeholder="Review notes" />
                        <input name="adminOverrideNote" placeholder="Override note if out of balance" />
                        <button type="submit">Close</button>
                      </form>
                    ) : 'Locked'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Balance sheet snapshots</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Assets</th>
                <th>Liabilities</th>
                <th>Equity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(snapshots ?? []).map((snapshot) => (
                <tr key={snapshot.id}>
                  <td>{snapshot.period_month}</td>
                  <td>{Number(snapshot.total_assets).toLocaleString()}</td>
                  <td>{Number(snapshot.total_liabilities).toLocaleString()}</td>
                  <td>{Number(snapshot.total_equity).toLocaleString()}</td>
                  <td>{snapshot.balance_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
