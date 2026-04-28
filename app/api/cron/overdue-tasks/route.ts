import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createNotifications, listAdminRecipientIds } from '@/lib/services/notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const admin = createAdminClient()
  const { data: tasks, error } = await admin
    .from('tasks')
    .select('id, organization_id, owner_id, title, due_date, organizations(slug)')
    .lt('due_date', today)
    .not('status', 'in', '("completed","archived")')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notifications = (tasks ?? []).flatMap((task) => {
    const organization = Array.isArray(task.organizations) ? task.organizations[0] : task.organizations
    const linkUrl = organization?.slug ? `/org/${organization.slug}/operation/tasks/${task.id}` : undefined
    const ownerNotification = task.owner_id ? [{
      organizationId: task.organization_id,
      userId: task.owner_id,
      type: 'task_overdue',
      title: 'Task overdue',
      message: task.title,
      linkUrl
    }] : []

    return ownerNotification
  })

  const severeTasks = (tasks ?? []).filter((task) => {
    const dueDate = new Date(`${task.due_date}T00:00:00.000Z`)
    const ageMs = Date.now() - dueDate.getTime()
    return ageMs > 24 * 60 * 60 * 1000
  })

  for (const task of severeTasks) {
    const organization = Array.isArray(task.organizations) ? task.organizations[0] : task.organizations
    const adminIds = await listAdminRecipientIds(task.organization_id)
    notifications.push(...adminIds.map((adminId) => ({
      organizationId: task.organization_id,
      userId: adminId,
      type: 'task_overdue_severe',
      title: 'Task overdue more than 24 hours',
      message: task.title,
      linkUrl: organization?.slug ? `/org/${organization.slug}/operation/tasks/${task.id}` : undefined
    })))
  }

  if (notifications.length > 0) {
    await createNotifications(notifications)
  }

  return NextResponse.json({ checked: tasks?.length ?? 0, notifications: notifications.length })
}
