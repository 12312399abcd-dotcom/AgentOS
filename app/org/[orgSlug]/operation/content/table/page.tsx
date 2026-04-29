import { ContentFilters } from '@/components/content/content-filters'
import { contentClientName } from '@/components/content/content-card'
import { getContentFilterOptions, getContentItems, hasMissingProductionTask, parseContentFilters } from '@/lib/services/content-queries'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

type ContentTablePageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ContentTablePage({ params, searchParams }: ContentTablePageProps) {
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
      <h1>Content Table</h1>
      <div className="actions">
        <a href={`/api/exports/content?${new URLSearchParams({ orgSlug, ...Object.fromEntries(Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) }).toString()}`}>Export CSV</a>
      </div>
      <ContentFilters clients={clients} members={members} filters={filters} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Client</th>
              <th>Campaign</th>
              <th>Platform</th>
              <th>Type</th>
              <th>Status</th>
              <th>Publish Date</th>
              <th>Risk</th>
              <th>Missing Task</th>
              <th>Notion</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{contentClientName(item)}</td>
                <td>{item.campaign ?? ''}</td>
                <td>{item.platform}</td>
                <td>{item.content_type ?? ''}</td>
                <td>{item.status}</td>
                <td>{item.publish_date ?? ''}</td>
                <td>{item.production_risk}</td>
                <td>{hasMissingProductionTask(item) ? 'Yes' : 'No'}</td>
                <td>{item.notion_page_id ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
