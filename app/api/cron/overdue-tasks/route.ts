import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const admin = createAdminClient()
  const { data: tasks, error } = await admin
    .from('tasks')
    .select('id, organization_id, owner_id, title, due_date')
    .lt('due_date', today)
    .not('status', 'in', '("completed","archived")')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notifications = (tasks ?? [])
    .filter((task) => task.owner_id)
    .map((task) => ({
      organization_id: task.organization_id,
      user_id: task.owner_id,
      type: 'task_overdue',
      title: 'Task overdue',
      message: task.title,
      link_url: `/tasks/${task.id}`
    }))

  if (notifications.length > 0) {
    await admin.from('notifications').insert(notifications)
  }

  return NextResponse.json({ checked: tasks?.length ?? 0, notifications: notifications.length })
}
