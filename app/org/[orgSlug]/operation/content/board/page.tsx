import { ContentCard } from '@/components/content/content-card'
import { ContentFilters } from '@/components/content/content-filters'
import { getContentFilterOptions, getContentItems, parseContentFilters } from '@/lib/services/content-queries'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

const statuses = [
  'idea',
  'planned',
  'scheduled',
  'brief_ready',
  'design_in_progress',
  'design_done',
  'editing_in_progress',
  'editing_done',
  'internal_review',
  'approved',
  'ready_to_publish',
  'published',
  'reported'
]

type ContentBoardPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ContentBoardPage({ params, searchParams }: ContentBoardPageProps) {
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
      <h1>Content Board</h1>
      <ContentFilters clients={clients} members={members} filters={filters} />
      <div className="board">
        {statuses.map((status) => (
          <section className="board-column" key={status}>
            <h2>{status.replaceAll('_', ' ')}</h2>
            {items.filter((item) => item.status === status).map((item) => <ContentCard key={item.id} item={item} />)}
          </section>
        ))}
      </div>
    </main>
  )
}
