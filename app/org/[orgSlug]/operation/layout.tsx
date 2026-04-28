import { OrgTopbar } from '@/components/layout/org-topbar'
import { WorkspaceBreadcrumbs } from '@/components/layout/breadcrumbs'
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'

type OperationLayoutProps = {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function OperationLayout({ children, params }: OperationLayoutProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  const member = await requireWorkspaceAccess(organization.id, 'operation')

  return (
    <>
      <OrgTopbar organizationId={organization.id} orgSlug={orgSlug} role={member.role} />
      <div className="app-frame">
        <WorkspaceSidebar orgSlug={orgSlug} workspace="operation" />
        <div className="app-content">
          <WorkspaceBreadcrumbs orgSlug={orgSlug} workspace="operation" />
          {children}
        </div>
      </div>
    </>
  )
}
