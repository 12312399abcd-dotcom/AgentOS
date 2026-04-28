import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    status: 'queued',
    message: 'Report generation route is ready for the report-builder service.'
  })
}
