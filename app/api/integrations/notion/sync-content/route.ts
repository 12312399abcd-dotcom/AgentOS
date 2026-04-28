import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'

const notionSyncSchema = z.object({
  organizationId: z.string().uuid(),
  notionDatabaseId: z.string().min(1),
  clientId: z.string().uuid().optional(),
  syncMode: z.enum(['preview', 'import', 'update'])
})

export async function POST(req: Request) {
  const body = notionSyncSchema.parse(await req.json())
  const member = await requireWorkspaceAccess(body.organizationId, 'operation')
  const admin = createAdminClient()

  await admin.from('notion_sync_logs').insert({
    organization_id: body.organizationId,
    notion_database_id: body.notionDatabaseId,
    client_id: body.clientId,
    sync_mode: body.syncMode,
    status: body.syncMode === 'preview' ? 'previewed' : 'completed',
    created_by: member.user_id
  })

  return NextResponse.json({
    syncMode: body.syncMode,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    message: 'Notion adapter placeholder is ready. Wire Notion row fetching before enabling imports.'
  })
}
