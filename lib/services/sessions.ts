import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const SESSION_CONSENT_VERSION = 'agency-os-session-v1'

async function assertActiveMembership(organizationId: string, userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('No organization access')
}

export async function startMemberSession(organizationId: string, userId: string) {
  await assertActiveMembership(organizationId, userId)

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('member_sessions')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .in('status', ['active', 'idle', 'warning'])
    .order('login_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await admin
    .from('member_sessions')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      consent_version: SESSION_CONSENT_VERSION,
      status: 'active'
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

export async function heartbeatMemberSession(organizationId: string, activeMinutes: number, idleMinutes: number) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')
  await assertActiveMembership(organizationId, user.id)

  const { data: session } = await supabase
    .from('member_sessions')
    .select('id, active_minutes, idle_minutes')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .in('status', ['active', 'idle', 'warning'])
    .order('login_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!session) {
    await startMemberSession(organizationId, user.id)
    return
  }

  const nextStatus = idleMinutes > activeMinutes ? 'idle' : 'active'
  const { error } = await supabase
    .from('member_sessions')
    .update({
      active_minutes: Number(session.active_minutes) + activeMinutes,
      idle_minutes: Number(session.idle_minutes) + idleMinutes,
      status: nextStatus
    })
    .eq('id', session.id)

  if (error) throw new Error(error.message)
}

export async function endCurrentMemberSession(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')
  await assertActiveMembership(organizationId, user.id)

  const { error } = await supabase
    .from('member_sessions')
    .update({ status: 'logged_out', logout_time: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .in('status', ['active', 'idle', 'warning', 'locked'])

  if (error) throw new Error(error.message)
}
