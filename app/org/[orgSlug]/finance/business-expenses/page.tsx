import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type BusinessExpensesPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ clientId?: string; status?: string; category?: string; start?: string; end?: string }>
}

export default async function BusinessExpensesPage({ params, searchParams }: BusinessExpensesPageProps) {
  const { orgSlug } = await params
  const filters = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  let expensesQuery = supabase
    .from('business_expenses')
    .select('id, expense_date, due_date, paid_date, category, vendor_name, description, amount, tax_amount, total_amount, status, clients(name)')
    .eq('organization_id', organization.id)
    .order('expense_date', { ascending: false })
    .limit(100)

  if (filters.clientId) expensesQuery = expensesQuery.eq('client_id', filters.clientId)
  if (filters.status) expensesQuery = expensesQuery.eq('status', filters.status)
  if (filters.category) expensesQuery = expensesQuery.ilike('category', `%${filters.category}%`)
  if (filters.start) expensesQuery = expensesQuery.gte('expense_date', filters.start)
  if (filters.end) expensesQuery = expensesQuery.lte('expense_date', filters.end)

  const [{ data: expenses }, { data: clients }] = await Promise.all([
    expensesQuery,
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name')
  ])
  const unpaid = (expenses ?? []).filter((expense) => ['unpaid', 'scheduled', 'overdue'].includes(expense.status))
  const totalPayable = unpaid.reduce((sum, expense) => sum + Number(expense.total_amount), 0)
  const exportParams = new URLSearchParams({ orgSlug })
  if (filters.clientId) exportParams.set('clientId', filters.clientId)
  if (filters.status) exportParams.set('status', filters.status)
  if (filters.category) exportParams.set('category', filters.category)
  if (filters.start) exportParams.set('start', filters.start)
  if (filters.end) exportParams.set('end', filters.end)

  return (
    <main className="shell">
      <h1>Business Expenses</h1>
      <div className="actions">
        <a href={`/org/${orgSlug}/finance/journal`}>Add or pay expense in Journal</a>
        <a href={`/api/exports/business-expenses?${exportParams.toString()}`}>Export CSV</a>
      </div>
      <div className="notice">
        Expenses are entered and paid from Finance Journal. This page is the expense ledger view for filtering, audit, and export.
      </div>
      <div className="grid">
        <div className="card"><strong>Open Expenses</strong><p>{unpaid.length}</p></div>
        <div className="card"><strong>Accounts Payable</strong><p>{totalPayable.toLocaleString()}</p></div>
      </div>
      <section>
        <h2>Filters</h2>
        <form className="filter-bar">
          <select name="clientId" defaultValue={filters.clientId ?? ''}>
            <option value="">All clients</option>
            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={filters.status ?? ''}>
            <option value="">Any status</option>
            <option value="unpaid">Unpaid</option>
            <option value="scheduled">Scheduled</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input name="category" placeholder="Category" defaultValue={filters.category ?? ''} />
          <label>From<input name="start" type="date" defaultValue={filters.start ?? ''} /></label>
          <label>To<input name="end" type="date" defaultValue={filters.end ?? ''} /></label>
          <button type="submit">Filter</button>
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
