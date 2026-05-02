import { scheduleContentFromForm } from '@/lib/actions/content'
import { getContentFilterOptions } from '@/lib/services/content-queries'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

type ScheduleContentPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function ScheduleContentPage({ params }: ScheduleContentPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const { clients, members } = await getContentFilterOptions(organization.id)
  const scheduleAction = scheduleContentFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Schedule Content</h1>
      <section className="card schedule-panel">
        <div>
          <h2>Book content production</h2>
          <p className="muted">Create one content item and automatically book designer, editor, and channel tasks.</p>
        </div>
        <form className="form form-wide" action={scheduleAction}>
          <label>
            Client
            <select name="clientId" required defaultValue="">
              <option value="" disabled>Select client</option>
              {(clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label>Campaign<input name="campaign" /></label>
          <label>Title<input name="title" required /></label>
          <label>Platform<input name="platform" required placeholder="Instagram, TikTok, LinkedIn" /></label>
          <label>Content type<input name="contentType" placeholder="Reel, carousel, article" /></label>
          <label>Publish date<input name="publishDate" type="date" /></label>
          <label>
            Owner
            <select name="ownerId" defaultValue="">
              <option value="">Current user</option>
              {members.map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                return <option key={member.user_id} value={member.user_id}>{profile?.full_name ?? profile?.email ?? member.role}</option>
              })}
            </select>
          </label>
          <label>
            Reviewer
            <select name="reviewerId" defaultValue="">
              <option value="">Unassigned</option>
              {members.map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                return <option key={member.user_id} value={member.user_id}>{profile?.full_name ?? profile?.email ?? member.role}</option>
              })}
            </select>
          </label>
          <label className="form-span-2">Creative brief<textarea name="brief" rows={4} /></label>
          <label className="form-span-2">Caption / script<textarea name="caption" rows={4} /></label>
          <label className="form-span-2">Asset URL<input name="assetUrl" type="url" /></label>
          <div className="checkbox-grid form-span-2">
            <label><input name="requiresDesign" type="checkbox" defaultChecked /> Requires design</label>
            <label><input name="requiresEditing" type="checkbox" defaultChecked /> Requires editing</label>
            <label><input name="requiresChannelManager" type="checkbox" defaultChecked /> Requires channel manager</label>
          </div>
          <button type="submit">Schedule and book production</button>
        </form>
      </section>
    </main>
  )
}
