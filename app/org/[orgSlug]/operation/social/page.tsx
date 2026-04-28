import Link from 'next/link'

import { publishContentFromForm, updateSocialMetricsFromForm } from '@/lib/actions/social'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type OperationSocialPageProps = {
  params: Promise<{ orgSlug: string }>
}

function engagement(post: { likes: number; comments: number; shares: number; saves: number }) {
  return post.likes + post.comments + post.shares + post.saves
}

export default async function OperationSocialPage({ params }: OperationSocialPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const [{ data: publishableContent }, { data: socialPosts }] = await Promise.all([
    supabase
      .from('content_items')
      .select('id, title, platform, publish_date, status, published_url, clients(name)')
      .eq('organization_id', organization.id)
      .in('status', ['approved', 'ready_to_publish', 'scheduled', 'published'])
      .order('publish_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('social_posts')
      .select('id, channel, published_url, published_at, reach, impressions, likes, comments, shares, saves, clicks, leads, spend, report_period, content_items(title), clients(name)')
      .eq('organization_id', organization.id)
      .order('published_at', { ascending: false, nullsFirst: false })
  ])
  const publishAction = publishContentFromForm.bind(null, organization.id, orgSlug)
  const metricsAction = updateSocialMetricsFromForm.bind(null, organization.id, orgSlug)
  const posts = socialPosts ?? []
  const postsMissingMetrics = posts.filter((post) => post.reach === 0 && post.impressions === 0 && post.clicks === 0 && post.leads === 0)
  const reportReady = posts.filter((post) => post.report_period)
  const missingUrl = (publishableContent ?? []).filter((item) => !item.published_url)
  const channelSummary = posts.reduce<Record<string, { posts: number; reach: number; clicks: number; leads: number }>>((acc, post) => {
    acc[post.channel] ??= { posts: 0, reach: 0, clicks: 0, leads: 0 }
    acc[post.channel].posts += 1
    acc[post.channel].reach += post.reach
    acc[post.channel].clicks += post.clicks
    acc[post.channel].leads += post.leads
    return acc
  }, {})
  const topByEngagement = [...posts].sort((a, b) => engagement(b) - engagement(a)).slice(0, 5)
  const topByClicks = [...posts].sort((a, b) => b.clicks - a.clicks).slice(0, 5)

  return (
    <main className="shell">
      <h1>Social Tracking</h1>
      <div className="grid">
        <div className="card"><strong>Published Posts</strong><p>{posts.length}</p></div>
        <div className="card"><strong>Missing URLs</strong><p>{missingUrl.length}</p></div>
        <div className="card"><strong>Awaiting Metrics</strong><p>{postsMissingMetrics.length}</p></div>
        <div className="card"><strong>Report Ready</strong><p>{reportReady.length}</p></div>
      </div>
      <section className="card">
        <h2>Add published URL</h2>
        <form className="form" action={publishAction}>
          <label>
            Content
            <select name="contentItemId" required defaultValue="">
              <option value="" disabled>Select content item</option>
              {(publishableContent ?? []).map((item) => {
                const client = Array.isArray(item.clients) ? item.clients[0] : item.clients
                return (
                  <option key={item.id} value={item.id}>
                    {item.title} · {client?.name ?? 'No client'} · {item.platform}
                  </option>
                )
              })}
            </select>
          </label>
          <label>
            Published URL
            <input name="publishedUrl" type="url" required />
          </label>
          <label>
            Published at
            <input name="publishedAt" type="datetime-local" />
          </label>
          <button type="submit">Mark published</button>
        </form>
      </section>
      <section>
        <h2>Channel performance</h2>
        <div className="grid">
          {Object.entries(channelSummary).map(([channel, summary]) => (
            <article className="card" key={channel}>
              <strong>{channel}</strong>
              <p>{summary.posts} posts</p>
              <p>{summary.reach.toLocaleString()} reach · {summary.clicks.toLocaleString()} clicks · {summary.leads.toLocaleString()} leads</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Social posts</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Post</th>
                <th>Channel</th>
                <th>Published</th>
                <th>Reach</th>
                <th>Clicks</th>
                <th>Leads</th>
                <th>Report Period</th>
                <th>Metrics</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const content = Array.isArray(post.content_items) ? post.content_items[0] : post.content_items
                const client = Array.isArray(post.clients) ? post.clients[0] : post.clients

                return (
                  <tr key={post.id}>
                    <td>
                      <Link href={`/org/${orgSlug}/operation/social/${post.id}`}>{content?.title ?? post.published_url}</Link>
                      <p className="muted">{client?.name ?? 'No client'}</p>
                    </td>
                    <td>{post.channel}</td>
                    <td>{post.published_at ? post.published_at.slice(0, 10) : ''}</td>
                    <td>{post.reach}</td>
                    <td>{post.clicks}</td>
                    <td>{post.leads}</td>
                    <td>{post.report_period ?? ''}</td>
                    <td>
                      <form action={metricsAction} className="metrics-form">
                        <input type="hidden" name="socialPostId" value={post.id} />
                        <input name="reach" type="number" min="0" defaultValue={post.reach} aria-label="Reach" />
                        <input name="impressions" type="number" min="0" defaultValue={post.impressions} aria-label="Impressions" />
                        <input name="likes" type="number" min="0" defaultValue={post.likes} aria-label="Likes" />
                        <input name="comments" type="number" min="0" defaultValue={post.comments} aria-label="Comments" />
                        <input name="shares" type="number" min="0" defaultValue={post.shares} aria-label="Shares" />
                        <input name="saves" type="number" min="0" defaultValue={post.saves} aria-label="Saves" />
                        <input name="clicks" type="number" min="0" defaultValue={post.clicks} aria-label="Clicks" />
                        <input name="leads" type="number" min="0" defaultValue={post.leads} aria-label="Leads" />
                        <input name="spend" type="number" min="0" step="0.01" defaultValue={post.spend} aria-label="Spend" />
                        <input name="reportPeriod" placeholder="2026-04" defaultValue={post.report_period ?? ''} aria-label="Report period" />
                        <button type="submit">Save</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Top posts</h2>
        <div className="grid">
          <div className="card">
            <h3>By engagement</h3>
            <ol>
              {topByEngagement.map((post) => {
                const content = Array.isArray(post.content_items) ? post.content_items[0] : post.content_items
                return <li key={post.id}>{content?.title ?? post.channel}: {engagement(post)}</li>
              })}
            </ol>
          </div>
          <div className="card">
            <h3>By clicks</h3>
            <ol>
              {topByClicks.map((post) => {
                const content = Array.isArray(post.content_items) ? post.content_items[0] : post.content_items
                return <li key={post.id}>{content?.title ?? post.channel}: {post.clicks}</li>
              })}
            </ol>
          </div>
        </div>
      </section>
    </main>
  )
}
