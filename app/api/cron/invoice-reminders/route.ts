import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createDailyCronNotifications, listFinanceRecipientIds } from '@/lib/services/notifications'
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
  const { data: overdueInvoices, error } = await admin
    .from('invoices')
    .select('id, organization_id, invoice_number, due_date, organizations(slug)')
    .eq('status', 'sent')
    .lt('due_date', today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: dueSoonInvoices, error: dueSoonError } = await admin
    .from('invoices')
    .select('id, organization_id, invoice_number, due_date, organizations(slug)')
    .eq('status', 'sent')
    .gte('due_date', today)
    .lte('due_date', dueSoonDate)

  if (dueSoonError) {
    return NextResponse.json({ error: dueSoonError.message }, { status: 500 })
  }

  if ((overdueInvoices ?? []).length > 0) {
    for (const invoice of overdueInvoices ?? []) {
      const { error: updateError } = await admin
        .from('invoices')
        .update({ status: 'overdue' })
        .eq('organization_id', invoice.organization_id)
        .eq('id', invoice.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }
  }

  const notifications = []

  for (const invoice of [...(overdueInvoices ?? []), ...(dueSoonInvoices ?? [])]) {
    const financeRecipients = await listFinanceRecipientIds(invoice.organization_id)
    const organization = Array.isArray(invoice.organizations) ? invoice.organizations[0] : invoice.organizations
    const isOverdue = !!invoice.due_date && invoice.due_date < today

    notifications.push(...financeRecipients.map((userId) => ({
      organizationId: invoice.organization_id,
      userId,
      type: isOverdue ? 'invoice_overdue' : 'invoice_due_soon',
      title: isOverdue ? 'Invoice overdue' : 'Invoice due soon',
      message: `${invoice.invoice_number} due ${invoice.due_date}`,
      linkUrl: organization?.slug ? `/org/${organization.slug}/finance/invoices` : undefined
    })))
  }

  const insertedNotifications = await createDailyCronNotifications(notifications)

  return NextResponse.json({ overdue: overdueInvoices?.length ?? 0, dueSoon: dueSoonInvoices?.length ?? 0, notifications: insertedNotifications })
}
