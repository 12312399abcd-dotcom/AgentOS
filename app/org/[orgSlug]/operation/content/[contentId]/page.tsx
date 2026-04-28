import { publishContentFromForm } from '@/lib/actions/social'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type ContentDetailPageProps = {
  params: Promise<{ orgSlug: string; contentId: string }>
}

export default async function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { orgSlug, contentId } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const [{ data: content }, { data: tasks }, { data: socialPost }] = await Promise.all([
    supabase
      .from('content_items')
      .select('id, title, campaign, platform, content_type, caption, brief, asset_url, status, publish_date, published_url, production_risk, clients(name)')
      .eq('organization_id', organization.id)
      .eq('id', contentId)
      .single(),
    supabase
      .from('tasks')
      .select('id, title, required_role, task_type, status, due_date, production_risk')
      .eq('organization_id', organization.id)
      .eq('content_item_id', contentId)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('social_posts')
      .select('id, channel, published_url, published_at, reach, impressions, clicks, leads, report_period')
      .eq('organization_id', organization.id)
      .eq('content_item_id', contentId)
      .maybeSingle()
  ])

  if (!content) {
    return (
      <main className="shell">
        <h1>Content not found</h1>
      </main>
    )
  }

  const client = Array.isArray(content.clients) ? content.clients[0] : content.clients
  const publishAction = publishContentFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <h1>{content.title}</h1>
      <div className="grid">
        <section className="card">
          <h2>Content Overview</h2>
          <p><strong>Client:</strong> {client?.name ?? 'No client'}</p>
          <p><strong>Campaign:</strong> {content.campaign ?? 'No campaign'}</p>
          <p><strong>Platform:</strong> {content.platform}</p>
          <p><strong>Type:</strong> {content.content_type ?? 'No type'}</p>
          <p><strong>Status:</strong> {content.status}</p>
          <p><strong>Publish date:</strong> {content.publish_date ?? 'No publish date'}</p>
          <p><strong>Risk:</strong> {content.production_risk}</p>
        </section>
        <section className="card">
          <h2>Creative Brief</h2>
          <p>{content.brief ?? 'No brief yet.'}</p>
          <h2>Caption / Script</h2>
          <p>{content.caption ?? 'No caption yet.'}</p>
          {content.asset_url ? <p><a href={content.asset_url}>Asset</a></p> : null}
        </section>
      </div>
      <section className="card">
        <h2>Publishing Details</h2>
        {content.published_url ? <p><a href={content.published_url}>{content.published_url}</a></p> : <p>No published URL yet.</p>}
        <form className="form" action={publishAction}>
          <input type="hidden" name="contentItemId" value={content.id} />
          <label>
            Published URL
            <input name="publishedUrl" type="url" required defaultValue={content.published_url ?? ''} />
          </label>
          <label>
            Published at
            <input name="publishedAt" type="datetime-local" />
          </label>
          <button type="submit">Mark published</button>
        </form>
      </section>
      <section>
        <h2>Linked Tasks</h2>
        <div className="grid">
          {(tasks ?? []).map((task) => (
            <article className="card" key={task.id}>
              <strong>{task.title}</strong>
              <p>{task.required_role ?? task.task_type ?? 'General'} · {task.status}</p>
              <p>{task.due_date ?? 'No due date'} · {task.production_risk}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Social Metrics</h2>
        {socialPost ? (
          <>
            <p><strong>Channel:</strong> {socialPost.channel}</p>
            <p><strong>Reach:</strong> {socialPost.reach}</p>
            <p><strong>Impressions:</strong> {socialPost.impressions}</p>
            <p><strong>Clicks:</strong> {socialPost.clicks}</p>
            <p><strong>Leads:</strong> {socialPost.leads}</p>
            <p><strong>Report period:</strong> {socialPost.report_period ?? 'Not set'}</p>
          </>
        ) : (
          <p>No social post linked yet.</p>
        )}
      </section>
    </main>
  )
}
