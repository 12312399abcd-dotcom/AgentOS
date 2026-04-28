'use server'

import { revalidatePath } from 'next/cache'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { buildClientReportDraft } from '@/lib/services/report-builder'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  approveReportSchema,
  generateReportSchema,
  type ApproveReportInput,
  type GenerateReportInput
} from '@/lib/validators/report.schema'

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export async function generateClientReport(input: GenerateReportInput) {
  const parsed = generateReportSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()
  const reportData = await buildClientReportDraft(parsed.organizationId, parsed.clientId, parsed.reportPeriod)

  const { data: report, error } = await admin
    .from('reports')
    .insert({
      organization_id: parsed.organizationId,
      client_id: parsed.clientId,
      report_period: parsed.reportPeriod,
      report_type: 'monthly',
      status: 'draft',
      generated_by: member.user_id,
      report_data: reportData,
      notes: parsed.notes
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'report',
    entity_id: report.id,
    action: 'draft_generated',
    new_data: { report_period: parsed.reportPeriod, client_id: parsed.clientId }
  })

  return { reportId: report.id }
}

export async function approveReport(input: ApproveReportInput) {
  const parsed = approveReportSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  if (!['admin', 'marketing'].includes(member.role)) {
    throw new Error('Only admin or marketing can approve reports')
  }

  const { error } = await admin
    .from('reports')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.reportId)

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'report',
    entity_id: parsed.reportId,
    action: 'approved'
  })
}

export async function generateClientReportFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await generateClientReport({
    organizationId,
    clientId: String(formData.get('clientId') ?? ''),
    reportPeriod: String(formData.get('reportPeriod') ?? ''),
    notes: readOptionalString(formData, 'notes')
  })

  revalidatePath(`/org/${orgSlug}/operation/reports`)
}

export async function approveReportFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await approveReport({
    organizationId,
    reportId: String(formData.get('reportId') ?? '')
  })

  revalidatePath(`/org/${orgSlug}/operation/reports`)
}
