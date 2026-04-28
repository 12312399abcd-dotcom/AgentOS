import Link from 'next/link'

import { listActiveMemberships } from '@/lib/services/permissions'
import { canAccessFinance, canAccessOperation, resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'

type OrgTopbarProps = {
  orgSlug: string
  role: string
}

export async function OrgTopbar({ orgSlug, role }: OrgTopbarProps) {
  const memberships = await listActiveMemberships()

  return (
    <header className="topbar">
      <Link className="brand" href={resolveDefaultWorkspaceRoute(orgSlug, role)}>
        Agency OS
      </Link>
      <nav className="topnav" aria-label="Workspace navigation">
        {canAccessOperation(role) ? <Link href={`/org/${orgSlug}/operation/dashboard`}>Operation</Link> : null}
        {canAccessFinance(role) ? <Link href={`/org/${orgSlug}/finance/dashboard`}>Finance</Link> : null}
        {role === 'admin' ? <Link href={`/org/${orgSlug}/settings/members`}>Settings</Link> : null}
      </nav>
      <div className="org-switcher">
        <span>{role}</span>
        {memberships.length > 1 ? (
          <details>
            <summary>Switch org</summary>
            <div className="switcher-menu">
              {memberships.map((membership) => {
                const organization = Array.isArray(membership.organizations)
                  ? membership.organizations[0]
                  : membership.organizations

                if (!organization) {
                  return null
                }

                return (
                  <Link key={membership.id} href={resolveDefaultWorkspaceRoute(organization.slug, membership.role)}>
                    {organization.name}
                  </Link>
                )
              })}
            </div>
          </details>
        ) : null}
      </div>
    </header>
  )
}
