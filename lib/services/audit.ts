import { createAdminClient } from '@/lib/supabase/admin'

export type AuditLogInput = {
  organizationId: string
  actorId?: string | null
  entityType: string
  entityId?: string | null
  action: string
  oldData?: unknown
  newData?: unknown
}

export async function writeAuditLog(input: AuditLogInput) {
  const admin = createAdminClient()
  const { error } = await admin.from('audit_logs').insert({
    organization_id: input.organizationId,
    actor_id: input.actorId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    old_data: input.oldData,
    new_data: input.newData
  })

  if (error) throw new Error(error.message)
}
