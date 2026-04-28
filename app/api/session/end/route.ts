import { NextResponse } from 'next/server'
import { z } from 'zod'

import { endCurrentMemberSession } from '@/lib/services/sessions'

const endSessionSchema = z.object({
  organizationId: z.string().uuid()
})

export async function POST(req: Request) {
  const body = endSessionSchema.parse(await req.json())
  await endCurrentMemberSession(body.organizationId)
  return NextResponse.json({ ok: true })
}
