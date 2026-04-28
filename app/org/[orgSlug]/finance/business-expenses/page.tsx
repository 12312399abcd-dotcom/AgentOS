import { addBusinessExpenseFromForm, markBusinessExpensePaidFromForm } from '@/lib/actions/finance'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type BusinessExpensesPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function BusinessExpensesPage({ params }: BusinessExpensesPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  const [{ data: expenses }, { data: clients }, { data: accounts }] = await Promise.all([
    supabase
      .from('business_expenses')
      .select('id, expense_date, due_date, paid_date, category, vendor_name, description, amount, tax_amount, total_amount, status, clients(name)')
      .eq('organization_id', organization.id)
      .order('expense_date', { ascending: false })
      .limit(100),
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name'),
    supabase.from('business_accounts').select('id, account_name').eq('organization_id', organization.id).eq('status', 'active').order('account_name')
  ])
  const addExpenseAction = addBusinessExpenseFromForm.bind(null, organization.id, orgSlug)
  const paidAction = markBusinessExpensePaidFromForm.bind(null, organization.id, orgSlug)
  const unpaid = (expenses ?? []).filter((expense) => ['unpaid', 'scheduled', 'overdue'].includes(expense.status))
  const totalPayable = unpaid.reduce((sum, expense) => sum + Number(expense.total_amount), 0)

  return (
    <main className="shell">
      <h1>Business Expenses</h1>
      <div className="grid">
        <div className="card"><strong>Open Expenses</strong><p>{unpaid.length}</p></div>
        <div className="card"><strong>Accounts Payable</strong><p>{totalPayable.toLocaleString()}</p></div>
      </div>
      <section className="card">
        <h2>Add expense</h2>
        <form className="form" action={addExpenseAction}>
          <label>Expense date<input name="expenseDate" type="date" required /></label>
          <label>Due date<input name="dueDate" type="date" /></label>
          <label>Paid date<input name="paidDate" type="date" /></label>
          <label>Category<input name="category" required placeholder="payroll, software_subscription, office_rent" /></label>
          <label>Vendor<input name="vendorName" /></label>
          <label>Description<textarea name="description" rows={3} /></label>
          <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
          <label>Tax<input name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" /></label>
          <label>
            Status
            <select name="status" defaultValue="unpaid">
              <option value="unpaid">Unpaid</option>
              <option value="scheduled">Scheduled</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
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
          <button type="submit">Add expense</button>
        </form>
      </section>
      <section>
        <h2>Expenses</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor / Client</th>
                <th>Total</th>
                <th>Status</th>
                <th>Paid Date</th>
                <th>Mark Paid</th>
              </tr>
            </thead>
            <tbody>
              {(expenses ?? []).map((expense) => {
                const client = Array.isArray(expense.clients) ? expense.clients[0] : expense.clients

                return (
                  <tr key={expense.id}>
                    <td>{expense.expense_date}</td>
                    <td>{expense.category}</td>
                    <td>{expense.vendor_name ?? client?.name ?? 'Company-level'}</td>
                    <td>{Number(expense.total_amount).toLocaleString()}</td>
                    <td>{expense.status}</td>
                    <td>{expense.paid_date ?? ''}</td>
                    <td>
                      {expense.status !== 'paid' && expense.status !== 'cancelled' ? (
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
                          <button type="submit">Paid</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
