import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type FinanceDashboardProps = {
  params: Promise<{ orgSlug: string }>
}

const chartColors = ['#2f6b4f', '#6f8f72', '#d49a3a', '#7b8ea3', '#a65f4d', '#4c6a92']

function addByCategory(rows: { category: string; amount: number | string }[]) {
  return rows.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + Number(item.amount)
    return acc
  }, {})
}

function topCategorySlices(categoryTotals: Record<string, number>, total: number) {
  return Object.entries(categoryTotals)
    .sort(([, first], [, second]) => second - first)
    .slice(0, 6)
    .map(([label, value], index) => ({
      label: label.replaceAll('_', ' '),
      value,
      color: chartColors[index % chartColors.length],
      percent: total > 0 ? (value / total) * 100 : 0
    }))
}

function conicGradient(slices: { color: string; percent: number }[]) {
  if (slices.length === 0 || slices.every((slice) => slice.percent === 0)) {
    return '#eef3f0'
  }

  let cursor = 0
  return slices
    .map((slice) => {
      const start = cursor
      cursor += slice.percent
      return `${slice.color} ${start}% ${cursor}%`
    })
    .join(', ')
}

export default async function FinanceDashboard({ params }: FinanceDashboardProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  const monthStart = startOfMonth.toISOString().slice(0, 10)
  const currentMonth = monthStart.slice(0, 7)
  const today = new Date().toISOString().slice(0, 10)
  const nextSevenDays = new Date()
  nextSevenDays.setDate(nextSevenDays.getDate() + 7)
  const nextSevenDaysIso = nextSevenDays.toISOString().slice(0, 10)

  const [
    { data: transactions },
    { data: accounts },
    { data: settings },
    { data: expenses },
    { data: payrollCycles },
    { data: forecast },
    { data: invoices }
  ] = await Promise.all([
    supabase
      .from('cashflow_transactions')
      .select('direction, amount, transaction_date, category')
      .eq('organization_id', organization.id),
    supabase
      .from('business_accounts')
      .select('opening_balance')
      .eq('organization_id', organization.id)
      .eq('status', 'active'),
    supabase
      .from('finance_control_settings')
      .select('minimum_cash_reserve, tax_reserve_rate')
      .eq('organization_id', organization.id)
      .single(),
    supabase
      .from('business_expenses')
      .select('id, due_date, total_amount, status, category, vendor_name')
      .eq('organization_id', organization.id)
      .in('status', ['unpaid', 'scheduled', 'overdue']),
    supabase
      .from('payroll_cycles')
      .select('id, payroll_due_date, total_net_pay, status')
      .eq('organization_id', organization.id)
      .in('status', ['planned', 'reserved', 'approved', 'partial_paid', 'blocked'])
      .order('payroll_due_date', { ascending: true }),
    supabase
      .from('forecast_budgets')
      .select('id, forecast_month, expected_money_in, expected_money_out, expected_tax_reserve, expected_closing_cash, status')
      .eq('organization_id', organization.id)
      .eq('forecast_month', currentMonth)
      .in('status', ['approved', 'active', 'closed'])
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('id, total_amount, due_date, status')
      .eq('organization_id', organization.id)
      .in('status', ['sent', 'partial_paid', 'overdue'])
  ])

  const allTransactions = transactions ?? []
  const moneyIn = allTransactions
    .filter((item) => item.direction === 'money_in' && item.transaction_date >= monthStart)
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const moneyOut = allTransactions
    .filter((item) => item.direction === 'money_out' && item.transaction_date >= monthStart)
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const openingCash = (accounts ?? []).reduce((sum, account) => sum + Number(account.opening_balance), 0)
  const lifetimeMoneyIn = allTransactions.filter((item) => item.direction === 'money_in').reduce((sum, item) => sum + Number(item.amount), 0)
  const lifetimeMoneyOut = allTransactions.filter((item) => item.direction === 'money_out').reduce((sum, item) => sum + Number(item.amount), 0)
  const currentCash = openingCash + lifetimeMoneyIn - lifetimeMoneyOut
  const minimumReserve = Number(settings?.minimum_cash_reserve ?? 0)
  const taxReserveRate = Number(settings?.tax_reserve_rate ?? 0)
  const taxableRevenue = allTransactions
    .filter((item) => item.direction === 'money_in' && item.transaction_date >= monthStart && ['client_retainer', 'project_payment', 'consulting_fee', 'performance_fee', 'other_income'].includes(item.category))
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const taxReserveNeeded = taxableRevenue * taxReserveRate
  const taxPaid = allTransactions
    .filter((item) => item.direction === 'money_out' && item.transaction_date >= monthStart && item.category === 'tax_payment')
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const accountsPayable = (expenses ?? []).reduce((sum, expense) => sum + Number(expense.total_amount), 0)
  const accountsReceivable = (invoices ?? []).reduce((sum, invoice) => sum + Number(invoice.total_amount), 0)
  const overdueReceivables = (invoices ?? []).filter((invoice) => invoice.status === 'overdue' || (invoice.due_date && invoice.due_date < today))
  const upcomingBills = (expenses ?? []).filter((expense) => expense.due_date && expense.due_date >= today && expense.due_date <= nextSevenDaysIso)
  const overdueExpenses = (expenses ?? []).filter((expense) => expense.due_date && expense.due_date < today)
  const expectedMoneyIn = Number(forecast?.expected_money_in ?? 0)
  const expectedMoneyOut = Number(forecast?.expected_money_out ?? 0)
  const expectedRemainingIn = Math.max(expectedMoneyIn - moneyIn, 0)
  const expectedRemainingOut = Math.max(expectedMoneyOut - moneyOut, 0)
  const projectedMonthEndCash = currentCash + expectedRemainingIn - expectedRemainingOut
  const cashGap = projectedMonthEndCash - minimumReserve
  const nextPayroll = payrollCycles?.[0]
  const payrollDue = Number(nextPayroll?.total_net_pay ?? 0)
  const payrollGap = currentCash - payrollDue
  const fixedExpensesDue = accountsPayable
  const projectedCashAfterPayroll = currentCash - payrollDue - fixedExpensesDue - Math.max(taxReserveNeeded - taxPaid, 0)
  const spendingAllowance = currentCash - payrollDue - fixedExpensesDue - Math.max(taxReserveNeeded - taxPaid, 0) - minimumReserve
  const forecastVariance = (moneyIn - moneyOut) - (expectedMoneyIn - expectedMoneyOut)
  const payrollRisk = payrollGap < 0 ? 'critical' : projectedCashAfterPayroll < minimumReserve ? 'high' : 'normal'
  const cashRisk = projectedMonthEndCash < 0 || payrollGap < 0 ? 'critical' : cashGap < 0 ? 'high' : 'normal'
  const cashflowSnapshot = [
    { label: 'Money in', value: moneyIn },
    { label: 'Money out', value: moneyOut },
    { label: 'Net cashflow', value: Math.max(moneyIn - moneyOut, 0) },
    { label: 'Forecast variance', value: Math.max(Math.abs(forecastVariance), 0) }
  ]
  const cashflowMax = Math.max(...cashflowSnapshot.map((item) => item.value), 1)
  const safetySnapshot = [
    { label: 'Current cash', value: currentCash },
    { label: 'Projected month-end', value: projectedMonthEndCash },
    { label: 'Minimum reserve', value: minimumReserve },
    { label: 'Spending allowance', value: Math.max(spendingAllowance, 0) }
  ]
  const safetyMax = Math.max(...safetySnapshot.map((item) => item.value), 1)
  const monthlyMoneyInRows = allTransactions.filter((item) => item.direction === 'money_in' && item.transaction_date >= monthStart)
  const monthlyMoneyOutRows = allTransactions.filter((item) => item.direction === 'money_out' && item.transaction_date >= monthStart)
  const moneyInSlices = topCategorySlices(addByCategory(monthlyMoneyInRows), moneyIn)
  const moneyOutSlices = topCategorySlices(addByCategory(monthlyMoneyOutRows), moneyOut)
  const forecastActualColumns = [
    { label: 'Money in', forecast: expectedMoneyIn, actual: moneyIn },
    { label: 'Money out', forecast: expectedMoneyOut, actual: moneyOut },
    { label: 'Net', forecast: Math.max(expectedMoneyIn - expectedMoneyOut, 0), actual: Math.max(moneyIn - moneyOut, 0) }
  ]
  const forecastColumnMax = Math.max(...forecastActualColumns.flatMap((item) => [item.forecast, item.actual]), 1)
  const obligationColumns = [
    { label: 'Payroll', value: payrollDue },
    { label: 'Bills', value: fixedExpensesDue },
    { label: 'Tax gap', value: Math.max(taxReserveNeeded - taxPaid, 0) },
    { label: 'Reserve', value: minimumReserve }
  ]
  const obligationMax = Math.max(...obligationColumns.map((item) => item.value), 1)
  const cashPositionColumns = [
    { label: 'Cash', value: currentCash },
    { label: 'Projected', value: projectedMonthEndCash },
    { label: 'After payroll', value: projectedCashAfterPayroll },
    { label: 'Allowance', value: Math.max(spendingAllowance, 0) }
  ]
  const cashPositionMax = Math.max(...cashPositionColumns.map((item) => item.value), 1)
  const profitNow = moneyIn - moneyOut
  const budgetIncrease = expectedMoneyOut > 0 ? ((moneyOut - expectedMoneyOut) / expectedMoneyOut) * 100 : 0
  const financeStatus =
    cashRisk === 'critical'
      ? 'Cash is critical'
      : cashRisk === 'high'
        ? 'Cash needs attention'
        : profitNow < 0
          ? 'Profit is negative this month'
          : accountsReceivable > accountsPayable
            ? 'Receivables can cover bills'
            : 'Cash is stable'

  return (
    <main className="shell">
      <h1>Finance Overview</h1>
      <section className="finance-question-grid">
        <article className="card finance-question-card">
          <span>Cash right now</span>
          <strong>{currentCash.toLocaleString()}</strong>
          <p>{cashGap >= 0 ? `${cashGap.toLocaleString()} above reserve` : `${Math.abs(cashGap).toLocaleString()} below reserve`}</p>
        </article>
        <article className="card finance-question-card">
          <span>Profit this month</span>
          <strong>{profitNow.toLocaleString()}</strong>
          <p>{moneyIn.toLocaleString()} in · {moneyOut.toLocaleString()} out</p>
        </article>
        <article className="card finance-question-card">
          <span>Money owed to you</span>
          <strong>{accountsReceivable.toLocaleString()}</strong>
          <p>{overdueReceivables.length} overdue invoice(s)</p>
        </article>
        <article className="card finance-question-card">
          <span>Bills you owe</span>
          <strong>{accountsPayable.toLocaleString()}</strong>
          <p>{overdueExpenses.length} overdue · {upcomingBills.length} due soon</p>
        </article>
        <article className="card finance-question-card">
          <span>Future cash</span>
          <strong>{projectedMonthEndCash.toLocaleString()}</strong>
          <p>{expectedRemainingIn.toLocaleString()} expected in · {expectedRemainingOut.toLocaleString()} expected out</p>
        </article>
        <article className="card finance-question-card">
          <span>Monthly budget change</span>
          <strong>{budgetIncrease.toFixed(0)}%</strong>
          <p>{forecast ? `${forecast.forecast_month} forecast` : 'No active forecast yet'}</p>
        </article>
      </section>
      <section className="card finance-readout">
        <h2>{financeStatus}</h2>
        <div className="finance-readout-grid">
          <p><strong>Safe to spend:</strong> {spendingAllowance.toLocaleString()}</p>
          <p><strong>Payroll gap:</strong> {payrollGap.toLocaleString()} · {payrollRisk}</p>
          <p><strong>Tax still needed:</strong> {Math.max(taxReserveNeeded - taxPaid, 0).toLocaleString()}</p>
          <p><strong>Forecast variance:</strong> {forecastVariance.toLocaleString()}</p>
        </div>
      </section>
      <section className="dashboard-chart-grid">
        <article className="card chart-panel">
          <h2>Cashflow MTD</h2>
          <div className="chart-bars">
            {cashflowSnapshot.map((item) => (
              <div className="chart-bar-row" key={item.label}>
                <span>{item.label}</span>
                <div><i style={{ width: `${Math.max((item.value / cashflowMax) * 100, 4)}%` }} /></div>
                <strong>{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="card chart-panel">
          <h2>Cash Safety</h2>
          <div className="chart-bars">
            {safetySnapshot.map((item) => (
              <div className="chart-bar-row" key={item.label}>
                <span>{item.label}</span>
                <div><i style={{ width: `${Math.max((item.value / safetyMax) * 100, 4)}%` }} /></div>
                <strong>{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="finance-visual-grid">
        <article className="card chart-panel">
          <h2>Forecast vs Actual</h2>
          <div className="column-chart">
            {forecastActualColumns.map((item) => (
              <div className="column-group" key={item.label}>
                <div className="column-pair">
                  <i className="column-forecast" style={{ height: `${Math.max((item.forecast / forecastColumnMax) * 100, 4)}%` }} />
                  <i className="column-actual" style={{ height: `${Math.max((item.actual / forecastColumnMax) * 100, 4)}%` }} />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span><i className="legend-forecast" /> Forecast</span>
            <span><i className="legend-actual" /> Actual</span>
          </div>
        </article>
        <article className="card chart-panel">
          <h2>Money Out Mix</h2>
          <div className="donut-chart-wrap">
            <div className="donut-chart" style={{ background: `conic-gradient(${conicGradient(moneyOutSlices)})` }}>
              <strong>{moneyOut.toLocaleString()}</strong>
              <span>out</span>
            </div>
            <div className="donut-legend">
              {moneyOutSlices.length > 0 ? moneyOutSlices.map((slice) => (
                <span key={slice.label}><i style={{ background: slice.color }} />{slice.label} · {slice.percent.toFixed(0)}%</span>
              )) : <span>No money out this month</span>}
            </div>
          </div>
        </article>
        <article className="card chart-panel">
          <h2>Money In Mix</h2>
          <div className="donut-chart-wrap">
            <div className="donut-chart" style={{ background: `conic-gradient(${conicGradient(moneyInSlices)})` }}>
              <strong>{moneyIn.toLocaleString()}</strong>
              <span>in</span>
            </div>
            <div className="donut-legend">
              {moneyInSlices.length > 0 ? moneyInSlices.map((slice) => (
                <span key={slice.label}><i style={{ background: slice.color }} />{slice.label} · {slice.percent.toFixed(0)}%</span>
              )) : <span>No money in this month</span>}
            </div>
          </div>
        </article>
        <article className="card chart-panel">
          <h2>Protected Cash Allocation</h2>
          <div className="column-chart column-chart-wide">
            {obligationColumns.map((item) => (
              <div className="column-group" key={item.label}>
                <div className="single-column">
                  <i style={{ height: `${Math.max((item.value / obligationMax) * 100, 4)}%` }} />
                </div>
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="card chart-panel finance-visual-wide">
          <h2>Cash Position</h2>
          <div className="finance-meter-grid">
            {cashPositionColumns.map((item) => (
              <div className="finance-meter" key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value.toLocaleString()}</strong>
                </div>
                <i style={{ width: `${Math.max((item.value / cashPositionMax) * 100, 4)}%` }} />
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="card">
        <h2>Forecast vs Actual</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Forecast</th>
                <th>Actual MTD</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Money in</td>
                <td>{expectedMoneyIn.toLocaleString()}</td>
                <td>{moneyIn.toLocaleString()}</td>
                <td>{(moneyIn - expectedMoneyIn).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Money out</td>
                <td>{expectedMoneyOut.toLocaleString()}</td>
                <td>{moneyOut.toLocaleString()}</td>
                <td>{(moneyOut - expectedMoneyOut).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Net cashflow</td>
                <td>{(expectedMoneyIn - expectedMoneyOut).toLocaleString()}</td>
                <td>{(moneyIn - moneyOut).toLocaleString()}</td>
                <td>{forecastVariance.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Upcoming Bills</h2>
        <div className="grid">
          {upcomingBills.map((expense) => (
            <article className="card" key={expense.id}>
              <strong>{expense.category}</strong>
              <p>{expense.vendor_name ?? 'Vendor not set'} · {expense.due_date}</p>
              <p>{Number(expense.total_amount).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Overdue Expenses</h2>
        <div className="grid">
          {overdueExpenses.map((expense) => (
            <article className="card" key={expense.id}>
              <strong>{expense.category}</strong>
              <p>{expense.vendor_name ?? 'Vendor not set'} · {expense.due_date}</p>
              <p>{Number(expense.total_amount).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
