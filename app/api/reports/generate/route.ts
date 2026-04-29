import { NextResponse } from 'next/server'

import { generateClientReport } from '@/lib/actions/reports'
import { getWorkspaceAccess } from '@/lib/services/permissions'
import { generateReportSchema } from '@/lib/validators/report.schema'

export async function POST(req: Request) {
  const body = generateReportSchema.parse(await req.json())
  const access = await getWorkspaceAccess(body.organizationId, 'operation')

  if (!access.member) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const result = await generateClientReport(body)

  return NextResponse.json({
    status: 'draft_created',
    reportId: result.reportId
  })
}
