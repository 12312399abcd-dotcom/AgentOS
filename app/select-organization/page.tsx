import Link from 'next/link'

import { listActiveMemberships } from '@/lib/services/permissions'
import { resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'

export default async function SelectOrganizationPage() {
  const memberships = await listActiveMemberships()

  return (
    <main className="shell">
      <h1>Select Organization</h1>
      <div className="grid">
        {memberships.map((membership) => {
          const organization = Array.isArray(membership.organizations)
            ? membership.organizations[0]
            : membership.organizations

          if (!organization) {
            return null
          }

          return (
            <Link className="card" key={membership.id} href={resolveDefaultWorkspaceRoute(organization.slug, membership.role)}>
              <strong>{organization.name}</strong>
              <p className="muted">{membership.role}</p>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
