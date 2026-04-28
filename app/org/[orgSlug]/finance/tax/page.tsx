import { addBusinessExpenseFromForm, addCashflowTransactionFromForm } from '@/lib/actions/finance'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type TaxPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ month?: string }>
}

const taxableRevenueCategories = new Set(['client_retainer', 'project_payment', 'consulting_fee', 'performance_fee', 'other_income'])

function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return {
    start: `${month}-01`,
    end: new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10)
  }
}

export default async function TaxPage({ params, searchParams }: TaxPageProps) {
  const { orgSlug } = await params
  const query = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const month = query.month ?? new Date().toISOString().slice(0, 7)
  const bounds = monthBounds(month)
  const supabase = await createClient()
  const [{ data: transactions }, { data: expenses }, { data: payrollCycles }, { data: settings }, { data: accounts }] = await Promise.all([
    supabase
      .from('cashflow_transactions')
      .select('id, transaction_date, direction, category, amount, payment_method, notes')
      .eq('organization_id', organization.id)
      .gte('transaction_date', bounds.start)
      .lt('transaction_date', bounds.end)
      .order('transaction_date', { ascending: false }),
    supabase
      .from('business_expenses')
      .select('id, expense_date, due_date, paid_date, category, vendor_name, total_amount, status')
      .eq('organization_id', organization.id)
      .eq('category', 'tax_payment')
      .order('expense_date', { ascending: false }),
    supabase
      .from('payroll_cycles')
      .select('id, period_month, tax_withholding, status')
      .eq('organization_id', organization.id)
      .eq('period_month', month),
    supabase
      .from('finance_control_settings')
      .select('tax_reserve_rate')
      .eq('organization_id', organization.id)
      .single(),
    supabase
      .from('business_accounts')
      .select('id, account_name')
      .eq('organization_id', organization.id)
      .eq('status', 'active')
      .order('account_name')
  ])
  const addTaxExpenseAction = addBusinessExpenseFromForm.bind(null, organization.id, orgSlug)
  const addTaxPaymentAction = addCashflowTransactionFromForm.bind(null, organization.id, orgSlug)
  const rows = transactions ?? []
  const taxableRevenue = rows
    .filter((transaction) => transaction.direction === 'money_in' && taxableRevenueCategories.has(transaction.category))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const taxReserveRate = Number(settings?.tax_reserve_rate ?? 0)
  const targetTaxReserve = taxableRevenue * taxReserveRate
  const taxPaid = rows
    .filter((transaction) => transaction.direction === 'money_out' && transaction.category === 'tax_payment')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
  const openTaxExpenses = (expenses ?? []).filter((expense) => ['unpaid', 'scheduled', 'overdue'].includes(expense.status))
  const taxPayable = openTaxExpenses.reduce((sum, expense) => sum + Number(expense.total_amount), 0)
  const payrollWithholding = (payrollCycles ?? [])
    .filter((cycle) => cycle.status !== 'paid')
    .reduce((sum, cycle) => sum + Number(cycle.tax_withholding), 0)
  const reserveGap = targetTaxReserve - taxPaid

  return (
    <main className="shell">
      <h1>Tax</h1>
      <div className="actions">
        <a href={`/api/exports/tax-summary?orgSlug=${orgSlug}&month=${month}`}>Export CSV</a>
      </div>
      <form className="filter-bar">
        <label>Month<input name="month" pattern="\d{4}-\d{2}" defaultValue={month} /></label>
        <button type="submit">Filter</button>
      </form>
      <div className="grid">
        <div className="card"><strong>Taxable Revenue</strong><p>{taxableRevenue.toLocaleString()}</p></div>
        <div className="card"><strong>Tax Reserve Rate</strong><p>{(taxReserveRate * 100).toLocaleString()}%</p></div>
        <div className="card"><strong>Target Tax Reserve</strong><p>{targetTaxReserve.toLocaleString()}</p></div>
        <div className="card"><strong>Tax Paid</strong><p>{taxPaid.toLocaleString()}</p></div>
        <div className="card"><strong>Tax Reserve Gap</strong><p>{reserveGap.toLocaleString()}</p></div>
        <div className="card"><strong>Tax Payable</strong><p>{taxPayable.toLocaleString()}</p></div>
        <div className="card"><strong>Payroll Withholding Open</strong><p>{payrollWithholding.toLocaleString()}</p></div>
      </div>
      <section className="card">
        <h2>Add tax obligation</h2>
        <form className="form" action={addTaxExpenseAction}>
          <input type="hidden" name="category" value="tax_payment" />
          <label>Expense date<input name="expenseDate" type="date" required /></label>
          <label>Due date<input name="dueDate" type="date" /></label>
          <label>Tax authority<input name="vendorName" /></label>
          <label>Description<textarea name="description" rows={3} /></label>
          <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
          <input type="hidden" name="taxAmount" value="0" />
          <label>
            Status
            <select name="status" defaultValue="unpaid">
              <option value="unpaid">Unpaid</option>
              <option value="scheduled">Scheduled</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
          <button type="submit">Add obligation</button>
        </form>
      </section>
      <section className="card">
        <h2>Record tax payment</h2>
        <form className="form" action={addTaxPaymentAction}>
          <input type="hidden" name="direction" value="money_out" />
          <input type="hidden" name="category" value="tax_payment" />
          <label>Payment date<input name="transactionDate" type="date" required /></label>
          <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
          <label>
            Business account
            <select name="businessAccountId" defaultValue="">
              <option value="">No account</option>
              {(accounts ?? []).map((account) => (
                <option key={account.id} value={account.id}>{account.account_name}</option>
              ))}
            </select>
          </label>
          <label>Tax authority<input name="vendorName" /></label>
          <label>Payment method<input name="paymentMethod" /></label>
          <label>Notes<textarea name="notes" rows={3} /></label>
          <button type="submit">Record payment</button>
        </form>
      </section>
      <section>
        <h2>Tax obligations</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Due</th>
                <th>Authority</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(expenses ?? []).map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.expense_date}</td>
                  <td>{expense.due_date ?? ''}</td>
                  <td>{expense.vendor_name ?? ''}</td>
                  <td>{Number(expense.total_amount).toLocaleString()}</td>
                  <td>{expense.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Tax payments this month</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter((transaction) => transaction.direction === 'money_out' && transaction.category === 'tax_payment').map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.transaction_date}</td>
                  <td>{Number(transaction.amount).toLocaleString()}</td>
                  <td>{transaction.payment_method ?? ''}</td>
                  <td>{transaction.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
