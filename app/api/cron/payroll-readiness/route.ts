import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createDailyCronNotifications, listFinanceRecipientIds } from '@/lib/services/notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fiveDaysOut = new Date()
  fiveDaysOut.setDate(fiveDaysOut.getDate() + 5)
  const dueWindowEnd = fiveDaysOut.toISOString().slice(0, 10)
  const admin = createAdminClient()
  const { data: cycles, error } = await admin
    .from('payroll_cycles')
    .select('id, organization_id, payroll_due_date, total_net_pay, status, organizations(slug, finance_control_settings(minimum_cash_reserve), business_accounts(opening_balance), cashflow_transactions(direction, amount))')
    .in('status', ['planned', 'reserved', 'approved', 'partial_paid', 'blocked'])
    .lte('payroll_due_date', dueWindowEnd)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notifications = []

  for (const cycle of cycles ?? []) {
    const organization = Array.isArray(cycle.organizations) ? cycle.organizations[0] : cycle.organizations
    const settings = Array.isArray(organization?.finance_control_settings) ? organization?.finance_control_settings[0] : organization?.finance_control_settings
    const minimumReserve = Number(settings?.minimum_cash_reserve ?? 0)
    const openingCash = (organization?.business_accounts ?? []).reduce((sum, account) => sum + Number(account.opening_balance), 0)
    const moneyIn = (organization?.cashflow_transactions ?? []).filter((row) => row.direction === 'money_in').reduce((sum, row) => sum + Number(row.amount), 0)
    const moneyOut = (organization?.cashflow_transactions ?? []).filter((row) => row.direction === 'money_out').reduce((sum, row) => sum + Number(row.amount), 0)
    const currentCash = openingCash + moneyIn - moneyOut
    const payrollDue = Number(cycle.total_net_pay)
    const projectedAfterPayroll = currentCash - payrollDue

    if (projectedAfterPayroll >= minimumReserve) continue

    const recipients = await listFinanceRecipientIds(cycle.organization_id)
    notifications.push(...recipients.map((userId) => ({
      organizationId: cycle.organization_id,
      userId,
      type: projectedAfterPayroll < 0 ? 'payroll_gap_critical' : 'payroll_gap_warning',
      title: projectedAfterPayroll < 0 ? 'Payroll gap critical' : 'Payroll reserve warning',
      message: `Payroll due ${cycle.payroll_due_date}; projected after payroll ${projectedAfterPayroll.toLocaleString()}`,
      linkUrl: organization?.slug ? `/org/${organization.slug}/finance/payroll` : undefined
    })))
  }

  const insertedNotifications = await createDailyCronNotifications(notifications)

  return NextResponse.json({ checked: cycles?.length ?? 0, notifications: insertedNotifications })
}
