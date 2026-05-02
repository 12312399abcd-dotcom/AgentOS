import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type NotificationInput = {
  organizationId: string
  userId: string
  type: string
  title: string
  message?: string
  linkUrl?: string
}

export async function createNotification(input: NotificationInput) {
  const admin = createAdminClient()
  const { error } = await admin.from('notifications').insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link_url: input.linkUrl
  })

  if (error) throw new Error(error.message)
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) return

  const admin = createAdminClient()
  const { error } = await admin.from('notifications').insert(
    inputs.map((input) => ({
      organization_id: input.organizationId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link_url: input.linkUrl
    }))
  )

  if (error) throw new Error(error.message)
}

function notificationKey(input: NotificationInput) {
  return [
    input.organizationId,
    input.userId,
    input.type,
    input.message ?? '',
    input.linkUrl ?? ''
  ].join('|')
}

export async function createDailyCronNotifications(inputs: NotificationInput[], now = new Date()) {
  if (inputs.length === 0) return 0

  const uniqueInputs = Array.from(
    new Map(inputs.map((input) => [notificationKey(input), input])).values()
  )
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
  const admin = createAdminClient()
  const organizationIds = Array.from(new Set(uniqueInputs.map((input) => input.organizationId)))
  const userIds = Array.from(new Set(uniqueInputs.map((input) => input.userId)))
  const types = Array.from(new Set(uniqueInputs.map((input) => input.type)))

  const { data: existing, error: existingError } = await admin
    .from('notifications')
    .select('organization_id, user_id, type, message, link_url')
    .gte('created_at', dayStart)
    .lt('created_at', dayEnd)
    .in('organization_id', organizationIds)
    .in('user_id', userIds)
    .in('type', types)

  if (existingError) throw new Error(existingError.message)

  const existingKeys = new Set((existing ?? []).map((row) => notificationKey({
    organizationId: row.organization_id,
    userId: row.user_id,
    type: row.type,
    message: row.message ?? undefined,
    linkUrl: row.link_url ?? undefined,
    title: ''
  })))
  const missingInputs = uniqueInputs.filter((input) => !existingKeys.has(notificationKey(input)))

  if (missingInputs.length === 0) return 0

  await createNotifications(missingInputs)
  return missingInputs.length
}

export async function getUnreadNotificationCount(organizationId: string) {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('status', 'unread')

  return count ?? 0
}

export async function listFinanceRecipientIds(organizationId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('role', ['admin', 'finance_moderator'])

  if (error) throw new Error(error.message)
  return (data ?? []).map((member) => member.user_id)
}

export async function listAdminRecipientIds(organizationId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .eq('role', 'admin')

  if (error) throw new Error(error.message)
  return (data ?? []).map((member) => member.user_id)
}

export async function listOperationRecipientIds(organizationId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('role', ['admin', 'designer', 'editor', 'marketing', 'channel_manager'])

  if (error) throw new Error(error.message)
  return (data ?? []).map((member) => member.user_id)
}
