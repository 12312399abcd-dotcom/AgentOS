import { NextResponse } from 'next/server'
import { z } from 'zod'

import { heartbeatMemberSession } from '@/lib/services/sessions'

const heartbeatSchema = z.object({
  organizationId: z.string().uuid(),
  activeMinutes: z.coerce.number().int().min(0).max(15).default(1),
  idleMinutes: z.coerce.number().int().min(0).max(15).default(0)
})

export async function POST(req: Request) {
  try {
    const body = heartbeatSchema.parse(await req.json())
    await heartbeatMemberSession(body.organizationId, body.activeMinutes, body.idleMinutes)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Session heartbeat failed'
    const status = message === 'Unauthorized' ? 401 : message === 'No organization access' ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
