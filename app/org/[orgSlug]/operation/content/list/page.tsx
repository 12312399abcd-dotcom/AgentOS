import { ContentCard } from '@/components/content/content-card'
import { ContentFilters } from '@/components/content/content-filters'
import { getContentFilterOptions, getContentItems, groupContentByListWindow, parseContentFilters } from '@/lib/services/content-queries'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

type ContentListPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ContentListPage({ params, searchParams }: ContentListPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const filters = parseContentFilters(await searchParams)
  const [{ clients, members }, items] = await Promise.all([
    getContentFilterOptions(organization.id),
    getContentItems(organization.id, filters)
  ])
  const groups = groupContentByListWindow(items)

  return (
    <main className="shell">
      <h1>Content List</h1>
      <ContentFilters clients={clients} members={members} />
      {Object.entries(groups).map(([label, groupItems]) => (
        <section key={label}>
          <h2>{label}</h2>
          <div className="grid">
            {groupItems.map((item) => <ContentCard key={item.id} item={item} />)}
          </div>
        </section>
      ))}
    </main>
  )
}
