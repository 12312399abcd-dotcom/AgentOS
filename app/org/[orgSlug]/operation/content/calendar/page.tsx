import { scheduleContentFromForm } from '@/lib/actions/content'
import { ContentCard } from '@/components/content/content-card'
import { ContentFilters } from '@/components/content/content-filters'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { getContentFilterOptions, getContentItems, parseContentFilters } from '@/lib/services/content-queries'

type ContentCalendarPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ContentCalendarPage({ params, searchParams }: ContentCalendarPageProps) {
  const { orgSlug } = await params
  const filters = parseContentFilters(await searchParams)
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireWorkspaceAccess(organization.id, 'operation')
  const [{ clients, members }, contentItems] = await Promise.all([
    getContentFilterOptions(organization.id),
    getContentItems(organization.id, filters)
  ])
  const scheduleAction = scheduleContentFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Content Calendar</h1>
      <ContentFilters clients={clients} members={members} />
      <section className="card">
        <h2>Schedule content</h2>
        <form className="form" action={scheduleAction}>
          <label>
            Client
            <select name="clientId" required defaultValue="">
              <option value="" disabled>Select client</option>
              {(clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label>
            Campaign
            <input name="campaign" />
          </label>
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Platform
            <input name="platform" required placeholder="Instagram, TikTok, LinkedIn" />
          </label>
          <label>
            Content type
            <input name="contentType" placeholder="Reel, carousel, article" />
          </label>
          <label>
            Publish date
            <input name="publishDate" type="date" />
          </label>
          <label>
            Owner
            <select name="ownerId" defaultValue="">
              <option value="">Current user</option>
              {members.map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                return (
                  <option key={member.user_id} value={member.user_id}>{profile?.full_name ?? profile?.email ?? member.role}</option>
                )
              })}
            </select>
          </label>
          <label>
            Reviewer
            <select name="reviewerId" defaultValue="">
              <option value="">Unassigned</option>
              {members.map((member) => {
                const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
                return (
                  <option key={member.user_id} value={member.user_id}>{profile?.full_name ?? profile?.email ?? member.role}</option>
                )
              })}
            </select>
          </label>
          <label>
            Creative brief
            <textarea name="brief" rows={3} />
          </label>
          <label>
            Caption / script
            <textarea name="caption" rows={3} />
          </label>
          <label>
            Asset URL
            <input name="assetUrl" type="url" />
          </label>
          <div className="checkbox-grid">
            <label><input name="requiresDesign" type="checkbox" defaultChecked /> Requires design</label>
            <label><input name="requiresEditing" type="checkbox" defaultChecked /> Requires editing</label>
            <label><input name="requiresChannelManager" type="checkbox" defaultChecked /> Requires channel manager</label>
          </div>
          <button type="submit">Schedule and book production</button>
        </form>
      </section>
      <section>
        <h2>Upcoming content</h2>
        <div className="grid">
          {contentItems.map((item) => <ContentCard key={item.id} item={item} />)}
        </div>
      </section>
    </main>
  )
}
