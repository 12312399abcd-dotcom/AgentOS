import { listActiveMemberships } from '@/lib/services/permissions'
import { resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'

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

  return resolveDefaultWorkspaceRoute(organization.slug, membership.role)
}
