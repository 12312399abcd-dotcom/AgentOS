import {
  inviteOrganizationMemberFromForm,
  updateMemberTimeLimitsFromForm,
  updateOrganizationMemberFromForm
} from '@/lib/actions/organizations'
import { getOrganizationBySlug, requireAdmin } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type MembersPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ inviteToken?: string }>
}

export default async function MembersPage({ params, searchParams }: MembersPageProps) {
  const { orgSlug } = await params
  const query = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireAdmin(organization.id)
  const supabase = await createClient()
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('id, user_id, role, status, profiles(full_name, email, daily_time_limit_minutes, weekly_time_limit_minutes)')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('organization_invitations')
      .select('id, email, role, token, status, expires_at')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
  ])
  const inviteAction = inviteOrganizationMemberFromForm.bind(null, organization.id, orgSlug)
  const updateLimitsAction = updateMemberTimeLimitsFromForm.bind(null, organization.id, orgSlug)
  const updateMemberAction = updateOrganizationMemberFromForm.bind(null, organization.id, orgSlug)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const createdInviteUrl = query.inviteToken ? `${siteUrl}/invite/${query.inviteToken}` : null

  return (
    <main className="shell">
      <h1>Members</h1>
      {createdInviteUrl ? (
        <div className="notice">
          Invitation created. Share this link with the invited user: <strong>{createdInviteUrl}</strong>
        </div>
      ) : null}
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
                <form className="inline-form" action={updateMemberAction}>
                  <input type="hidden" name="userId" value={member.user_id} />
                  <select name="role" defaultValue={member.role} aria-label="Member role">
                    <option value="admin">Admin</option>
                    <option value="finance_moderator">Finance moderator</option>
                    <option value="designer">Designer</option>
                    <option value="editor">Editor</option>
                    <option value="marketing">Marketing</option>
                    <option value="channel_manager">Channel manager</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <select name="status" defaultValue={member.status} aria-label="Member status">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="removed">Removed</option>
                  </select>
                  <button type="submit">Save access</button>
                </form>
                <form className="inline-form" action={updateLimitsAction}>
                  <input type="hidden" name="userId" value={member.user_id} />
                  <input name="dailyTimeLimitMinutes" type="number" min="0" defaultValue={profile?.daily_time_limit_minutes ?? 480} aria-label="Daily minutes" />
                  <input name="weeklyTimeLimitMinutes" type="number" min="0" defaultValue={profile?.weekly_time_limit_minutes ?? 2400} aria-label="Weekly minutes" />
                  <button type="submit">Save limits</button>
                </form>
              </div>
            )
          })}
        </div>
      </section>
      <section>
        <h2>Invitations</h2>
        <div className="grid">
          {(invitations ?? []).map((invitation) => {
            const expired = new Date(invitation.expires_at) < new Date()
            const displayStatus = invitation.status === 'pending' && expired ? 'expired' : invitation.status
            const inviteUrl = `${siteUrl}/invite/${invitation.token}`

            return (
              <div className="card" key={invitation.id}>
                <strong>{invitation.email}</strong>
                <p className="muted">{invitation.role}</p>
                <p>{displayStatus}</p>
                {displayStatus === 'pending' ? <p className="muted">{inviteUrl}</p> : null}
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
