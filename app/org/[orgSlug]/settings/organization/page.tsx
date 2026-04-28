import {
  updateFinanceControlSettingsFromForm,
  updateOrganizationSettingsFromForm
} from '@/lib/actions/organizations'
import { getOrganizationBySlug, requireAdmin } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type OrganizationSettingsPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function OrganizationSettingsPage({ params }: OrganizationSettingsPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireAdmin(organization.id)
  const supabase = await createClient()
  const [{ data: syncLogs }, { data: financeSettings }] = await Promise.all([
    supabase
      .from('notion_sync_logs')
      .select('id, notion_database_id, sync_mode, imported_count, updated_count, skipped_count, error_count, status, created_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('finance_control_settings')
      .select('payroll_cycle, reserve_months, minimum_cash_reserve, tax_reserve_rate, expense_variance_warning_percent, cash_risk_warning_days, strict_spending_control, owner_draw_requires_reserve_check')
      .eq('organization_id', organization.id)
      .single()
  ])
  const updateOrgAction = updateOrganizationSettingsFromForm.bind(null, organization.id, orgSlug)
  const updateFinanceAction = updateFinanceControlSettingsFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Organization Settings</h1>
      <section className="card">
        <h2>Organization</h2>
        <form className="form" action={updateOrgAction}>
          <label>Name<input name="name" required defaultValue={organization.name} /></label>
          <label>Slug<input name="slug" required defaultValue={organization.slug} /></label>
          <label>Timezone<input name="timezone" required defaultValue={organization.timezone} /></label>
          <label>Currency<input name="currency" required maxLength={3} defaultValue={organization.currency} /></label>
          <button type="submit">Save organization</button>
        </form>
      </section>
      <section className="card">
        <h2>Finance Controls</h2>
        <form className="form" action={updateFinanceAction}>
          <label>
            Payroll cycle
            <select name="payrollCycle" defaultValue={financeSettings?.payroll_cycle ?? 'beginning_of_month'}>
              <option value="beginning_of_month">Beginning of month</option>
              <option value="middle_of_month">Middle of month</option>
              <option value="end_of_month">End of month</option>
            </select>
          </label>
          <label>Reserve months<input name="reserveMonths" type="number" min="0" step="0.1" defaultValue={Number(financeSettings?.reserve_months ?? 1)} /></label>
          <label>Minimum cash reserve<input name="minimumCashReserve" type="number" min="0" step="0.01" defaultValue={Number(financeSettings?.minimum_cash_reserve ?? 0)} /></label>
          <label>Tax reserve rate<input name="taxReserveRate" type="number" min="0" step="0.001" defaultValue={Number(financeSettings?.tax_reserve_rate ?? 0)} /></label>
          <label>Expense variance warning %<input name="expenseVarianceWarningPercent" type="number" min="0" step="0.01" defaultValue={Number(financeSettings?.expense_variance_warning_percent ?? 10)} /></label>
          <label>Cash risk warning days<input name="cashRiskWarningDays" type="number" min="0" step="1" defaultValue={Number(financeSettings?.cash_risk_warning_days ?? 14)} /></label>
          <label className="checkbox-row"><input name="strictSpendingControl" type="checkbox" defaultChecked={financeSettings?.strict_spending_control ?? false} /> Strict spending control</label>
          <label className="checkbox-row"><input name="ownerDrawRequiresReserveCheck" type="checkbox" defaultChecked={financeSettings?.owner_draw_requires_reserve_check ?? true} /> Owner draw requires reserve check</label>
          <button type="submit">Save finance controls</button>
        </form>
      </section>
      <section className="card">
        <h2>Notion integration</h2>
        <p className="muted">Sync endpoint: /api/integrations/notion/sync-content</p>
        <p className="muted">The endpoint supports preview, import, and update with normalized Notion rows. Runtime Notion credential storage can be added when the production Notion app is connected.</p>
      </section>
      <section>
        <h2>Recent Notion sync logs</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Database</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Imported</th>
                <th>Updated</th>
                <th>Skipped</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {(syncLogs ?? []).map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.notion_database_id ?? ''}</td>
                  <td>{log.sync_mode}</td>
                  <td>{log.status}</td>
                  <td>{log.imported_count}</td>
                  <td>{log.updated_count}</td>
                  <td>{log.skipped_count}</td>
                  <td>{log.error_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
