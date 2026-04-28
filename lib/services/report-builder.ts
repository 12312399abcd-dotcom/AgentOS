import { createAdminClient } from '@/lib/supabase/admin'

export type ReportDraft = {
  client: {
    id: string
    name: string
  }
  period: string
  workCompleted: {
    id: string
    title: string
    completed_at: string | null
    task_type: string | null
    required_role: string | null
  }[]
  contentPublished: {
    id: string
    title: string
    platform: string
    content_type: string | null
    publish_date: string | null
    published_url: string | null
  }[]
  channelPerformance: Record<string, {
    posts: number
    reach: number
    impressions: number
    clicks: number
    leads: number
    spend: number
    engagement: number
  }>
  topPosts: {
    id: string
    title: string
    channel: string
    published_url: string
    reach: number
    clicks: number
    leads: number
    engagement: number
  }[]
  warnings: string[]
  recommendations: string[]
}

function periodBounds(period: string) {
  const [year, month] = period.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  }
}

function engagement(post: { likes: number; comments: number; shares: number; saves: number }) {
  return post.likes + post.comments + post.shares + post.saves
}

export async function buildClientReportDraft(organizationId: string, clientId: string, reportPeriod: string): Promise<ReportDraft> {
  const admin = createAdminClient()
  const { start, end } = periodBounds(reportPeriod)

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    throw new Error('Client not found')
  }

  const [{ data: tasks }, { data: contentItems }, { data: socialPosts }] = await Promise.all([
    admin
      .from('tasks')
      .select('id, title, completed_at, task_type, required_role')
      .eq('organization_id', organizationId)
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('completed_at', `${start}T00:00:00.000Z`)
      .lt('completed_at', `${end}T00:00:00.000Z`),
    admin
      .from('content_items')
      .select('id, title, platform, content_type, publish_date, published_url')
      .eq('organization_id', organizationId)
      .eq('client_id', clientId)
      .eq('status', 'published')
      .gte('publish_date', start)
      .lt('publish_date', end),
    admin
      .from('social_posts')
      .select('id, channel, published_url, published_at, reach, impressions, likes, comments, shares, saves, clicks, leads, spend, report_period, content_items(title)')
      .eq('organization_id', organizationId)
      .eq('client_id', clientId)
      .or(`report_period.eq.${reportPeriod},and(published_at.gte.${start}T00:00:00.000Z,published_at.lt.${end}T00:00:00.000Z)`)
  ])

  const posts = socialPosts ?? []
  const channelPerformance = posts.reduce<ReportDraft['channelPerformance']>((acc, post) => {
    acc[post.channel] ??= {
      posts: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      spend: 0,
      engagement: 0
    }
    acc[post.channel].posts += 1
    acc[post.channel].reach += post.reach
    acc[post.channel].impressions += post.impressions
    acc[post.channel].clicks += post.clicks
    acc[post.channel].leads += post.leads
    acc[post.channel].spend += Number(post.spend)
    acc[post.channel].engagement += engagement(post)
    return acc
  }, {})
  const topPosts = [...posts]
    .sort((a, b) => engagement(b) + b.clicks + b.leads - (engagement(a) + a.clicks + a.leads))
    .slice(0, 5)
    .map((post) => {
      const content = Array.isArray(post.content_items) ? post.content_items[0] : post.content_items
      return {
        id: post.id,
        title: content?.title ?? post.channel,
        channel: post.channel,
        published_url: post.published_url,
        reach: post.reach,
        clicks: post.clicks,
        leads: post.leads,
        engagement: engagement(post)
      }
    })
  const missingMetrics = posts.filter((post) => post.reach === 0 && post.impressions === 0 && post.clicks === 0 && post.leads === 0)
  const warnings = [
    ...(missingMetrics.length > 0 ? [`${missingMetrics.length} published posts are missing performance metrics.`] : []),
    ...((contentItems ?? []).some((item) => !item.published_url) ? ['Some published content is missing a published URL.'] : [])
  ]
  const recommendations = [
    posts.length === 0 ? 'Add social metrics before approving this report.' : 'Review top-performing posts and reuse winning topics in the next content plan.',
    missingMetrics.length > 0 ? 'Ask channel owners to complete missing metrics before sending the report.' : 'Metrics are ready for client review.'
  ]

  return {
    client,
    period: reportPeriod,
    workCompleted: tasks ?? [],
    contentPublished: contentItems ?? [],
    channelPerformance,
    topPosts,
    warnings,
    recommendations
  }
}
