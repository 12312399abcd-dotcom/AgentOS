import { addCapitalTransactionFromForm } from '@/lib/actions/finance'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type CapitalLoansPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ transactionType?: string; start?: string; end?: string }>
}

export default async function CapitalLoansPage({ params, searchParams }: CapitalLoansPageProps) {
  const { orgSlug } = await params
  const filters = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  let transactionsQuery = supabase
    .from('capital_transactions')
    .select('id, transaction_date, transaction_type, amount, counterparty, notes, created_at')
    .eq('organization_id', organization.id)
    .order('transaction_date', { ascending: false })
    .limit(100)

  if (filters.transactionType) transactionsQuery = transactionsQuery.eq('transaction_type', filters.transactionType)
  if (filters.start) transactionsQuery = transactionsQuery.gte('transaction_date', filters.start)
  if (filters.end) transactionsQuery = transactionsQuery.lte('transaction_date', filters.end)

  const [{ data: transactions }, { data: accounts }, { data: settings }] = await Promise.all([
    transactionsQuery,
    supabase
      .from('business_accounts')
      .select('id, account_name')
      .eq('organization_id', organization.id)
      .eq('status', 'active')
      .order('account_name'),
    supabase
      .from('finance_control_settings')
      .select('minimum_cash_reserve, owner_draw_requires_reserve_check')
      .eq('organization_id', organization.id)
      .single()
  ])
  const addAction = addCapitalTransactionFromForm.bind(null, organization.id, orgSlug)
  const rows = transactions ?? []
  const ownerCapital = rows.filter((row) => row.transaction_type === 'owner_capital_injection').reduce((sum, row) => sum + Number(row.amount), 0)
  const ownerDraws = rows.filter((row) => row.transaction_type === 'owner_draw').reduce((sum, row) => sum + Number(row.amount), 0)
  const loansReceived = rows.filter((row) => row.transaction_type === 'loan_received').reduce((sum, row) => sum + Number(row.amount), 0)
  const loanRepayments = rows.filter((row) => row.transaction_type === 'loan_repayment').reduce((sum, row) => sum + Number(row.amount), 0)
  const dividends = rows.filter((row) => row.transaction_type === 'dividend_distribution').reduce((sum, row) => sum + Number(row.amount), 0)
  const outstandingDebt = loansReceived - loanRepayments

  return (
    <main className="shell">
      <h1>Capital / Loans</h1>
      <div className="grid">
        <div className="card"><strong>Owner Capital</strong><p>{ownerCapital.toLocaleString()}</p></div>
        <div className="card"><strong>Owner Draws</strong><p>{ownerDraws.toLocaleString()}</p></div>
        <div className="card"><strong>Loans Received</strong><p>{loansReceived.toLocaleString()}</p></div>
        <div className="card"><strong>Loan Repayments</strong><p>{loanRepayments.toLocaleString()}</p></div>
        <div className="card"><strong>Outstanding Debt</strong><p>{outstandingDebt.toLocaleString()}</p></div>
        <div className="card"><strong>Dividend Distributions</strong><p>{dividends.toLocaleString()}</p></div>
      </div>
      <section>
        <h2>Filters</h2>
        <form className="filter-bar">
          <select name="transactionType" defaultValue={filters.transactionType ?? ''}>
            <option value="">Any type</option>
            <option value="owner_capital_injection">Owner capital injection</option>
            <option value="owner_draw">Owner draw</option>
            <option value="loan_received">Loan received</option>
            <option value="loan_repayment">Loan repayment</option>
            <option value="dividend_distribution">Dividend distribution</option>
          </select>
          <label>From<input name="start" type="date" defaultValue={filters.start ?? ''} /></label>
          <label>To<input name="end" type="date" defaultValue={filters.end ?? ''} /></label>
          <button type="submit">Filter</button>
        </form>
      </section>
      <section className="card">
        <h2>Add capital transaction</h2>
        <form className="form" action={addAction}>
          <label>Transaction date<input name="transactionDate" type="date" required /></label>
          <label>
            Type
            <select name="transactionType" defaultValue="owner_capital_injection">
              <option value="owner_capital_injection">Owner capital injection</option>
              <option value="owner_draw">Owner draw</option>
              <option value="loan_received">Loan received</option>
              <option value="loan_repayment">Loan repayment</option>
              <option value="dividend_distribution">Dividend distribution</option>
            </select>
          </label>
          <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
          <label>Counterparty<input name="counterparty" placeholder="Owner, lender, shareholder" /></label>
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
          <label>Notes<textarea name="notes" rows={3} /></label>
          <label>Admin override note<input name="adminOverrideNote" placeholder="Required when owner draw breaks reserve" /></label>
          <button type="submit">Add transaction</button>
        </form>
      </section>
      <section className="card">
        <h2>Owner draw control</h2>
        <div className="grid">
          <div><strong>Minimum cash reserve</strong><p>{Number(settings?.minimum_cash_reserve ?? 0).toLocaleString()}</p></div>
          <div><strong>Reserve check</strong><p>{settings?.owner_draw_requires_reserve_check === false ? 'disabled' : 'enabled'}</p></div>
        </div>
      </section>
      <section>
        <h2>Capital history</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Counterparty</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.transaction_date}</td>
                  <td>{transaction.transaction_type}</td>
                  <td>{transaction.counterparty ?? ''}</td>
                  <td>{Number(transaction.amount).toLocaleString()}</td>
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
