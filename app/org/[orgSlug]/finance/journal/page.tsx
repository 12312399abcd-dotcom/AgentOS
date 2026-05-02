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

function money(value: number) {
  return value.toLocaleString()
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
    <main className="shell finance-hkd">
      <div className="finance-hero-row">
        <div>
          <p className="auth-eyebrow">Sổ thu chi</p>
          <h1>Ghi khoản mới</h1>
          <p className="muted">Nhập thu hoặc chi một lần. Dashboard, dòng tiền, báo cáo và công nợ sẽ tự tính.</p>
        </div>
      </div>
      <section className="journal-grid">
        <article className="card">
          <h2>↙ Ghi chi phí</h2>
          <form className="form" action={addExpenseAction}>
            <label>Ngày phát sinh<input name="expenseDate" type="date" required /></label>
            <label>Ngày đến hạn<input name="dueDate" type="date" /></label>
            <label>Ngày đã trả<input name="paidDate" type="date" /></label>
            <label>
              Danh mục
              <select name="category" required defaultValue="software_subscription">
                {expenseCategories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>Nhà cung cấp<input name="vendorName" /></label>
            <label>Nội dung<textarea name="description" rows={3} /></label>
            <label>Số tiền<input name="amount" type="number" min="0" step="0.01" required /></label>
            <label>Thuế<input name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" /></label>
            <label>
              Trạng thái
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
            <button type="submit">Lưu khoản chi</button>
          </form>
        </article>
        <article className="card">
          <h2>↗ Ghi thu nhập</h2>
          <form className="form" action={addIncomeAction}>
            <input type="hidden" name="direction" value="money_in" />
            <label>Ngày nhận tiền<input name="transactionDate" type="date" required /></label>
            <label>
              Danh mục
              <select name="category" required defaultValue="client_retainer">
                {incomeCategories.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>Số tiền<input name="amount" type="number" min="0" step="0.01" required /></label>
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
            <label>Nguồn tiền<input name="vendorName" /></label>
            <label>Phương thức<input name="paymentMethod" /></label>
            <label>Ghi chú<textarea name="notes" rows={3} /></label>
            <button type="submit">Lưu khoản thu</button>
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
        <h2>Giao dịch gần đây</h2>
        <div className="transaction-feed">
          {(recentTransactions ?? []).map((transaction) => (
            <article className="transaction-row" key={transaction.id}>
              <div className={transaction.direction === 'money_in' ? 'transaction-icon is-income' : 'transaction-icon is-expense'}>
                {transaction.direction === 'money_in' ? '↗' : '↙'}
              </div>
              <div>
                <strong>{transaction.category.replaceAll('_', ' ')}</strong>
                <p>{transaction.transaction_date} · {transaction.vendor_name ?? transaction.payee_name ?? 'Company-level'}</p>
              </div>
              <span className={transaction.direction === 'money_in' ? 'is-income-text' : 'is-expense-text'}>
                {transaction.direction === 'money_in' ? '+' : '-'}{money(Number(transaction.amount))}
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
