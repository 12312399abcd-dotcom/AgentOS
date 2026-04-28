import { listActiveMemberships } from '@/lib/services/permissions'
import { startMemberSession } from '@/lib/services/sessions'
import { resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'
import { createClient } from '@/lib/supabase/server'

export async function resolvePostLoginRoute() {
  const memberships = await listActiveMemberships()

  if (memberships.length === 0) {
    return '/onboarding/create-organization'
  }

  if (memberships.length > 1) {
    return '/select-organization'
  }

  const membership = memberships[0]
  const organization = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations

  if (!organization) {
    return '/unauthorized'
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    await startMemberSession(organization.id, user.id)
  }

  return resolveDefaultWorkspaceRoute(organization.slug, membership.role)
}
