'use server'

import { revalidatePath } from 'next/cache'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createSimplePdf } from '@/lib/services/pdf'
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

  if (!['admin', 'marketing', 'channel_manager'].includes(member.role)) {
    throw new Error('Only admin, marketing, or channel manager can generate reports')
  }

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

  const { data: report, error: readError } = await admin
    .from('reports')
    .select('id, status')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.reportId)
    .single()

  if (readError || !report) {
    throw new Error('Report not found')
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
    action: 'approved',
    old_data: { status: report.status },
    new_data: { status: 'approved' }
  })
}

export async function exportReportPdf(organizationId: string, reportId: string) {
  const member = await requireWorkspaceAccess(organizationId, 'operation')
  const admin = createAdminClient()
  const { data: report, error } = await admin
    .from('reports')
    .select('id, report_period, report_type, status, report_data, notes, clients(name)')
    .eq('organization_id', organizationId)
    .eq('id', reportId)
    .single()

  if (error || !report) throw new Error('Report not found')
  if (member.role === 'viewer' && report.status !== 'approved') {
    throw new Error('Viewer can only export approved reports')
  }

  const client = Array.isArray(report.clients) ? report.clients[0] : report.clients
  const data = report.report_data as Awaited<ReturnType<typeof buildClientReportDraft>>
  const lines = [
    `Agency OS ${report.report_type} report`,
    `Client: ${client?.name ?? data.client?.name ?? 'Client'}`,
    `Period: ${report.report_period}`,
    `Notes: ${report.notes ?? ''}`,
    '',
    `Work completed: ${data.workCompleted?.length ?? 0}`,
    `Content published: ${data.contentPublished?.length ?? 0}`,
    `Top posts: ${data.topPosts?.length ?? 0}`,
    '',
    'Recommendations:',
    ...(data.recommendations ?? []).map((item) => `- ${item}`),
    '',
    'Warnings:',
    ...((data.warnings ?? []).length > 0 ? data.warnings.map((item) => `- ${item}`) : ['- None'])
  ]
  const pdf = createSimplePdf(lines)
  const path = `${organizationId}/reports/${report.id}.pdf`
  const { error: uploadError } = await admin.storage.from('reports').upload(path, pdf, {
    contentType: 'application/pdf',
    upsert: true
  })

  if (uploadError) throw new Error(uploadError.message)

  const fileUrl = `storage://reports/${path}`
  const { error: updateError } = await admin
    .from('reports')
    .update({ file_url: fileUrl })
    .eq('organization_id', organizationId)
    .eq('id', reportId)

  if (updateError) throw new Error(updateError.message)

  await admin.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: member.user_id,
    entity_type: 'report',
    entity_id: reportId,
    action: 'pdf_exported',
    new_data: { bucket: 'reports', path }
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

export async function exportReportPdfFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  const reportId = String(formData.get('reportId') ?? '')
  await exportReportPdf(organizationId, reportId)

  revalidatePath(`/org/${orgSlug}/operation/reports`)
  revalidatePath(`/org/${orgSlug}/operation/reports/${reportId}`)
}
