import Link from 'next/link'

import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

type WorkspacePageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireWorkspaceAccess(organization.id, 'operation')

  return (
    <main className="shell">
      <h1>{organization.name}</h1>
      <p className="muted">Choose a workspace.</p>
      <div className="grid">
        <Link className="card" href={`/org/${orgSlug}/operation/dashboard`}>
          <strong>Operation Dashboard</strong>
          <p className="muted">Clients, content, tasks, publishing, reports.</p>
        </Link>
        <Link className="card" href={`/org/${orgSlug}/finance/dashboard`}>
          <strong>Finance Dashboard</strong>
          <p className="muted">Cashflow, payroll, forecast, invoices, period close.</p>
        </Link>
        <Link className="card" href={`/org/${orgSlug}/settings/members`}>
          <strong>Members</strong>
          <p className="muted">Invite team members and assign organization roles.</p>
        </Link>
      </div>
    </main>
  )
}
