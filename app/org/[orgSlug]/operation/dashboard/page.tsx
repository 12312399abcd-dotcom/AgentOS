import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type OperationDashboardProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function OperationDashboard({ params }: OperationDashboardProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()

  const [{ count: openTasks }, { count: overdueTasks }, { count: contentThisWeek }, { count: riskItems }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .not('status', 'in', '("completed","archived")'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .lt('due_date', new Date().toISOString().slice(0, 10))
      .not('status', 'in', '("completed","archived")'),
    supabase
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .gte('publish_date', new Date().toISOString().slice(0, 10)),
    supabase
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .in('production_risk', ['watch', 'high', 'blocked'])
  ])

  return (
    <main className="shell">
      <h1>Operation Dashboard</h1>
      <div className="grid">
        <div className="card"><strong>Open Tasks</strong><p>{openTasks ?? 0}</p></div>
        <div className="card"><strong>Overdue Tasks</strong><p>{overdueTasks ?? 0}</p></div>
        <div className="card"><strong>Upcoming Content</strong><p>{contentThisWeek ?? 0}</p></div>
        <div className="card"><strong>Production Risk</strong><p>{riskItems ?? 0}</p></div>
      </div>
    </main>
  )
}
