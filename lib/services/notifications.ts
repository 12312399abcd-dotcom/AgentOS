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
