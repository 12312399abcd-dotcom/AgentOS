import Link from 'next/link'

import { signOut } from '@/lib/actions/auth'
import { listActiveMemberships } from '@/lib/services/permissions'
import { getUnreadNotificationCount } from '@/lib/services/notifications'
import { canAccessFinance, canAccessOperation, resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'

type OrgTopbarProps = {
  organizationId: string
  orgSlug: string
  role: string
}

export async function OrgTopbar({ organizationId, orgSlug, role }: OrgTopbarProps) {
  const [memberships, unreadNotifications] = await Promise.all([
    listActiveMemberships(),
    getUnreadNotificationCount(organizationId)
  ])

  return (
    <header className="topbar">
      <Link className="brand" href={resolveDefaultWorkspaceRoute(orgSlug, role)}>
        Agency OS
      </Link>
      <nav className="topnav" aria-label="Workspace navigation">
        {canAccessOperation(role) ? <Link href={`/org/${orgSlug}/operation/dashboard`}>Operation</Link> : null}
        {canAccessFinance(role) ? <Link href={`/org/${orgSlug}/finance/dashboard`}>Finance</Link> : null}
        <Link href={`/org/${orgSlug}/my-time`}>My Time</Link>
        <Link href={`/org/${orgSlug}/notifications`}>Notifications{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}</Link>
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
        <form action={signOut}>
          <button className="ghost-button" type="submit">Sign out</button>
        </form>
      </div>
    </header>
  )
}
