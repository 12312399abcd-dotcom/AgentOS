import { getOrganizationBySlug, requireAdmin } from '@/lib/services/permissions'

type OrganizationSettingsPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function OrganizationSettingsPage({ params }: OrganizationSettingsPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireAdmin(organization.id)

  return (
    <main className="shell">
      <h1>Organization Settings</h1>
      <div className="card">
        <p><strong>Name:</strong> {organization.name}</p>
        <p><strong>Slug:</strong> {organization.slug}</p>
        <p><strong>Timezone:</strong> {organization.timezone}</p>
        <p><strong>Currency:</strong> {organization.currency}</p>
      </div>
    </main>
  )
}
