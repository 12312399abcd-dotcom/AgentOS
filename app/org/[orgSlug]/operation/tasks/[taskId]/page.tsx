import Link from 'next/link'

import {
  assignTaskFromForm,
  markTaskBlockedFromForm,
  updateTaskDueDateFromForm,
  updateTaskStatusFromForm
} from '@/lib/actions/tasks'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type TaskDetailPageProps = {
  params: Promise<{ orgSlug: string; taskId: string }>
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { orgSlug, taskId } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const [{ data: task }, { data: members }, { data: dependentTasks }] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        'id, title, description, status, priority, due_date, task_type, required_role, booking_source, production_risk, owner_id, reviewer_id, dependency_task_id, clients(name), content_items(id, title, status, publish_date)'
      )
      .eq('organization_id', organization.id)
      .eq('id', taskId)
      .single(),
    supabase
      .from('organization_members')
      .select('user_id, role, profiles(full_name, email)')
      .eq('organization_id', organization.id)
      .eq('status', 'active'),
    supabase
      .from('tasks')
      .select('id, title, status')
      .eq('organization_id', organization.id)
      .eq('dependency_task_id', taskId)
  ])

  if (!task) {
    return (
      <main className="shell">
        <h1>Task not found</h1>
      </main>
    )
  }

  const client = Array.isArray(task.clients) ? task.clients[0] : task.clients
  const content = Array.isArray(task.content_items) ? task.content_items[0] : task.content_items
  const statusAction = updateTaskStatusFromForm.bind(null, organization.id, orgSlug)
  const assignAction = assignTaskFromForm.bind(null, organization.id, orgSlug)
  const dueDateAction = updateTaskDueDateFromForm.bind(null, organization.id, orgSlug)
  const blockedAction = markTaskBlockedFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <Link href={`/org/${orgSlug}/operation/tasks`}>Back to tasks</Link>
      <h1>{task.title}</h1>
      <div className="grid">
        <section className="card">
          <h2>Overview</h2>
          <p><strong>Status:</strong> {task.status}</p>
          <p><strong>Priority:</strong> {task.priority}</p>
          <p><strong>Due:</strong> {task.due_date ?? 'No due date'}</p>
          <p><strong>Type:</strong> {task.task_type ?? 'General'}</p>
          <p><strong>Required role:</strong> {task.required_role ?? 'None'}</p>
          <p><strong>Risk:</strong> {task.production_risk}</p>
          <p><strong>Booking source:</strong> {task.booking_source}</p>
          <p>{task.description}</p>
        </section>
        <section className="card">
          <h2>Linked records</h2>
          <p><strong>Client:</strong> {client?.name ?? 'No client'}</p>
          {content ? (
            <>
              <p><strong>Content:</strong> {content.title}</p>
              <p><strong>Content status:</strong> {content.status}</p>
              <p><strong>Publish date:</strong> {content.publish_date ?? 'No publish date'}</p>
            </>
          ) : (
            <p>No linked content item.</p>
          )}
        </section>
      </div>
      <section className="card">
        <h2>Update status</h2>
        <form className="inline-form" action={statusAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <select name="nextStatus" defaultValue={task.status}>
            <option value="backlog">Backlog</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="archived">Archived</option>
          </select>
          <button type="submit">Save status</button>
        </form>
      </section>
      <section className="card">
        <h2>Assignment</h2>
        <form className="form" action={assignAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <label>
            Owner
            <select name="ownerId" defaultValue={task.owner_id ?? ''}>
              <option value="">Unassigned</option>
              {(members ?? []).map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                return (
                  <option key={member.user_id} value={member.user_id}>{profile?.full_name ?? profile?.email ?? member.role}</option>
                )
              })}
            </select>
          </label>
          <label>
            Reviewer
            <select name="reviewerId" defaultValue={task.reviewer_id ?? ''}>
              <option value="">Unassigned</option>
              {(members ?? []).map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                return (
                  <option key={member.user_id} value={member.user_id}>{profile?.full_name ?? profile?.email ?? member.role}</option>
                )
              })}
            </select>
          </label>
          <button type="submit">Update assignment</button>
        </form>
      </section>
      <section className="card">
        <h2>Due date</h2>
        <form className="inline-form" action={dueDateAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <input name="dueDate" type="date" defaultValue={task.due_date ?? ''} />
          <button type="submit">Update due date</button>
        </form>
      </section>
      <section className="card">
        <h2>Block task</h2>
        <form className="form" action={blockedAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <label>
            Reason
            <textarea name="reason" rows={3} />
          </label>
          <button type="submit">Mark blocked</button>
        </form>
      </section>
      <section>
        <h2>Dependent tasks</h2>
        <div className="grid">
          {(dependentTasks ?? []).map((dependentTask) => (
            <article className="card" key={dependentTask.id}>
              <strong>{dependentTask.title}</strong>
              <p>{dependentTask.status}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
