import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createNotifications, listFinanceRecipientIds } from '@/lib/services/notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const threeDaysOut = new Date()
  threeDaysOut.setDate(threeDaysOut.getDate() + 3)
  const dueSoonDate = threeDaysOut.toISOString().slice(0, 10)
  const admin = createAdminClient()
  const { data: expenses, error } = await admin
    .from('business_expenses')
    .select('id, organization_id, due_date, category, vendor_name, total_amount, status, organizations(slug)')
    .in('status', ['unpaid', 'scheduled', 'overdue'])
    .lte('due_date', dueSoonDate)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const overdueIds = (expenses ?? []).filter((expense) => expense.due_date && expense.due_date < today).map((expense) => expense.id)
  if (overdueIds.length > 0) {
    await admin.from('business_expenses').update({ status: 'overdue' }).in('id', overdueIds)
  }

  const notifications = []

  for (const expense of expenses ?? []) {
    const recipients = await listFinanceRecipientIds(expense.organization_id)
    const organization = Array.isArray(expense.organizations) ? expense.organizations[0] : expense.organizations
    const isOverdue = expense.due_date < today
    notifications.push(...recipients.map((userId) => ({
      organizationId: expense.organization_id,
      userId,
      type: isOverdue ? 'expense_overdue' : 'expense_due_soon',
      title: isOverdue ? 'Expense overdue' : 'Expense due soon',
      message: `${expense.category} ${Number(expense.total_amount).toLocaleString()} due ${expense.due_date}`,
      linkUrl: organization?.slug ? `/org/${organization.slug}/finance/business-expenses` : undefined
    })))
  }

  await createNotifications(notifications)

  return NextResponse.json({ checked: expenses?.length ?? 0, overdue: overdueIds.length, notifications: notifications.length })
}
