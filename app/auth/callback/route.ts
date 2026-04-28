import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

import { resolvePostLoginRoute } from '@/lib/services/post-login'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  const inviteToken = url.searchParams.get('inviteToken')
  if (inviteToken) {
    redirect(`/invite/${inviteToken}`)
  }

  const route = await resolvePostLoginRoute()
  if (route === '/unauthorized') {
    return NextResponse.redirect(new URL('/unauthorized', url.origin))
  }

  redirect(route)
}
