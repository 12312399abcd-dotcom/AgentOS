import type { ContentFilters as ContentFilterValues } from '@/lib/services/content-queries'

type ContentFiltersProps = {
  clients: { id: string; name: string }[]
  members: {
    user_id: string
    role: string
    profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
  }[]
  filters?: ContentFilterValues
}

export function ContentFilters({ clients, members, filters = {} }: ContentFiltersProps) {
  return (
    <form className="filter-bar">
      <input name="search" placeholder="Search content" defaultValue={filters.search ?? ''} />
      <select name="clientId" defaultValue={filters.clientId ?? ''}>
        <option value="">All clients</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>{client.name}</option>
        ))}
      </select>
      <input name="platform" placeholder="Platform" defaultValue={filters.platform ?? ''} />
      <select name="status" defaultValue={filters.status ?? ''}>
        <option value="">All statuses</option>
        {['idea', 'planned', 'scheduled', 'brief_ready', 'design_in_progress', 'design_done', 'editing_in_progress', 'editing_done', 'internal_review', 'approved', 'ready_to_publish', 'published', 'reported'].map((status) => (
          <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
        ))}
      </select>
      <select name="ownerId" defaultValue={filters.ownerId ?? ''}>
        <option value="">All owners</option>
        {members.map((member) => {
          const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
          return (
            <option key={member.user_id} value={member.user_id}>
              {profile?.full_name ?? profile?.email ?? member.role}
            </option>
          )
        })}
      </select>
      <select name="reviewerId" defaultValue={filters.reviewerId ?? ''}>
        <option value="">All reviewers</option>
        {members.map((member) => {
          const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
          return (
            <option key={member.user_id} value={member.user_id}>
              {profile?.full_name ?? profile?.email ?? member.role}
            </option>
          )
        })}
      </select>
      <select name="requiredRole" defaultValue={filters.requiredRole ?? ''}>
        <option value="">Any role</option>
        <option value="designer">Designer</option>
        <option value="editor">Editor</option>
        <option value="channel_manager">Channel manager</option>
      </select>
      <input name="publishFrom" type="date" aria-label="Publish from" defaultValue={filters.publishFrom ?? ''} />
      <input name="publishTo" type="date" aria-label="Publish to" defaultValue={filters.publishTo ?? ''} />
      <select name="productionRisk" defaultValue={filters.productionRisk ?? ''}>
        <option value="">Any risk</option>
        <option value="normal">Normal</option>
        <option value="watch">Watch</option>
        <option value="high">High</option>
        <option value="blocked">Blocked</option>
      </select>
      <select name="missingTask" defaultValue={filters.missingTask ?? ''}>
        <option value="">Task status</option>
        <option value="yes">Missing task</option>
        <option value="no">Tasks booked</option>
      </select>
      <select name="notionSource" defaultValue={filters.notionSource ?? ''}>
        <option value="">Notion source</option>
        <option value="yes">From Notion</option>
        <option value="no">Not from Notion</option>
      </select>
      <button type="submit">Filter</button>
    </form>
  )
}
