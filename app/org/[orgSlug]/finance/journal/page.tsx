import {
  addBusinessExpenseFromForm,
  addCashflowTransactionFromForm,
  markBusinessExpensePaidFromForm
} from '@/lib/actions/finance'
import { expenseCategories, incomeCategories } from '@/lib/finance/categories'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type JournalPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function JournalPage({ params }: JournalPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  const [{ data: clients }, { data: accounts }, { data: openExpenses }, { data: recentTransactions }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name'),
    supabase.from('business_accounts').select('id, account_name').eq('organization_id', organization.id).eq('status', 'active').order('account_name'),
    supabase
      .from('business_expenses')
      .select('id, expense_date, due_date, category, vendor_name, total_amount, status')
      .eq('organization_id', organization.id)
      .in('status', ['unpaid', 'scheduled', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(20),
    supabase
      .from('cashflow_transactions')
      .select('id, transaction_date, direction, category, amount, vendor_name, payee_name')
      .eq('organization_id', organization.id)
      .order('transaction_date', { ascending: false })
      .limit(12)
  ])
  const addExpenseAction = addBusinessExpenseFromForm.bind(null, organization.id, orgSlug)
  const addIncomeAction = addCashflowTransactionFromForm.bind(null, organization.id, orgSlug)
  const paidAction = markBusinessExpensePaidFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Finance Journal</h1>
      <p className="muted">Enter money events here once. Cashflow, dashboard, expense tracking, statements, and period close calculate from these records.</p>
      <section className="journal-grid">
        <article className="card">
          <h2>Add expense</h2>
          <form className="form" action={addExpenseAction}>
            <label>Expense date<input name="expenseDate" type="date" required /></label>
            <label>Due date<input name="dueDate" type="date" /></label>
            <label>Paid date<input name="paidDate" type="date" /></label>
            <label>
              Category
              <select name="category" required defaultValue="software_subscription">
                {expenseCategories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>Vendor<input name="vendorName" /></label>
            <label>Description<textarea name="description" rows={3} /></label>
            <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
            <label>Tax<input name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" /></label>
            <label>
              Status
              <select name="status" defaultValue="unpaid">
                <option value="unpaid">Unpaid</option>
                <option value="scheduled">Scheduled</option>
                <option value="paid">Paid now</option>
              </select>
            </label>
            <label>
              Client
              <select name="clientId" defaultValue="">
                <option value="">Company-level</option>
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label>
              Business account
              <select name="businessAccountId" defaultValue="">
                <option value="">No account</option>
                {(accounts ?? []).map((account) => (
                  <option key={account.id} value={account.id}>{account.account_name}</option>
                ))}
              </select>
            </label>
            <label>Payment method<input name="paymentMethod" /></label>
            <button type="submit">Save journal expense</button>
          </form>
        </article>
        <article className="card">
          <h2>Add money in</h2>
          <form className="form" action={addIncomeAction}>
            <input type="hidden" name="direction" value="money_in" />
            <label>Transaction date<input name="transactionDate" type="date" required /></label>
            <label>
              Category
              <select name="category" required defaultValue="client_retainer">
                {incomeCategories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
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
            <label>
              Client
              <select name="clientId" defaultValue="">
                <option value="">Company-level</option>
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label>Source<input name="vendorName" /></label>
            <label>Payment method<input name="paymentMethod" /></label>
            <label>Notes<textarea name="notes" rows={3} /></label>
            <button type="submit">Save journal income</button>
          </form>
        </article>
      </section>
      <section className="card">
        <h2>Pay existing expense</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Expense</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {(openExpenses ?? []).map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.vendor_name ?? expense.category}</td>
                  <td>{expense.due_date ?? expense.expense_date}</td>
                  <td>{Number(expense.total_amount).toLocaleString()}</td>
                  <td>{expense.status}</td>
                  <td>
                    <form className="inline-form" action={paidAction}>
                      <input type="hidden" name="expenseId" value={expense.id} />
                      <input name="paidDate" type="date" required />
                      <select name="businessAccountId" defaultValue="">
                        <option value="">No account</option>
                        {(accounts ?? []).map((account) => (
                          <option key={account.id} value={account.id}>{account.account_name}</option>
                        ))}
                      </select>
                      <input name="paymentMethod" placeholder="Method" />
                      <button type="submit">Mark paid</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Recent journal impact</h2>
        <div className="grid">
          {(recentTransactions ?? []).map((transaction) => (
            <article className="card" key={transaction.id}>
              <strong>{transaction.category}</strong>
              <p>{transaction.transaction_date} · {transaction.direction}</p>
              <p>{Number(transaction.amount).toLocaleString()}</p>
              <p className="muted">{transaction.vendor_name ?? transaction.payee_name ?? 'Company-level'}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
