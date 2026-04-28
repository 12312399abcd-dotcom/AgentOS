import { getCurrentUser, getOrganizationBySlug, requireOrgAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type MyTimePageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function MyTimePage({ params }: MyTimePageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireOrgAccess(organization.id)
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const weekStartDate = new Date(now)
  weekStartDate.setUTCDate(now.getUTCDate() - 6)
  const weekStart = new Date(Date.UTC(weekStartDate.getUTCFullYear(), weekStartDate.getUTCMonth(), weekStartDate.getUTCDate())).toISOString()
  const [{ data: profile }, { data: todaySessions }, { data: weekSessions }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, daily_time_limit_minutes, weekly_time_limit_minutes')
      .eq('id', user.id)
      .single(),
    supabase
      .from('member_sessions')
      .select('id, login_time, logout_time, active_minutes, idle_minutes, status, consent_version')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .gte('login_time', todayStart)
      .order('login_time', { ascending: false }),
    supabase
      .from('member_sessions')
      .select('active_minutes, idle_minutes')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .gte('login_time', weekStart)
  ])

  const todayActive = (todaySessions ?? []).reduce((sum, session) => sum + Number(session.active_minutes), 0)
  const todayIdle = (todaySessions ?? []).reduce((sum, session) => sum + Number(session.idle_minutes), 0)
  const weekActive = (weekSessions ?? []).reduce((sum, session) => sum + Number(session.active_minutes), 0)
  const dailyLimit = Number(profile?.daily_time_limit_minutes ?? 480)
  const weeklyLimit = Number(profile?.weekly_time_limit_minutes ?? 2400)

  return (
    <main className="shell">
      <h1>My Time</h1>
      <section className="card">
        <h2>Tracking policy</h2>
        <p className="muted">Agency OS tracks app session time only. It does not track private browsing, external websites, keystrokes, screenshots, or personal device activity.</p>
      </section>
      <div className="grid">
        <div className="card"><strong>Today Active</strong><p>{todayActive.toLocaleString()} / {dailyLimit.toLocaleString()} min</p></div>
        <div className="card"><strong>Today Idle</strong><p>{todayIdle.toLocaleString()} min</p></div>
        <div className="card"><strong>Week Active</strong><p>{weekActive.toLocaleString()} / {weeklyLimit.toLocaleString()} min</p></div>
        <div className="card"><strong>Status</strong><p>{todayActive >= dailyLimit || weekActive >= weeklyLimit ? 'warning' : 'normal'}</p></div>
      </div>
      <section>
        <h2>Today Sessions</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Login</th>
                <th>Logout</th>
                <th>Active</th>
                <th>Idle</th>
                <th>Status</th>
                <th>Consent</th>
              </tr>
            </thead>
            <tbody>
              {(todaySessions ?? []).map((session) => (
                <tr key={session.id}>
                  <td>{new Date(session.login_time).toLocaleString()}</td>
                  <td>{session.logout_time ? new Date(session.logout_time).toLocaleString() : ''}</td>
                  <td>{session.active_minutes}</td>
                  <td>{session.idle_minutes}</td>
                  <td>{session.status}</td>
                  <td>{session.consent_version ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
