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

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const weekEnd = new Date(today)
  weekEnd.setUTCDate(today.getUTCDate() + 7)
  const weekEndIso = weekEnd.toISOString().slice(0, 10)
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10)

  const [
    { count: activeClients },
    { count: openTasks },
    { count: overdueTasks },
    { count: contentThisWeek },
    { count: pendingReview },
    { count: readyToPublish },
    { count: publishedThisMonth },
    { count: riskItems },
    { data: workflowRows },
    { data: missingTaskContent }
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('status', 'active'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .not('status', 'in', '("completed","archived")'),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .lt('due_date', todayIso)
      .not('status', 'in', '("completed","archived")'),
    supabase
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .gte('publish_date', todayIso)
      .lte('publish_date', weekEndIso),
    supabase
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .in('status', ['internal_review', 'editing_done']),
    supabase
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'ready_to_publish'),
    supabase
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'published')
      .gte('publish_date', monthStart),
    supabase
      .from('content_items')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .in('production_risk', ['watch', 'high', 'blocked']),
    supabase.from('tasks').select('status').eq('organization_id', organization.id),
    supabase
      .from('content_items')
      .select('id, title, publish_date, requires_design, requires_editing, requires_channel_manager, tasks(id, required_role)')
      .eq('organization_id', organization.id)
      .eq('status', 'scheduled')
      .limit(20)
  ])
  const workflowCounts = (workflowRows ?? []).reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1
    return acc
  }, {})
  const contentMissingTasks = (missingTaskContent ?? []).filter((item) => {
    const tasks = Array.isArray(item.tasks) ? item.tasks : []
    const roles = new Set(tasks.map((task) => task.required_role))
    return (
      (item.requires_design && !roles.has('designer')) ||
      (item.requires_editing && !roles.has('editor')) ||
      (item.requires_channel_manager && !roles.has('channel_manager'))
    )
  })

  return (
    <main className="shell">
      <h1>Operation Dashboard</h1>
      <div className="grid">
        <div className="card"><strong>Active Clients</strong><p>{activeClients ?? 0}</p></div>
        <div className="card"><strong>Open Tasks</strong><p>{openTasks ?? 0}</p></div>
        <div className="card"><strong>Overdue Tasks</strong><p>{overdueTasks ?? 0}</p></div>
        <div className="card"><strong>Content This Week</strong><p>{contentThisWeek ?? 0}</p></div>
        <div className="card"><strong>Pending Review</strong><p>{pendingReview ?? 0}</p></div>
        <div className="card"><strong>Ready to Publish</strong><p>{readyToPublish ?? 0}</p></div>
        <div className="card"><strong>Published This Month</strong><p>{publishedThisMonth ?? 0}</p></div>
        <div className="card"><strong>Production Risk</strong><p>{riskItems ?? 0}</p></div>
      </div>
      <section>
        <h2>Workflow Health</h2>
        <div className="grid">
          {['backlog', 'assigned', 'in_progress', 'review', 'approved', 'completed', 'blocked'].map((status) => (
            <div className="card" key={status}>
              <strong>{status.replaceAll('_', ' ')}</strong>
              <p>{workflowCounts[status] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Content Calendar Snapshot</h2>
        <div className="card">
          <strong>Scheduled content missing production tasks</strong>
          <p>{contentMissingTasks.length}</p>
          {contentMissingTasks.length > 0 ? (
            <ul>
              {contentMissingTasks.slice(0, 5).map((item) => (
                <li key={item.id}>{item.title} · {item.publish_date ?? 'No publish date'}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </main>
  )
}
