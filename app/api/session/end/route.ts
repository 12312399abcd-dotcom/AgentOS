import { NextResponse } from 'next/server'
import { z } from 'zod'

import { endCurrentMemberSession } from '@/lib/services/sessions'

const endSessionSchema = z.object({
  organizationId: z.string().uuid()
})

export async function POST(req: Request) {
  try {
    const body = endSessionSchema.parse(await req.json())
    await endCurrentMemberSession(body.organizationId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Session end failed'
    const status = message === 'Unauthorized' ? 401 : message === 'No organization access' ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
