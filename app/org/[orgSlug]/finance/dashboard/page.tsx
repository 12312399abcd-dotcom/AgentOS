import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type FinanceDashboardProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function FinanceDashboard({ params }: FinanceDashboardProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  const monthStart = startOfMonth.toISOString().slice(0, 10)

  const { data: transactions } = await supabase
    .from('cashflow_transactions')
    .select('direction, amount')
    .eq('organization_id', organization.id)
    .gte('transaction_date', monthStart)

  const moneyIn = transactions?.filter((item) => item.direction === 'money_in').reduce((sum, item) => sum + Number(item.amount), 0) ?? 0
  const moneyOut = transactions?.filter((item) => item.direction === 'money_out').reduce((sum, item) => sum + Number(item.amount), 0) ?? 0

  return (
    <main className="shell">
      <h1>Finance Dashboard</h1>
      <div className="grid">
        <div className="card"><strong>Money In MTD</strong><p>{moneyIn.toLocaleString()}</p></div>
        <div className="card"><strong>Money Out MTD</strong><p>{moneyOut.toLocaleString()}</p></div>
        <div className="card"><strong>Net Cashflow</strong><p>{(moneyIn - moneyOut).toLocaleString()}</p></div>
        <div className="card"><strong>Cash Risk</strong><p>normal</p></div>
      </div>
    </main>
  )
}
