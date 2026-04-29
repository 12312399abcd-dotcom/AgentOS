import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createNotifications, listFinanceRecipientIds } from '@/lib/services/notifications'
import { createAdminClient } from '@/lib/supabase/admin'

function monthBounds(periodMonth: string) {
  const [year, month] = periodMonth.split('-').map(Number)
  return {
    start: `${periodMonth}-01`,
    end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  }
}

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const admin = createAdminClient()
  const { data: forecasts, error } = await admin
    .from('forecast_budgets')
    .select('id, organization_id, forecast_month, opening_cash, expected_closing_cash, organizations(slug)')
    .eq('forecast_month', currentMonth)
    .eq('status', 'approved')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notifications = []

  for (const forecast of forecasts ?? []) {
    const bounds = monthBounds(forecast.forecast_month)
    const { error: updateError } = await admin
      .from('forecast_budgets')
      .update({ status: 'active' })
      .eq('organization_id', forecast.organization_id)
      .eq('id', forecast.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { error: periodError } = await admin.from('financial_periods').upsert({
      organization_id: forecast.organization_id,
      period_month: forecast.forecast_month,
      period_start: bounds.start,
      period_end: bounds.end,
      forecast_budget_id: forecast.id,
      opening_cash: forecast.opening_cash,
      projected_closing_cash: forecast.expected_closing_cash,
      status: 'open'
    })

    if (periodError) {
      return NextResponse.json({ error: periodError.message }, { status: 500 })
    }

    const organization = Array.isArray(forecast.organizations) ? forecast.organizations[0] : forecast.organizations
    const recipients = await listFinanceRecipientIds(forecast.organization_id)
    notifications.push(...recipients.map((userId) => ({
      organizationId: forecast.organization_id,
      userId,
      type: 'forecast_activated',
      title: 'Forecast activated',
      message: forecast.forecast_month,
      linkUrl: organization?.slug ? `/org/${organization.slug}/finance/forecast-budget` : undefined
    })))
  }

  await createNotifications(notifications)

  return NextResponse.json({ activated: forecasts?.length ?? 0, notifications: notifications.length })
}
