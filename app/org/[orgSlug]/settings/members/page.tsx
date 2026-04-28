import { inviteOrganizationMemberFromForm } from '@/lib/actions/organizations'
import { getOrganizationBySlug, requireAdmin } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type MembersPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireAdmin(organization.id)
  const supabase = await createClient()
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id, role, status, profiles(full_name, email)')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('organization_invitations')
      .select('id, email, role, status, expires_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
  ])
  const inviteAction = inviteOrganizationMemberFromForm.bind(null, organization.id)

  return (
    <main className="shell">
      <h1>Members</h1>
      <section className="card">
        <h2>Invite member</h2>
        <form className="form" action={inviteAction}>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Role
            <select name="role" defaultValue="designer">
              <option value="finance_moderator">Finance moderator</option>
              <option value="designer">Designer</option>
              <option value="editor">Editor</option>
              <option value="marketing">Marketing</option>
              <option value="channel_manager">Channel manager</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <button type="submit">Create invitation</button>
        </form>
      </section>
      <section>
        <h2>Active members</h2>
        <div className="grid">
          {(members ?? []).map((member) => {
            const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles

            return (
              <div className="card" key={member.id}>
                <strong>{profile?.full_name ?? profile?.email ?? 'Member'}</strong>
                <p className="muted">{profile?.email}</p>
                <p>{member.role}</p>
              </div>
            )
          })}
        </div>
      </section>
      <section>
        <h2>Invitations</h2>
        <div className="grid">
          {(invitations ?? []).map((invitation) => (
            <div className="card" key={invitation.id}>
              <strong>{invitation.email}</strong>
              <p className="muted">{invitation.role}</p>
              <p>{invitation.status}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
