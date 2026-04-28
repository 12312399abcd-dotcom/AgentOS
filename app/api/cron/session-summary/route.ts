import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ status: 'queued', message: 'Session summary aggregation hook is ready.' })
}
