import {
  addPayrollItemFromForm,
  approvePayrollCycleFromForm,
  createPayrollCycleFromForm,
  payPayrollCycleFromForm
} from '@/lib/actions/payroll'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type PayrollPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function PayrollPage({ params }: PayrollPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  const [{ data: cycles }, { data: members }, { data: accounts }, { data: settings }, { data: transactions }] = await Promise.all([
    supabase
      .from('payroll_cycles')
      .select('id, period_month, payroll_due_date, total_gross_pay, total_net_pay, tax_withholding, status, paid_at, payroll_items(id, payee_name, payee_type, gross_amount, tax_amount, net_amount, payment_status, paid_date, profiles(full_name, email))')
      .eq('organization_id', organization.id)
      .order('period_month', { ascending: false }),
    supabase
      .from('organization_members')
      .select('user_id, role, profiles(full_name, email)')
      .eq('organization_id', organization.id)
      .eq('status', 'active'),
    supabase.from('business_accounts').select('id, account_name, opening_balance').eq('organization_id', organization.id).eq('status', 'active').order('account_name'),
    supabase.from('finance_control_settings').select('minimum_cash_reserve').eq('organization_id', organization.id).single(),
    supabase.from('cashflow_transactions').select('direction, amount').eq('organization_id', organization.id)
  ])
  const createAction = createPayrollCycleFromForm.bind(null, organization.id, orgSlug)
  const itemAction = addPayrollItemFromForm.bind(null, organization.id, orgSlug)
  const approveAction = approvePayrollCycleFromForm.bind(null, organization.id, orgSlug)
  const payAction = payPayrollCycleFromForm.bind(null, organization.id, orgSlug)
  const openingCash = (accounts ?? []).reduce((sum, account) => sum + Number(account.opening_balance), 0)
  const moneyIn = (transactions ?? []).filter((item) => item.direction === 'money_in').reduce((sum, item) => sum + Number(item.amount), 0)
  const moneyOut = (transactions ?? []).filter((item) => item.direction === 'money_out').reduce((sum, item) => sum + Number(item.amount), 0)
  const currentCash = openingCash + moneyIn - moneyOut
  const minimumReserve = Number(settings?.minimum_cash_reserve ?? 0)
  const nextCycle = (cycles ?? []).find((cycle) => ['planned', 'reserved', 'approved', 'partial_paid', 'blocked'].includes(cycle.status))
  const payrollDue = Number(nextCycle?.total_net_pay ?? 0)
  const payrollGap = currentCash - payrollDue
  const projectedCashAfterPayroll = currentCash - payrollDue
  const payrollRisk = payrollGap < 0 ? 'critical' : projectedCashAfterPayroll < minimumReserve ? 'high' : 'normal'
  const defaultMonth = new Date().toISOString().slice(0, 7)

  return (
    <main className="shell">
      <h1>Payroll</h1>
      <div className="grid">
        <div className="card"><strong>Current Cash</strong><p>{currentCash.toLocaleString()}</p></div>
        <div className="card"><strong>Payroll Due</strong><p>{payrollDue.toLocaleString()}</p></div>
        <div className="card"><strong>Payroll Gap</strong><p>{payrollGap.toLocaleString()}</p></div>
        <div className="card"><strong>Projected After Payroll</strong><p>{projectedCashAfterPayroll.toLocaleString()}</p></div>
        <div className="card"><strong>Minimum Reserve</strong><p>{minimumReserve.toLocaleString()}</p></div>
        <div className="card"><strong>Payroll Risk</strong><p>{payrollRisk}</p></div>
      </div>
      <section className="card">
        <h2>Create payroll cycle</h2>
        <form className="form" action={createAction}>
          <label>Period month<input name="periodMonth" required pattern="\d{4}-\d{2}" defaultValue={defaultMonth} /></label>
          <label>Payroll due date<input name="payrollDueDate" type="date" required /></label>
          <button type="submit">Create cycle</button>
        </form>
      </section>
      {(cycles ?? []).map((cycle) => (
        <section className="card" key={cycle.id}>
          <h2>{cycle.period_month} · {cycle.status}</h2>
          <div className="grid">
            <div><strong>Due date</strong><p>{cycle.payroll_due_date}</p></div>
            <div><strong>Gross</strong><p>{Number(cycle.total_gross_pay).toLocaleString()}</p></div>
            <div><strong>Net</strong><p>{Number(cycle.total_net_pay).toLocaleString()}</p></div>
            <div><strong>Tax withholding</strong><p>{Number(cycle.tax_withholding).toLocaleString()}</p></div>
          </div>
          <h3>Add payroll item</h3>
          <form className="filter-bar" action={itemAction}>
            <input type="hidden" name="payrollCycleId" value={cycle.id} />
            <select name="userId" defaultValue="">
              <option value="">External payee</option>
              {(members ?? []).map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                return (
                  <option key={member.user_id} value={member.user_id}>{profile?.full_name ?? profile?.email ?? member.role}</option>
                )
              })}
            </select>
            <input name="payeeName" placeholder="Payee name" />
            <select name="payeeType" defaultValue="employee">
              <option value="employee">Employee</option>
              <option value="contractor">Contractor</option>
              <option value="freelancer">Freelancer</option>
              <option value="owner_salary">Owner salary</option>
            </select>
            <input name="grossAmount" type="number" min="0" step="0.01" required placeholder="Gross" />
            <input name="taxAmount" type="number" min="0" step="0.01" defaultValue="0" placeholder="Tax" />
            <button type="submit">Add item</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Payee</th>
                  <th>Type</th>
                  <th>Gross</th>
                  <th>Tax</th>
                  <th>Net</th>
                  <th>Status</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {(cycle.payroll_items ?? []).map((item) => {
                  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
                  return (
                    <tr key={item.id}>
                      <td>{profile?.full_name ?? profile?.email ?? item.payee_name ?? 'Payee'}</td>
                      <td>{item.payee_type}</td>
                      <td>{Number(item.gross_amount).toLocaleString()}</td>
                      <td>{Number(item.tax_amount).toLocaleString()}</td>
                      <td>{Number(item.net_amount).toLocaleString()}</td>
                      <td>{item.payment_status}</td>
                      <td>{item.paid_date ?? ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="actions">
            {cycle.status === 'planned' || cycle.status === 'reserved' ? (
              <form action={approveAction}>
                <input type="hidden" name="payrollCycleId" value={cycle.id} />
                <button type="submit">Approve payroll</button>
              </form>
            ) : null}
            {['approved', 'partial_paid'].includes(cycle.status) ? (
              <form className="inline-form" action={payAction}>
                <input type="hidden" name="payrollCycleId" value={cycle.id} />
                <input name="paidDate" type="date" required />
                <select name="businessAccountId" defaultValue="">
                  <option value="">No account</option>
                  {(accounts ?? []).map((account) => (
                    <option key={account.id} value={account.id}>{account.account_name}</option>
                  ))}
                </select>
                <input name="paymentMethod" placeholder="Payment method" />
                <button type="submit">Pay payroll</button>
              </form>
            ) : null}
          </div>
        </section>
      ))}
    </main>
  )
}
