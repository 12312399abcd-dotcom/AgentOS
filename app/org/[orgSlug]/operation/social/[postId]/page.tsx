import Link from 'next/link'

import { updateSocialMetricsFromForm } from '@/lib/actions/social'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type SocialPostDetailPageProps = {
  params: Promise<{ orgSlug: string; postId: string }>
}

export default async function SocialPostDetailPage({ params }: SocialPostDetailPageProps) {
  const { orgSlug, postId } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('social_posts')
    .select('id, channel, published_url, published_at, reach, impressions, likes, comments, shares, saves, clicks, leads, spend, report_period, content_items(title, status, publish_date), clients(name)')
    .eq('organization_id', organization.id)
    .eq('id', postId)
    .single()

  if (!post) {
    return (
      <main className="shell">
        <h1>Social post not found</h1>
      </main>
    )
  }

  const content = Array.isArray(post.content_items) ? post.content_items[0] : post.content_items
  const client = Array.isArray(post.clients) ? post.clients[0] : post.clients
  const metricsAction = updateSocialMetricsFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <Link href={`/org/${orgSlug}/operation/social`}>Back to social tracking</Link>
      <h1>{content?.title ?? post.channel}</h1>
      <div className="grid">
        <section className="card">
          <h2>Publishing</h2>
          <p><strong>Client:</strong> {client?.name ?? 'No client'}</p>
          <p><strong>Channel:</strong> {post.channel}</p>
          <p><strong>Published:</strong> {post.published_at ? post.published_at.slice(0, 10) : 'No date'}</p>
          <p><strong>URL:</strong> <a href={post.published_url}>{post.published_url}</a></p>
          <p><strong>Report period:</strong> {post.report_period ?? 'Not set'}</p>
        </section>
        <section className="card">
          <h2>Metrics</h2>
          <p><strong>Reach:</strong> {post.reach}</p>
          <p><strong>Impressions:</strong> {post.impressions}</p>
          <p><strong>Engagement:</strong> {post.likes + post.comments + post.shares + post.saves}</p>
          <p><strong>Clicks:</strong> {post.clicks}</p>
          <p><strong>Leads:</strong> {post.leads}</p>
          <p><strong>Spend:</strong> {post.spend}</p>
        </section>
      </div>
      <section className="card">
        <h2>Update metrics</h2>
        <form action={metricsAction} className="form">
          <input type="hidden" name="socialPostId" value={post.id} />
          <label>Reach<input name="reach" type="number" min="0" defaultValue={post.reach} /></label>
          <label>Impressions<input name="impressions" type="number" min="0" defaultValue={post.impressions} /></label>
          <label>Likes<input name="likes" type="number" min="0" defaultValue={post.likes} /></label>
          <label>Comments<input name="comments" type="number" min="0" defaultValue={post.comments} /></label>
          <label>Shares<input name="shares" type="number" min="0" defaultValue={post.shares} /></label>
          <label>Saves<input name="saves" type="number" min="0" defaultValue={post.saves} /></label>
          <label>Clicks<input name="clicks" type="number" min="0" defaultValue={post.clicks} /></label>
          <label>Leads<input name="leads" type="number" min="0" defaultValue={post.leads} /></label>
          <label>Spend<input name="spend" type="number" min="0" step="0.01" defaultValue={post.spend} /></label>
          <label>Report period<input name="reportPeriod" placeholder="2026-04" defaultValue={post.report_period ?? ''} /></label>
          <button type="submit">Save metrics</button>
        </form>
      </section>
    </main>
  )
}
