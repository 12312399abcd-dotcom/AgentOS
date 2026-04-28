import { archiveNotificationFromForm, markNotificationReadFromForm } from '@/lib/actions/notifications'
import { getOrganizationBySlug, requireOrgAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type NotificationsPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function NotificationsPage({ params }: NotificationsPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireOrgAccess(organization.id)
  const supabase = await createClient()
  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, status, link_url, created_at')
    .eq('organization_id', organization.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(100)

  const readAction = markNotificationReadFromForm.bind(null, organization.id, orgSlug)
  const archiveAction = archiveNotificationFromForm.bind(null, organization.id, orgSlug)
  const unreadCount = (notifications ?? []).filter((notification) => notification.status === 'unread').length

  return (
    <main className="shell">
      <h1>Notifications</h1>
      <div className="grid">
        <div className="card"><strong>Unread</strong><p>{unreadCount}</p></div>
        <div className="card"><strong>Total Active</strong><p>{notifications?.length ?? 0}</p></div>
      </div>
      <section>
        <h2>Notification center</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Type</th>
                <th>Title</th>
                <th>Message</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(notifications ?? []).map((notification) => (
                <tr key={notification.id}>
                  <td>{new Date(notification.created_at).toLocaleString()}</td>
                  <td>{notification.type}</td>
                  <td>{notification.link_url ? <a href={notification.link_url}>{notification.title}</a> : notification.title}</td>
                  <td>{notification.message ?? ''}</td>
                  <td>{notification.status}</td>
                  <td>
                    <form className="inline-form" action={readAction}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button type="submit" disabled={notification.status === 'read'}>Read</button>
                    </form>
                    <form className="inline-form" action={archiveAction}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <button type="submit">Archive</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
