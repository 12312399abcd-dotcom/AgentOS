import Link from 'next/link'

import { updateTaskStatusFromForm } from '@/lib/actions/tasks'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

const statuses = ['backlog', 'assigned', 'in_progress', 'review', 'approved', 'completed', 'blocked', 'archived']

type TaskBoardPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ clientId?: string; status?: string; requiredRole?: string }>
}

export default async function TaskBoardPage({ params, searchParams }: TaskBoardPageProps) {
  const { orgSlug } = await params
  const filters = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  let tasksQuery = supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, task_type, required_role, production_risk, clients(name)')
    .eq('organization_id', organization.id)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (filters.clientId) tasksQuery = tasksQuery.eq('client_id', filters.clientId)
  if (filters.status) tasksQuery = tasksQuery.eq('status', filters.status)
  if (filters.requiredRole) tasksQuery = tasksQuery.eq('required_role', filters.requiredRole)

  const [{ data: tasks }, { data: clients }] = await Promise.all([
    tasksQuery,
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name')
  ])
  const updateAction = updateTaskStatusFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Task Board</h1>
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
            {statuses.map((status) => (
              <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
            ))}
          </select>
          <select name="requiredRole" defaultValue={filters.requiredRole ?? ''}>
            <option value="">Any role</option>
            <option value="designer">Designer</option>
            <option value="editor">Editor</option>
            <option value="marketing">Marketing</option>
            <option value="channel_manager">Channel manager</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit">Filter</button>
        </form>
      </section>
      <div className="board">
        {statuses.map((status) => (
          <section className="board-column" key={status}>
            <h2>{status.replaceAll('_', ' ')}</h2>
            {(tasks ?? [])
              .filter((task) => task.status === status)
              .map((task) => {
                const client = Array.isArray(task.clients) ? task.clients[0] : task.clients

                return (
                  <article className="card" key={task.id}>
                    <Link href={`/org/${orgSlug}/operation/tasks/${task.id}`}><strong>{task.title}</strong></Link>
                    <p className="muted">{client?.name ?? 'No client'} · {task.required_role ?? task.task_type ?? 'General'}</p>
                    <p>{task.due_date ?? 'No due date'} · {task.priority}</p>
                    <p>Risk: {task.production_risk}</p>
                    <form action={updateAction} className="inline-form">
                      <input type="hidden" name="taskId" value={task.id} />
                      <select name="nextStatus" defaultValue={task.status}>
                        {statuses.map((nextStatus) => (
                          <option key={nextStatus} value={nextStatus}>{nextStatus.replaceAll('_', ' ')}</option>
                        ))}
                      </select>
                      <button type="submit">Move</button>
                    </form>
                  </article>
                )
              })}
          </section>
        ))}
      </div>
    </main>
  )
}
