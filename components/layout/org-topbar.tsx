import Link from 'next/link'

import { signOut } from '@/lib/actions/auth'
import { canAccessFinance, canAccessOperation, resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'

type OrgTopbarProps = {
  organizationId: string
  orgSlug: string
  role: string
}

export function OrgTopbar({ organizationId, orgSlug, role }: OrgTopbarProps) {
  return (
    <header className="topbar">
      <Link className="brand" href={resolveDefaultWorkspaceRoute(orgSlug, role)}>
        Agency OS
      </Link>
      <nav className="topnav" aria-label="Workspace navigation">
        {canAccessOperation(role) ? <Link href={`/org/${orgSlug}/operation/dashboard`}>Operation</Link> : null}
        {canAccessFinance(role) ? <Link href={`/org/${orgSlug}/finance/dashboard`}>Finance</Link> : null}
        <Link href={`/org/${orgSlug}/my-time`}>My Time</Link>
        <Link href={`/org/${orgSlug}/notifications`}>Notifications</Link>
        {role === 'admin' ? <Link href={`/org/${orgSlug}/settings/members`}>Settings</Link> : null}
      </nav>
      <div className="org-switcher">
        <span>{role}</span>
        <Link className="ghost-link" href="/select-organization">Switch org</Link>
        <form action={signOut}>
          <input type="hidden" name="organizationId" value={organizationId} />
          <button className="ghost-button" type="submit">Sign out</button>
        </form>
      </div>
    </header>
  )
}
