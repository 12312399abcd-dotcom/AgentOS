import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createDailyCronNotifications, listAdminRecipientIds } from '@/lib/services/notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString()
  const admin = createAdminClient()
  const { data: sessions, error } = await admin
    .from('member_sessions')
    .select('id, organization_id, user_id, active_minutes, idle_minutes, status, profiles(full_name, email, daily_time_limit_minutes), organizations(slug)')
    .gte('login_time', todayStart)
    .in('status', ['active', 'idle', 'warning', 'locked', 'logged_out'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notifications = []
  const warningSessions: { id: string; organizationId: string }[] = []

  for (const session of sessions ?? []) {
    const profile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles
    const organization = Array.isArray(session.organizations) ? session.organizations[0] : session.organizations
    const limit = Number(profile?.daily_time_limit_minutes ?? 480)

    if (Number(session.active_minutes) < limit) continue

    if (!session.organization_id) continue
    const organizationId = session.organization_id
    warningSessions.push({ id: session.id, organizationId })
    const admins = await listAdminRecipientIds(organizationId)
    notifications.push(...admins.map((userId) => ({
      organizationId,
      userId,
      type: 'session_limit_warning',
      title: 'Member session limit reached',
      message: `${profile?.full_name ?? profile?.email ?? session.user_id} has ${session.active_minutes} active minutes today`,
      linkUrl: organization?.slug ? `/org/${organization.slug}/settings/sessions` : undefined
    })))
  }

  if (warningSessions.length > 0) {
    for (const session of warningSessions) {
      const { error: updateError } = await admin
        .from('member_sessions')
        .update({ status: 'warning' })
        .eq('organization_id', session.organizationId)
        .eq('id', session.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }
  }

  const insertedNotifications = await createDailyCronNotifications(notifications)

  return NextResponse.json({ sessions: sessions?.length ?? 0, warnings: warningSessions.length, notifications: insertedNotifications })
}
