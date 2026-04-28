import { ContentFilters } from '@/components/content/content-filters'
import { contentClientName } from '@/components/content/content-card'
import { getContentFilterOptions, getContentItems, parseContentFilters } from '@/lib/services/content-queries'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

function minusDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() - days)
  return value.toISOString().slice(0, 10)
}

type ContentTimelinePageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ContentTimelinePage({ params, searchParams }: ContentTimelinePageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const filters = parseContentFilters(await searchParams)
  const [{ clients, members }, items] = await Promise.all([
    getContentFilterOptions(organization.id),
    getContentItems(organization.id, filters)
  ])

  return (
    <main className="shell">
      <h1>Content Timeline</h1>
      <ContentFilters clients={clients} members={members} />
      <div className="timeline">
        {items.map((item) => (
          <article className="card" key={item.id}>
            <strong>{item.title}</strong>
            <p className="muted">{contentClientName(item)} · {item.platform}</p>
            {item.publish_date ? (
              <div className="timeline-grid">
                <span>Brief due: {minusDays(item.publish_date, 5)}</span>
                <span>Design due: {item.requires_design ? minusDays(item.publish_date, 4) : 'Not required'}</span>
                <span>Editing due: {item.requires_editing ? minusDays(item.publish_date, 3) : 'Not required'}</span>
                <span>Review due: {minusDays(item.publish_date, 2)}</span>
                <span>Schedule due: {item.requires_channel_manager ? minusDays(item.publish_date, 1) : 'Not required'}</span>
                <span>Publish: {item.publish_date}</span>
              </div>
            ) : (
              <p>No publish date set.</p>
            )}
          </article>
        ))}
      </div>
    </main>
  )
}
