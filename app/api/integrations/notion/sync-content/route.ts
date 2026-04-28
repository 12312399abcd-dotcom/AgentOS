import { NextResponse } from 'next/server'
import { z } from 'zod'

import { buildProductionTasks, calculateProductionRisk } from '@/lib/services/content-booking'
import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

const contentStatuses = [
  'idea',
  'planned',
  'scheduled',
  'brief_ready',
  'design_in_progress',
  'design_done',
  'editing_in_progress',
  'editing_done',
  'internal_review',
  'approved',
  'ready_to_publish',
  'published',
  'reported'
] as const

const notionRowSchema = z.object({
  notionPageId: z.string().min(1),
  notionSourceUrl: z.string().url().optional(),
  title: z.string().trim().min(1),
  client: z.string().trim().optional(),
  clientId: z.string().uuid().optional(),
  platform: z.string().trim().min(1),
  contentType: z.string().trim().optional(),
  caption: z.string().trim().optional(),
  creativeBrief: z.string().trim().optional(),
  publishDate: z.string().date().optional(),
  status: z.enum(contentStatuses).optional(),
  assetLink: z.string().url().optional().or(z.literal('')),
  ownerId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  requiresDesign: z.boolean().default(true),
  requiresEditing: z.boolean().default(true),
  requiresChannelManager: z.boolean().default(true)
})

const notionSyncSchema = z.object({
  organizationId: z.string().uuid(),
  notionDatabaseId: z.string().min(1),
  clientId: z.string().uuid().optional(),
  syncMode: z.enum(['preview', 'import', 'update']),
  rows: z.array(notionRowSchema).optional()
})

async function resolveClientId(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  fallbackClientId: string | undefined,
  rowClientId: string | undefined,
  clientName: string | undefined
) {
  const clientId = rowClientId ?? fallbackClientId
  if (clientId) {
    const { data: client } = await admin
      .from('clients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', clientId)
      .maybeSingle()

    return client?.id ?? null
  }

  if (!clientName) return null

  const { data: client } = await admin
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('name', clientName)
    .maybeSingle()

  return client?.id ?? null
}

async function createMissingProductionTasks(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  clientId: string,
  contentItemId: string,
  createdBy: string,
  row: z.infer<typeof notionRowSchema>
) {
  if (!row.publishDate) return 0

  const taskInput = {
    organizationId,
    clientId,
    title: row.title,
    platform: row.platform,
    contentType: row.contentType,
    caption: row.caption,
    brief: row.creativeBrief,
    assetUrl: row.assetLink ?? '',
    publishDate: row.publishDate,
    ownerId: row.ownerId,
    reviewerId: row.reviewerId,
    requiresDesign: row.requiresDesign,
    requiresEditing: row.requiresEditing,
    requiresChannelManager: row.requiresChannelManager,
    bookingSource: 'notion_sync' as const
  }
  const desiredTasks = buildProductionTasks(taskInput)

  if (desiredTasks.length === 0) return 0

  const { data: existingTasks } = await admin
    .from('tasks')
    .select('required_role')
    .eq('organization_id', organizationId)
    .eq('content_item_id', contentItemId)
    .eq('booking_source', 'notion_sync')

  const existingRoles = new Set((existingTasks ?? []).map((task) => task.required_role))
  const missingTasks = desiredTasks.filter((task) => !existingRoles.has(task.required_role))

  if (missingTasks.length === 0) return 0

  const { error } = await admin.from('tasks').insert(
    missingTasks.map((task) => ({
      organization_id: organizationId,
      client_id: clientId,
      content_item_id: contentItemId,
      title: task.title,
      task_type: task.task_type,
      required_role: task.required_role,
      due_date: task.due_date,
      booking_source: 'notion_sync',
      production_risk: task.production_risk,
      status: 'assigned',
      created_by: createdBy
    }))
  )

  if (error) throw new Error(error.message)
  return missingTasks.length
}

