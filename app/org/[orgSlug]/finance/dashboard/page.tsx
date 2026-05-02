import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type FinanceDashboardProps = {
  params: Promise<{ orgSlug: string }>
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

  const [{ data: transactions }, { data: accounts }, { data: settings }, { data: expenses }, { data: payrollCycles }, { data: forecast }] = await Promise.all([
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
      .maybeSingle()
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

  return (
    <main className="shell">
      <h1>Finance Dashboard</h1>
      <div className="grid">
        <div className="card"><strong>Current Cash</strong><p>{currentCash.toLocaleString()}</p></div>
        <div className="card"><strong>Money In MTD</strong><p>{moneyIn.toLocaleString()}</p></div>
        <div className="card"><strong>Money Out MTD</strong><p>{moneyOut.toLocaleString()}</p></div>
        <div className="card"><strong>Net Cashflow</strong><p>{(moneyIn - moneyOut).toLocaleString()}</p></div>
        <div className="card"><strong>Minimum Reserve</strong><p>{minimumReserve.toLocaleString()}</p></div>
        <div className="card"><strong>Accounts Payable</strong><p>{accountsPayable.toLocaleString()}</p></div>
        <div className="card"><strong>Cash Gap / Surplus</strong><p>{cashGap.toLocaleString()}</p></div>
        <div className="card"><strong>Cash Risk</strong><p>{cashRisk}</p></div>
        <div className="card"><strong>Payroll Due</strong><p>{payrollDue.toLocaleString()}</p></div>
        <div className="card"><strong>Payroll Gap</strong><p>{payrollGap.toLocaleString()}</p></div>
        <div className="card"><strong>Projected After Payroll</strong><p>{projectedCashAfterPayroll.toLocaleString()}</p></div>
        <div className="card"><strong>Payroll Risk</strong><p>{payrollRisk}</p></div>
        <div className="card"><strong>Projected Month-End Cash</strong><p>{projectedMonthEndCash.toLocaleString()}</p></div>
        <div className="card"><strong>Expected Remaining In</strong><p>{expectedRemainingIn.toLocaleString()}</p></div>
        <div className="card"><strong>Expected Remaining Out</strong><p>{expectedRemainingOut.toLocaleString()}</p></div>
        <div className="card"><strong>Spending Allowance</strong><p>{spendingAllowance.toLocaleString()}</p></div>
        <div className="card"><strong>Tax Reserve Needed</strong><p>{taxReserveNeeded.toLocaleString()}</p></div>
        <div className="card"><strong>Tax Paid</strong><p>{taxPaid.toLocaleString()}</p></div>
        <div className="card"><strong>Forecast Variance</strong><p>{forecastVariance.toLocaleString()}</p></div>
        <div className="card"><strong>Active Forecast</strong><p>{forecast ? `${forecast.forecast_month} · ${forecast.status}` : 'none'}</p></div>
      </div>
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
