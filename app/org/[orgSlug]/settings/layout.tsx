import { OrgTopbar } from '@/components/layout/org-topbar'
import { WorkspaceBreadcrumbs } from '@/components/layout/breadcrumbs'
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar'
import { getOrganizationBySlug, requireAdmin } from '@/lib/services/permissions'

type SettingsLayoutProps = {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  const member = await requireAdmin(organization.id)

  return (
    <>
      <OrgTopbar organizationId={organization.id} orgSlug={orgSlug} role={member.role} />
      <div className="app-frame">
        <WorkspaceSidebar orgSlug={orgSlug} workspace="settings" />
        <div className="app-content">
          <WorkspaceBreadcrumbs orgSlug={orgSlug} workspace="settings" />
          {children}
        </div>
      </div>
    </>
  )
}