export async function POST(req: Request) {
  const body = notionSyncSchema.parse(await req.json())
  const member = await requireWorkspaceAccess(body.organizationId, 'operation')

  if (!['admin', 'marketing', 'channel_manager'].includes(member.role)) {
    return NextResponse.json({ error: 'Notion sync requires Admin, Marketing, or Channel Manager access' }, { status: 403 })
  }

  const admin = createAdminClient()
  const rows = body.rows ?? []
  let importedCount = 0
  let updatedCount = 0
  let skippedCount = 0
  let errorCount = 0
  let taskCount = 0
  const preview = []

  for (const row of rows) {
    try {
      const clientId = await resolveClientId(admin, body.organizationId, body.clientId, row.clientId, row.client)

      if (!clientId) {
        skippedCount += 1
        preview.push({ notionPageId: row.notionPageId, action: 'skip', reason: 'missing_client' })
        continue
      }

      if (!row.publishDate && (row.requiresDesign || row.requiresEditing || row.requiresChannelManager)) {
        preview.push({ notionPageId: row.notionPageId, action: 'map_without_booking', reason: 'missing_publish_date' })
      }

      const { data: existing } = await admin
        .from('content_items')
        .select('id')
        .eq('organization_id', body.organizationId)
        .eq('notion_page_id', row.notionPageId)
        .maybeSingle()

      const action = existing ? 'update' : 'import'
      preview.push({ notionPageId: row.notionPageId, title: row.title, clientId, action })

      if (body.syncMode === 'preview') continue
      if (body.syncMode === 'import' && existing) {
        skippedCount += 1
        continue
      }
      if (body.syncMode === 'update' && !existing) {
        skippedCount += 1
        continue
      }

      const payload = {
        organization_id: body.organizationId,
        client_id: clientId,
        title: row.title,
        platform: row.platform,
        content_type: row.contentType,
        caption: row.caption,
        brief: row.creativeBrief,
        asset_url: row.assetLink || null,
        publish_date: row.publishDate,
        status: row.status ?? (row.publishDate ? 'scheduled' : 'planned'),
        owner_id: row.ownerId ?? member.user_id,
        reviewer_id: row.reviewerId,
        notion_page_id: row.notionPageId,
        notion_source_url: row.notionSourceUrl,
        synced_from: 'notion',
        last_synced_at: new Date().toISOString(),
        requires_design: row.requiresDesign,
        requires_editing: row.requiresEditing,
        requires_channel_manager: row.requiresChannelManager,
        production_risk: calculateProductionRisk({
          publishDate: row.publishDate,
          requiresDesign: row.requiresDesign,
          requiresEditing: row.requiresEditing
        })
      }

      const { data: contentItem, error } = existing
        ? await admin.from('content_items').update(payload).eq('id', existing.id).select('id').single()
        : await admin.from('content_items').insert(payload).select('id').single()

      if (error || !contentItem) throw new Error(error?.message ?? 'Failed to sync content item')

      if (existing) updatedCount += 1
      else importedCount += 1

      taskCount += await createMissingProductionTasks(admin, body.organizationId, clientId, contentItem.id, member.user_id, row)
    } catch {
      errorCount += 1
    }
  }

  const status = body.syncMode === 'preview' ? 'previewed' : errorCount > 0 ? 'partial_failed' : 'completed'
  await admin.from('notion_sync_logs').insert({
    organization_id: body.organizationId,
    notion_database_id: body.notionDatabaseId,
    client_id: body.clientId,
    sync_mode: body.syncMode,
    imported_count: importedCount,
    updated_count: updatedCount,
    skipped_count: skippedCount,
    error_count: errorCount,
    status,
    created_by: member.user_id
  })

  return NextResponse.json({
    syncMode: body.syncMode,
    imported: importedCount,
    updated: updatedCount,
    skipped: skippedCount,
    errors: errorCount,
    tasksCreated: taskCount,
    preview,
    message: rows.length === 0 ? 'Runtime Notion fetch adapter is not configured yet. Send normalized rows to preview/import/update.' : undefined
  })
}
