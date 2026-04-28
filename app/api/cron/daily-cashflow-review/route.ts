import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createNotifications, listFinanceRecipientIds } from '@/lib/services/notifications'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: organizations, error } = await admin
    .from('organizations')
    .select('id, slug, finance_control_settings(minimum_cash_reserve), business_accounts(opening_balance), cashflow_transactions(direction, amount)')
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notifications = []

  for (const organization of organizations ?? []) {
    const settings = Array.isArray(organization.finance_control_settings) ? organization.finance_control_settings[0] : organization.finance_control_settings
    const minimumReserve = Number(settings?.minimum_cash_reserve ?? 0)
    const openingCash = (organization.business_accounts ?? []).reduce((sum, account) => sum + Number(account.opening_balance), 0)
    const moneyIn = (organization.cashflow_transactions ?? []).filter((row) => row.direction === 'money_in').reduce((sum, row) => sum + Number(row.amount), 0)
    const moneyOut = (organization.cashflow_transactions ?? []).filter((row) => row.direction === 'money_out').reduce((sum, row) => sum + Number(row.amount), 0)
    const currentCash = openingCash + moneyIn - moneyOut

    if (currentCash >= minimumReserve) continue

    const recipients = await listFinanceRecipientIds(organization.id)
    notifications.push(...recipients.map((userId) => ({
      organizationId: organization.id,
      userId,
      type: 'cash_reserve_warning',
      title: 'Cash below reserve',
      message: `Current cash ${currentCash.toLocaleString()} is below reserve ${minimumReserve.toLocaleString()}`,
      linkUrl: `/org/${organization.slug}/finance/dashboard`
    })))
  }

  await createNotifications(notifications)

  return NextResponse.json({ organizations: organizations?.length ?? 0, notifications: notifications.length })
}
