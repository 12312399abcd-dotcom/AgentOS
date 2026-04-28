import { selectOrganizationFromForm } from '@/lib/actions/auth'
import { listActiveMemberships } from '@/lib/services/permissions'

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
            <form className="card" key={membership.id} action={selectOrganizationFromForm}>
              <input type="hidden" name="organizationId" value={organization.id} />
              <input type="hidden" name="orgSlug" value={organization.slug} />
              <input type="hidden" name="role" value={membership.role} />
              <strong>{organization.name}</strong>
              <p className="muted">{membership.role}</p>
              <button type="submit">Enter workspace</button>
            </form>
          )
        })}
      </div>
    </main>
  )
}
