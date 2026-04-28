import { NextResponse } from 'next/server'

import { generateClientReport } from '@/lib/actions/reports'
import { generateReportSchema } from '@/lib/validators/report.schema'

export async function POST(req: Request) {
  const body = generateReportSchema.parse(await req.json())
  const result = await generateClientReport(body)

  return NextResponse.json({
    status: 'draft_created',
    reportId: result.reportId
  })
}
