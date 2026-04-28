import { scheduleContentFromForm } from '@/lib/actions/content'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type ContentCalendarPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function ContentCalendarPage({ params }: ContentCalendarPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const [{ data: clients }, { data: contentItems }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).eq('status', 'active').order('name'),
    supabase
      .from('content_items')
      .select('id, title, platform, content_type, status, publish_date, production_risk, clients(name)')
      .eq('organization_id', organization.id)
      .order('publish_date', { ascending: true, nullsFirst: false })
      .limit(50)
  ])
  const scheduleAction = scheduleContentFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>Content Calendar</h1>
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
          {(contentItems ?? []).map((item) => {
            const client = Array.isArray(item.clients) ? item.clients[0] : item.clients

            return (
              <article className="card" key={item.id}>
                <strong>{item.title}</strong>
                <p className="muted">{client?.name ?? 'No client'} · {item.platform}</p>
                <p>{item.publish_date ?? 'No publish date'} · {item.status}</p>
                <p>Risk: {item.production_risk}</p>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
