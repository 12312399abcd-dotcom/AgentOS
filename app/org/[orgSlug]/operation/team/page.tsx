import { updateOrganizationMemberFromForm } from '@/lib/actions/organizations'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type TeamPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  const currentMember = await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const { data: members } = await supabase
    .from('organization_members')
    .select('id, user_id, role, status, joined_at, profiles(full_name, email, daily_time_limit_minutes, weekly_time_limit_minutes)')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: true })

  const activeMembers = (members ?? []).filter((member) => member.status === 'active')
  const roleCounts = activeMembers.reduce<Record<string, number>>((acc, member) => {
    acc[member.role] = (acc[member.role] ?? 0) + 1
    return acc
  }, {})
  const canManageRoles = currentMember.role === 'admin'
  const updateMemberAction = updateOrganizationMemberFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Team</h1>
      <div className="grid">
        <div className="card"><strong>Active Members</strong><p>{activeMembers.length}</p></div>
        <div className="card"><strong>Operation Roles</strong><p>{Object.keys(roleCounts).length}</p></div>
        <div className="card"><strong>Admins</strong><p>{roleCounts.admin ?? 0}</p></div>
      </div>
      <section className="card">
        <h2>Role Mix</h2>
        <div className="chart-bars">
          {Object.entries(roleCounts).map(([role, count]) => (
            <div className="chart-bar-row" key={role}>
              <span>{role.replaceAll('_', ' ')}</span>
              <div><i style={{ width: `${Math.max((count / Math.max(activeMembers.length, 1)) * 100, 6)}%` }} /></div>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Members</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                {canManageRoles ? <th>Access</th> : null}
                <th>Daily Limit</th>
                <th>Weekly Limit</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles

                return (
                  <tr key={member.id}>
                    <td>{profile?.full_name ?? 'No name'}</td>
                    <td>{profile?.email ?? ''}</td>
                    <td>{member.role.replaceAll('_', ' ')}</td>
                    <td>{member.status}</td>
                    {canManageRoles ? (
                      <td>
                        <form className="inline-form compact-inline-form" action={updateMemberAction}>
                          <input type="hidden" name="userId" value={member.user_id} />
                          <input type="hidden" name="status" value={member.status} />
                          <select name="role" defaultValue={member.role} aria-label="Member role">
                            <option value="admin">Admin</option>
                            <option value="finance_moderator">Finance moderator</option>
                            <option value="designer">Designer</option>
                            <option value="editor">Editor</option>
                            <option value="marketing">Marketing</option>
                            <option value="channel_manager">Channel manager</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button type="submit">Save role</button>
                        </form>
                      </td>
                    ) : null}
                    <td>{profile?.daily_time_limit_minutes ?? ''}</td>
                    <td>{profile?.weekly_time_limit_minutes ?? ''}</td>
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
