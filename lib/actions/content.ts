'use server'

import { revalidatePath } from 'next/cache'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import {
  buildProductionTasks,
  calculateProductionRisk,
  calculateProductionTaskDueDate
} from '@/lib/services/content-booking'
import { safeStorageFileName } from '@/lib/services/storage'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  scheduleContentSchema,
  updateContentScheduleSchema,
  type ScheduleContentInput,
  type UpdateContentScheduleInput
} from '@/lib/validators/content.schema'

export async function scheduleContent(input: ScheduleContentInput) {
  const parsed = scheduleContentSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()
  const status = parsed.publishDate ? 'scheduled' : 'planned'
  const productionRisk = calculateProductionRisk(parsed)

  const { data: contentItem, error } = await admin
    .from('content_items')
    .insert({
      organization_id: parsed.organizationId,
      client_id: parsed.clientId,
      campaign: parsed.campaign,
      title: parsed.title,
      platform: parsed.platform,
      content_type: parsed.contentType,
      caption: parsed.caption,
      brief: parsed.brief,
      asset_url: parsed.assetUrl || null,
      publish_date: parsed.publishDate,
      status,
      requires_design: parsed.requiresDesign,
      requires_editing: parsed.requiresEditing,
      requires_channel_manager: parsed.requiresChannelManager,
      production_risk: productionRisk,
      owner_id: parsed.ownerId ?? member.user_id,
      reviewer_id: parsed.reviewerId
    })
    .select('id, title')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const productionTasks = buildProductionTasks(parsed)
  if (productionTasks.length > 0) {
    const { error: taskError } = await admin.from('tasks').insert(
      productionTasks.map((task) => ({
        organization_id: parsed.organizationId,
        client_id: parsed.clientId,
        content_item_id: contentItem.id,
        title: task.title,
        task_type: task.task_type,
        required_role: task.required_role,
        due_date: task.due_date,
        booking_source: parsed.bookingSource,
        production_risk: task.production_risk,
        status: 'assigned',
        created_by: member.user_id
      }))
    )

    if (taskError) {
      throw new Error(taskError.message)
    }
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'content_item',
    entity_id: contentItem.id,
    action: 'scheduled',
    new_data: { content: parsed, tasks_created: productionTasks.length }
  })

  return { contentItemId: contentItem.id, taskCount: productionTasks.length }
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

export async function scheduleContentFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await scheduleContent({
    organizationId,
    clientId: String(formData.get('clientId') ?? ''),
    campaign: readOptionalString(formData, 'campaign'),
    title: String(formData.get('title') ?? ''),
    platform: String(formData.get('platform') ?? ''),
    contentType: readOptionalString(formData, 'contentType'),
    caption: readOptionalString(formData, 'caption'),
    brief: readOptionalString(formData, 'brief'),
    assetUrl: readOptionalString(formData, 'assetUrl') ?? '',
    publishDate: readOptionalString(formData, 'publishDate'),
    ownerId: readOptionalString(formData, 'ownerId'),
    reviewerId: readOptionalString(formData, 'reviewerId'),
    requiresDesign: readBoolean(formData, 'requiresDesign'),
    requiresEditing: readBoolean(formData, 'requiresEditing'),
    requiresChannelManager: readBoolean(formData, 'requiresChannelManager'),
    bookingSource: 'content_schedule'
  })

  revalidatePath(`/org/${orgSlug}/operation/content`)
}

export async function updateContentSchedule(input: UpdateContentScheduleInput) {
  const parsed = updateContentScheduleSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  const { data: contentItem, error } = await admin
    .from('content_items')
    .select('id, publish_date, requires_design, requires_editing, requires_channel_manager')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.contentItemId)
    .single()

  if (error || !contentItem) throw new Error('Content item not found')

  const productionRisk = calculateProductionRisk({
    publishDate: parsed.publishDate,
    requiresDesign: Boolean(contentItem.requires_design),
    requiresEditing: Boolean(contentItem.requires_editing)
  })

  const { error: updateError } = await admin
    .from('content_items')
    .update({
      publish_date: parsed.publishDate ?? null,
      status: parsed.publishDate ? 'scheduled' : 'planned',
      production_risk: productionRisk
    })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.contentItemId)

  if (updateError) throw new Error(updateError.message)

  const { data: linkedTasks, error: taskReadError } = await admin
    .from('tasks')
    .select('id, task_type, required_role, status, due_date')
    .eq('organization_id', parsed.organizationId)
    .eq('content_item_id', parsed.contentItemId)
    .neq('status', 'completed')

  if (taskReadError) throw new Error(taskReadError.message)

  if (parsed.publishDate && linkedTasks && linkedTasks.length > 0) {
    const taskUpdates = await Promise.all(
      linkedTasks.map((task) =>
        admin
          .from('tasks')
          .update({
            due_date: calculateProductionTaskDueDate(parsed.publishDate as string, task.task_type, task.required_role),
            production_risk: productionRisk
          })
          .eq('organization_id', parsed.organizationId)
          .eq('id', task.id)
      )
    )
    const failedTaskUpdate = taskUpdates.find((result) => result.error)
    if (failedTaskUpdate?.error) throw new Error(failedTaskUpdate.error.message)
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'content_item',
    entity_id: parsed.contentItemId,
    action: 'publish_date_updated',
    old_data: { publish_date: contentItem.publish_date },
    new_data: {
      publish_date: parsed.publishDate,
      production_risk: productionRisk,
      recalculated_tasks: parsed.publishDate ? linkedTasks?.length ?? 0 : 0
    }
  })
}

export async function updateContentScheduleFromForm(
  organizationId: string,
  orgSlug: string,
  contentItemId: string,
  formData: FormData
) {
  await updateContentSchedule({
    organizationId,
    contentItemId,
    publishDate: readOptionalString(formData, 'publishDate')
  })

  revalidatePath(`/org/${orgSlug}/operation/content/${contentItemId}`)
  revalidatePath(`/org/${orgSlug}/operation/content`)
}

export async function uploadContentAssetFromForm(organizationId: string, orgSlug: string, contentItemId: string, formData: FormData) {
  const member = await requireWorkspaceAccess(organizationId, 'operation')
  const admin = createAdminClient()
  const file = formData.get('asset')

  if (!(file instanceof File)) {
    throw new Error('Asset file is required')
  }

  if (file.size <= 0) {
    throw new Error('Asset file is empty')
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Asset file must be 20MB or smaller')
  }

  const { data: contentItem } = await admin
    .from('content_items')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('id', contentItemId)
    .single()

  if (!contentItem) throw new Error('Content item not found')

  const fileName = safeStorageFileName(file.name) || 'asset'
  const path = `${organizationId}/content/${contentItemId}/${Date.now()}-${fileName}`
  const { error: uploadError } = await admin.storage.from('client-assets').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  })

  if (uploadError) throw new Error(uploadError.message)

  const storageUrl = `storage://client-assets/${path}`
  const { error: updateError } = await admin
    .from('content_items')
    .update({ asset_url: storageUrl })
    .eq('organization_id', organizationId)
    .eq('id', contentItemId)

  if (updateError) throw new Error(updateError.message)

  await admin.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: member.user_id,
    entity_type: 'content_item',
    entity_id: contentItemId,
    action: 'asset_uploaded',
    new_data: { bucket: 'client-assets', path, size: file.size, type: file.type }
  })

  revalidatePath(`/org/${orgSlug}/operation/content/${contentItemId}`)
}
