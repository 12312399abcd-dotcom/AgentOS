import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

import { listActiveMemberships } from '@/lib/services/permissions'
import { resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'
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

  const memberships = await listActiveMemberships()

  if (memberships.length === 0) {
    redirect('/onboarding/create-organization')
  }

  if (memberships.length > 1) {
    redirect('/select-organization')
  }

  const membership = memberships[0]
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations

  if (!organization) {
    return NextResponse.redirect(new URL('/unauthorized', url.origin))
  }

  redirect(resolveDefaultWorkspaceRoute(organization.slug, membership.role))
}
