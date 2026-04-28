import Link from 'next/link'

import { updateTaskStatusFromForm } from '@/lib/actions/tasks'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

const statuses = ['backlog', 'assigned', 'in_progress', 'review', 'approved', 'completed', 'blocked', 'archived']

type TaskBoardPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function TaskBoardPage({ params }: TaskBoardPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, task_type, required_role, production_risk, clients(name)')
    .eq('organization_id', organization.id)
    .order('due_date', { ascending: true, nullsFirst: false })
  const updateAction = updateTaskStatusFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Task Board</h1>
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
