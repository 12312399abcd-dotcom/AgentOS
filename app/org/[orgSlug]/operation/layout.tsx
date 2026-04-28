import { OrgTopbar } from '@/components/layout/org-topbar'
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
      <OrgTopbar orgSlug={orgSlug} role={member.role} />
      <div className="app-frame">
        <WorkspaceSidebar orgSlug={orgSlug} workspace="operation" />
        <div className="app-content">{children}</div>
      </div>
    </>
  )
}
