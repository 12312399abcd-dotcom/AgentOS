import { getOrganizationBySlug, requireAdmin } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type SessionsPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function SessionsPage({ params }: SessionsPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireAdmin(organization.id)
  const supabase = await createClient()
  const today = new Date()
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString()
  const { data: sessions } = await supabase
    .from('member_sessions')
    .select('id, login_time, logout_time, active_minutes, idle_minutes, status, consent_version, profiles(full_name, email, daily_time_limit_minutes)')
    .eq('organization_id', organization.id)
    .gte('login_time', todayStart)
    .order('login_time', { ascending: false })

  const activeUsers = (sessions ?? []).filter((session) => ['active', 'idle', 'warning'].includes(session.status)).length
  const totalActiveMinutes = (sessions ?? []).reduce((sum, session) => sum + Number(session.active_minutes), 0)
  const warningSessions = (sessions ?? []).filter((session) => session.status === 'warning' || session.status === 'locked')

  return (
    <main className="shell">
      <h1>Member Sessions</h1>
      <div className="grid">
        <div className="card"><strong>Active Users</strong><p>{activeUsers}</p></div>
        <div className="card"><strong>Active Minutes Today</strong><p>{totalActiveMinutes.toLocaleString()}</p></div>
        <div className="card"><strong>Warnings</strong><p>{warningSessions.length}</p></div>
      </div>
      <section className="card">
        <h2>Tracking policy</h2>
        <p className="muted">Agency OS tracks app session time only. It does not track private browsing, external websites, keystrokes, screenshots, or personal device activity.</p>
      </section>
      <section>
        <h2>Today</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Login</th>
                <th>Logout</th>
                <th>Active</th>
                <th>Idle</th>
                <th>Limit</th>
                <th>Status</th>
                <th>Consent</th>
              </tr>
            </thead>
            <tbody>
              {(sessions ?? []).map((session) => {
                const profile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles
                return (
                  <tr key={session.id}>
                    <td>{profile?.full_name ?? profile?.email ?? 'Unknown user'}</td>
                    <td>{new Date(session.login_time).toLocaleString()}</td>
                    <td>{session.logout_time ? new Date(session.logout_time).toLocaleString() : ''}</td>
                    <td>{session.active_minutes}</td>
                    <td>{session.idle_minutes}</td>
                    <td>{profile?.daily_time_limit_minutes ?? 480}</td>
                    <td>{session.status}</td>
                    <td>{session.consent_version ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
