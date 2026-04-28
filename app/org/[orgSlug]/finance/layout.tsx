import { OrgTopbar } from '@/components/layout/org-topbar'
import { WorkspaceBreadcrumbs } from '@/components/layout/breadcrumbs'
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

type FinanceLayoutProps = {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function FinanceLayout({ children, params }: FinanceLayoutProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  const member = await requireWorkspaceAccess(organization.id, 'finance')

  return (
    <>
      <OrgTopbar organizationId={organization.id} orgSlug={orgSlug} role={member.role} />
      <div className="app-frame">
        <WorkspaceSidebar orgSlug={orgSlug} workspace="finance" />
        <div className="app-content">
          <WorkspaceBreadcrumbs orgSlug={orgSlug} workspace="finance" />
          {children}
        </div>
      </div>
    </>
  )
}
