import { createClientFromForm } from '@/lib/actions/clients'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type OperationClientsPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function OperationClientsPage({ params }: OperationClientsPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  const member = await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const [{ data: clients }, { data: members }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, category, contact_name, contact_email, monthly_retainer, status')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('organization_members')
      .select('user_id, role, profiles(full_name, email)')
      .eq('organization_id', organization.id)
      .eq('status', 'active')
      .in('role', ['admin', 'marketing', 'channel_manager', 'designer', 'editor'])
  ])
  const createAction = createClientFromForm.bind(null, organization.id, orgSlug)
  const canCreate = member.role === 'admin'

  return (
    <main className="shell">
      <h1>Clients</h1>
      {canCreate ? (
        <section className="card">
          <h2>Create client</h2>
          <form className="form" action={createAction}>
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Category
              <input name="category" />
            </label>
            <label>
              Contact name
              <input name="contactName" />
            </label>
            <label>
              Contact email
              <input name="contactEmail" type="email" />
            </label>
            <label>
              Monthly retainer
              <input name="monthlyRetainer" type="number" min="0" step="0.01" defaultValue="0" />
            </label>
            <label>
              Account manager
              <select name="accountManagerId" defaultValue="">
                <option value="">Unassigned</option>
                {(members ?? []).map((orgMember) => {
                  const profile = Array.isArray(orgMember.profiles) ? orgMember.profiles[0] : orgMember.profiles

                  return (
                    <option key={orgMember.user_id} value={orgMember.user_id}>
                      {profile?.full_name ?? profile?.email ?? orgMember.role}
                    </option>
                  )
                })}
              </select>
            </label>
            <label>
              Status
              <select name="status" defaultValue="active">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <button type="submit">Create client</button>
          </form>
        </section>
      ) : null}
      <section>
        <h2>Client list</h2>
        <div className="grid">
          {(clients ?? []).map((client) => (
            <article className="card" key={client.id}>
              <strong>{client.name}</strong>
              <p className="muted">{client.category ?? 'No category'}</p>
              <p>{client.status}</p>
              <p>{client.contact_email ?? client.contact_name ?? 'No contact'}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
