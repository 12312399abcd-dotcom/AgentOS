import { getOrganizationBySlug, requireAdmin } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type AuditLogsPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    entityType?: string
    actorId?: string
    start?: string
    end?: string
    workspace?: string
  }>
}

function scrubSensitive(value: unknown) {
  if (!value || typeof value !== 'object') return value
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (['token', 'password', 'secret', 'service_role', 'authorization'].includes(key.toLowerCase())) {
      return '[hidden]'
    }
    return item
  }))
}

export default async function AuditLogsPage({ params, searchParams }: AuditLogsPageProps) {
  const { orgSlug } = await params
  const filters = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireAdmin(organization.id)
  const supabase = await createClient()
  let query = supabase
    .from('audit_logs')
    .select('id, actor_id, entity_type, entity_id, action, old_data, new_data, created_at, profiles(full_name, email)')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters.entityType) query = query.eq('entity_type', filters.entityType)
  if (filters.actorId) query = query.eq('actor_id', filters.actorId)
  if (filters.start) query = query.gte('created_at', `${filters.start}T00:00:00.000Z`)
  if (filters.end) query = query.lte('created_at', `${filters.end}T23:59:59.999Z`)

  const [{ data: logs }, { data: actors }] = await Promise.all([
    query,
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')
  ])

  const visibleLogs = (logs ?? []).filter((log) => {
    if (!filters.workspace) return true
    if (filters.workspace === 'finance') {
      return ['finance_control_settings', 'forecast_budget', 'forecast_budget_item', 'financial_period', 'cashflow_transaction', 'business_expense', 'capital_transaction', 'invoice', 'payroll_cycle', 'payroll_item'].includes(log.entity_type)
    }
    if (filters.workspace === 'operation') {
      return ['client', 'task', 'content_item', 'social_post', 'report', 'organization_invitation'].includes(log.entity_type)
    }
    return true
  })

  return (
    <main className="shell">
      <h1>Audit Logs</h1>
      <form className="filter-bar">
        <input name="entityType" placeholder="Entity type" defaultValue={filters.entityType ?? ''} />
        <select name="actorId" defaultValue={filters.actorId ?? ''}>
          <option value="">Any actor</option>
          {(actors ?? []).map((actor) => (
            <option key={actor.id} value={actor.id}>{actor.full_name ?? actor.email}</option>
          ))}
        </select>
        <select name="workspace" defaultValue={filters.workspace ?? ''}>
          <option value="">Any workspace</option>
          <option value="operation">Operation</option>
          <option value="finance">Finance</option>
        </select>
        <input name="start" type="date" defaultValue={filters.start ?? ''} />
        <input name="end" type="date" defaultValue={filters.end ?? ''} />
        <button type="submit">Filter</button>
      </form>
      <section>
        <h2>Recent activity</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Actor</th>
                <th>Entity</th>
                <th>Action</th>
                <th>Old Data</th>
                <th>New Data</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => {
                const actor = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles
                return (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{actor?.full_name ?? actor?.email ?? log.actor_id ?? 'System'}</td>
                    <td>{log.entity_type}</td>
                    <td>{log.action}</td>
                    <td><pre>{JSON.stringify(scrubSensitive(log.old_data), null, 2)}</pre></td>
                    <td><pre>{JSON.stringify(scrubSensitive(log.new_data), null, 2)}</pre></td>
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
