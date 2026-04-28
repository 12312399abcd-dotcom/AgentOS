import { addCashflowTransactionFromForm, createBusinessAccountFromForm } from '@/lib/actions/finance'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type CashflowPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function CashflowPage({ params }: CashflowPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  const [{ data: accounts }, { data: clients }, { data: transactions }] = await Promise.all([
    supabase.from('business_accounts').select('id, account_name, account_type, currency, opening_balance, status').eq('organization_id', organization.id).order('created_at', { ascending: false }),
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name'),
    supabase
      .from('cashflow_transactions')
      .select('id, transaction_date, direction, category, amount, vendor_name, payee_name, payment_method, notes, business_accounts(account_name), clients(name)')
      .eq('organization_id', organization.id)
      .order('transaction_date', { ascending: false })
      .limit(100)
  ])
  const accountAction = createBusinessAccountFromForm.bind(null, organization.id, orgSlug)
  const cashflowAction = addCashflowTransactionFromForm.bind(null, organization.id, orgSlug)
  const totalIn = (transactions ?? []).filter((item) => item.direction === 'money_in').reduce((sum, item) => sum + Number(item.amount), 0)
  const totalOut = (transactions ?? []).filter((item) => item.direction === 'money_out').reduce((sum, item) => sum + Number(item.amount), 0)

  return (
    <main className="shell">
      <h1>Cashflow</h1>
      <div className="actions">
        <a href={`/api/exports/cashflow?orgSlug=${orgSlug}`}>Export CSV</a>
      </div>
      <div className="grid">
        <div className="card"><strong>Total Money In</strong><p>{totalIn.toLocaleString()}</p></div>
        <div className="card"><strong>Total Money Out</strong><p>{totalOut.toLocaleString()}</p></div>
        <div className="card"><strong>Net Cashflow</strong><p>{(totalIn - totalOut).toLocaleString()}</p></div>
      </div>
      <section className="card">
        <h2>Add business account</h2>
        <form className="form" action={accountAction}>
          <label>Account name<input name="accountName" required /></label>
          <label>
            Account type
            <select name="accountType" defaultValue="bank">
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="wallet">Wallet</option>
              <option value="credit_card">Credit card</option>
              <option value="loan">Loan</option>
            </select>
          </label>
          <label>Currency<input name="currency" maxLength={3} defaultValue={organization.currency} /></label>
          <label>Opening balance<input name="openingBalance" type="number" step="0.01" defaultValue="0" /></label>
          <button type="submit">Create account</button>
        </form>
      </section>
      <section className="card">
        <h2>Add cashflow transaction</h2>
        <form className="form" action={cashflowAction}>
          <label>Transaction date<input name="transactionDate" type="date" required /></label>
          <label>
            Direction
            <select name="direction" defaultValue="money_in">
              <option value="money_in">Money in</option>
              <option value="money_out">Money out</option>
            </select>
          </label>
          <label>Category<input name="category" required placeholder="client_retainer, payroll, software_subscription" /></label>
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
          <label>Vendor<input name="vendorName" /></label>
          <label>Payee<input name="payeeName" /></label>
          <label>Payment method<input name="paymentMethod" /></label>
          <label>Notes<textarea name="notes" rows={3} /></label>
          <button type="submit">Add transaction</button>
        </form>
      </section>
      <section>
        <h2>Business accounts</h2>
        <div className="grid">
          {(accounts ?? []).map((account) => (
            <article className="card" key={account.id}>
              <strong>{account.account_name}</strong>
              <p>{account.account_type} · {account.currency}</p>
              <p>Opening: {Number(account.opening_balance).toLocaleString()}</p>
              <p>{account.status}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Transactions</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Direction</th>
                <th>Category</th>
                <th>Client / Vendor / Payee</th>
                <th>Amount</th>
                <th>Account</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).map((transaction) => {
                const account = Array.isArray(transaction.business_accounts) ? transaction.business_accounts[0] : transaction.business_accounts
                const client = Array.isArray(transaction.clients) ? transaction.clients[0] : transaction.clients

                return (
                  <tr key={transaction.id}>
                    <td>{transaction.transaction_date}</td>
                    <td>{transaction.direction}</td>
                    <td>{transaction.category}</td>
                    <td>{client?.name ?? transaction.vendor_name ?? transaction.payee_name ?? 'Company-level'}</td>
                    <td>{Number(transaction.amount).toLocaleString()}</td>
                    <td>{account?.account_name ?? ''}</td>
                    <td>{transaction.payment_method ?? ''}</td>
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
