'use server'

import { revalidatePath } from 'next/cache'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  publishContentSchema,
  updateSocialMetricsSchema,
  type PublishContentInput,
  type UpdateSocialMetricsInput
} from '@/lib/validators/social.schema'

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export async function publishContent(input: PublishContentInput) {
  const parsed = publishContentSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  const { data: content, error } = await admin
    .from('content_items')
    .select('id, organization_id, client_id, platform, title, status, published_url')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.contentItemId)
    .single()

  if (error || !content) {
    throw new Error('Content item not found')
  }

  const publishedAt = parsed.publishedAt
    ? new Date(parsed.publishedAt).toISOString()
    : new Date().toISOString()

  const { error: updateError } = await admin
    .from('content_items')
    .update({
      status: 'published',
      published_url: parsed.publishedUrl
    })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.contentItemId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  const { data: existingPost } = await admin
    .from('social_posts')
    .select('id')
    .eq('organization_id', parsed.organizationId)
    .eq('content_item_id', parsed.contentItemId)
    .maybeSingle()

  let socialPostId = existingPost?.id

  if (socialPostId) {
    const { error: socialUpdateError } = await admin
      .from('social_posts')
      .update({
        channel: content.platform,
        published_url: parsed.publishedUrl,
        published_at: publishedAt
      })
      .eq('organization_id', parsed.organizationId)
      .eq('id', socialPostId)

    if (socialUpdateError) throw new Error(socialUpdateError.message)
  } else {
    const { data: socialPost, error: socialInsertError } = await admin
      .from('social_posts')
      .insert({
        organization_id: parsed.organizationId,
        client_id: content.client_id,
        content_item_id: parsed.contentItemId,
        channel: content.platform,
        published_url: parsed.publishedUrl,
        published_at: publishedAt
      })
      .select('id')
      .single()

    if (socialInsertError) throw new Error(socialInsertError.message)
    socialPostId = socialPost.id
  }

  const { data: recipients } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', parsed.organizationId)
    .eq('status', 'active')
    .in('role', ['admin', 'marketing', 'channel_manager'])

  const notifications = (recipients ?? []).map((recipient) => ({
    organization_id: parsed.organizationId,
    user_id: recipient.user_id,
    type: 'content_published',
    title: 'Content published',
    message: content.title,
    link_url: `/social/${socialPostId}`
  }))

  if (notifications.length > 0) {
    await admin.from('notifications').insert(notifications)
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'content_item',
    entity_id: parsed.contentItemId,
    action: 'published',
    old_data: { status: content.status, published_url: content.published_url },
    new_data: { published_url: parsed.publishedUrl, social_post_id: socialPostId }
  })

  return { socialPostId }
}

export async function updateSocialMetrics(input: UpdateSocialMetricsInput) {
  const parsed = updateSocialMetricsSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  const { data: socialPost, error } = await admin
    .from('social_posts')
    .select('id')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.socialPostId)
    .single()

  if (error || !socialPost) throw new Error('Social post not found')

  const { error: updateError } = await admin
    .from('social_posts')
    .update({
      reach: parsed.reach,
      impressions: parsed.impressions,
      likes: parsed.likes,
      comments: parsed.comments,
      shares: parsed.shares,
      saves: parsed.saves,
      clicks: parsed.clicks,
      leads: parsed.leads,
      spend: parsed.spend,
      report_period: parsed.reportPeriod
    })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.socialPostId)

  if (updateError) throw new Error(updateError.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'social_post',
    entity_id: parsed.socialPostId,
    action: 'metrics_updated',
    new_data: parsed
  })
}

export async function publishContentFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await publishContent({
    organizationId,
    contentItemId: String(formData.get('contentItemId') ?? ''),
    publishedUrl: String(formData.get('publishedUrl') ?? ''),
    publishedAt: readOptionalString(formData, 'publishedAt')
  })

  revalidatePath(`/org/${orgSlug}/operation/social`)
  revalidatePath(`/org/${orgSlug}/operation/content`)
}

export async function updateSocialMetricsFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateSocialMetrics({
    organizationId,
    socialPostId: String(formData.get('socialPostId') ?? ''),
    reach: Number(formData.get('reach') ?? 0),
    impressions: Number(formData.get('impressions') ?? 0),
    likes: Number(formData.get('likes') ?? 0),
    comments: Number(formData.get('comments') ?? 0),
    shares: Number(formData.get('shares') ?? 0),
    saves: Number(formData.get('saves') ?? 0),
    clicks: Number(formData.get('clicks') ?? 0),
    leads: Number(formData.get('leads') ?? 0),
    spend: Number(formData.get('spend') ?? 0),
    reportPeriod: readOptionalString(formData, 'reportPeriod')
  })

  revalidatePath(`/org/${orgSlug}/operation/social`)
}
