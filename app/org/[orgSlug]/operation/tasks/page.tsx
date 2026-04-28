import { createTaskFromForm, updateTaskStatusFromForm } from '@/lib/actions/tasks'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type OperationTasksPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function OperationTasksPage({ params }: OperationTasksPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const [{ data: tasks }, { data: clients }, { data: members }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, task_type, required_role, clients(name)')
      .eq('organization_id', organization.id)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name'),
    supabase
      .from('organization_members')
      .select('user_id, role, profiles(full_name, email)')
      .eq('organization_id', organization.id)
      .eq('status', 'active')
  ])
  const createAction = createTaskFromForm.bind(null, organization.id, orgSlug)
  const updateAction = updateTaskStatusFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Tasks</h1>
      <section className="card">
        <h2>Create task</h2>
        <form className="form" action={createAction}>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Client
            <select name="clientId" defaultValue="">
              <option value="">No client</option>
              {(clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea name="description" rows={3} />
          </label>
          <label>
            Owner
            <select name="ownerId" defaultValue="">
              <option value="">Unassigned</option>
              {(members ?? []).map((orgMember) => {
                const profile = Array.isArray(orgMember.profiles) ? orgMember.profiles[0] : orgMember.profiles

                return (
                  <option key={orgMember.user_id} value={orgMember.user_id}>
                    {profile?.full_name ?? profile?.email ?? orgMember.role}
                  </option>
                )
              })}
            </select>
          </label>
          <label>
            Required role
            <select name="requiredRole" defaultValue="">
              <option value="">None</option>
              <option value="designer">Designer</option>
              <option value="editor">Editor</option>
              <option value="marketing">Marketing</option>
              <option value="channel_manager">Channel manager</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <label>
            Task type
            <input name="taskType" placeholder="design, editing, publishing" />
          </label>
          <label>
            Priority
            <select name="priority" defaultValue="normal">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>
            Due date
            <input name="dueDate" type="date" />
          </label>
          <button type="submit">Create task</button>
        </form>
      </section>
      <section>
        <h2>Task list</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Client</th>
                <th>Status</th>
                <th>Due</th>
                <th>Role</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((task) => {
                const client = Array.isArray(task.clients) ? task.clients[0] : task.clients

                return (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{client?.name ?? 'No client'}</td>
                    <td>{task.status}</td>
                    <td>{task.due_date ?? 'No due date'}</td>
                    <td>{task.required_role ?? task.task_type ?? 'General'}</td>
                    <td>
                      <form action={updateAction} className="inline-form">
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
                        <button type="submit">Save</button>
                      </form>
                    </td>
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
