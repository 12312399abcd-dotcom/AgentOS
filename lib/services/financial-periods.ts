import type { createAdminClient } from '@/lib/supabase/admin'

function periodMonthFromDate(date: string) {
  return date.slice(0, 7)
}

export async function assertFinancialPeriodEditable(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  transactionDate: string
) {
  const periodMonth = periodMonthFromDate(transactionDate)
  const { data: period, error } = await admin
    .from('financial_periods')
    .select('status')
    .eq('organization_id', organizationId)
    .eq('period_month', periodMonth)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!period) return

  if (['closed', 'locked'].includes(period.status)) {
    throw new Error('Financial period is closed or locked. Create an adjustment in an open period instead.')
  }
}
