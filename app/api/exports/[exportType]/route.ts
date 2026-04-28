import { NextResponse } from 'next/server'

import { csvResponse, toCsv, type CsvCell } from '@/lib/services/csv'
import { getStatementRange, calculateIncomeStatement } from '@/lib/services/finance-statements'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type ExportRouteProps = {
  params: Promise<{ exportType: string }>
}

const operationExports = new Set(['content', 'tasks', 'social'])
const financeExports = new Set(['cashflow', 'forecast-variance', 'income-statement', 'tax-summary'])

function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return {
    start: `${month}-01`,
    end: new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10)
  }
}

function getClientName(value: unknown) {
  if (!value) return ''
  if (Array.isArray(value)) return value[0]?.name ?? ''
  if (typeof value === 'object' && 'name' in value) return String(value.name ?? '')
  return ''
}

export async function GET(req: Request, { params }: ExportRouteProps) {
  const { exportType } = await params
  const url = new URL(req.url)
  const orgSlug = url.searchParams.get('orgSlug')

  if (!orgSlug) {
    return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 })
  }

  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (operationExports.has(exportType)) {
    await requireWorkspaceAccess(organization.id, 'operation')
  } else if (financeExports.has(exportType)) {
    await requireWorkspaceAccess(organization.id, 'finance')
  } else {
    return NextResponse.json({ error: 'Unsupported export type' }, { status: 404 })
  }

  const supabase = await createClient()
  const stamp = new Date().toISOString().slice(0, 10)

  if (exportType === 'content') {
    const { data } = await supabase
      .from('content_items')
      .select('title, platform, content_type, status, publish_date, published_url, production_risk, clients(name)')
      .eq('organization_id', organization.id)
      .order('publish_date', { ascending: true, nullsFirst: false })

    const rows = (data ?? []).map((item): CsvCell[] => [
      item.title,
      getClientName(item.clients),
      item.platform,
      item.content_type,
      item.status,
      item.publish_date,
      item.published_url,
      item.production_risk
    ])

    return csvResponse(`content-${stamp}.csv`, toCsv(['Title', 'Client', 'Platform', 'Content Type', 'Status', 'Publish Date', 'Published URL', 'Risk'], rows))
  }

  if (exportType === 'tasks') {
    const { data } = await supabase
      .from('tasks')
      .select('title, task_type, required_role, status, priority, due_date, production_risk, clients(name)')
      .eq('organization_id', organization.id)
      .order('due_date', { ascending: true, nullsFirst: false })

    const rows = (data ?? []).map((task): CsvCell[] => [
      task.title,
      getClientName(task.clients),
      task.task_type,
      task.required_role,
      task.status,
      task.priority,
      task.due_date,
      task.production_risk
    ])

    return csvResponse(`tasks-${stamp}.csv`, toCsv(['Title', 'Client', 'Task Type', 'Required Role', 'Status', 'Priority', 'Due Date', 'Risk'], rows))
  }

  if (exportType === 'social') {
    const { data } = await supabase
      .from('social_posts')
      .select('channel, published_url, published_at, reach, impressions, likes, comments, shares, saves, clicks, leads, spend, report_period, clients(name)')
      .eq('organization_id', organization.id)
      .order('published_at', { ascending: false, nullsFirst: false })

    const rows = (data ?? []).map((post): CsvCell[] => [
      getClientName(post.clients),
      post.channel,
      post.published_url,
      post.published_at,
      post.reach,
      post.impressions,
      post.likes,
      post.comments,
      post.shares,
      post.saves,
      post.clicks,
      post.leads,
      post.spend,
      post.report_period
    ])

    return csvResponse(`social-${stamp}.csv`, toCsv(['Client', 'Channel', 'Published URL', 'Published At', 'Reach', 'Impressions', 'Likes', 'Comments', 'Shares', 'Saves', 'Clicks', 'Leads', 'Spend', 'Report Period'], rows))
  }

  if (exportType === 'cashflow') {
    const { data } = await supabase
      .from('cashflow_transactions')
      .select('transaction_date, direction, category, amount, vendor_name, payee_name, payment_method, notes, clients(name), business_accounts(account_name)')
      .eq('organization_id', organization.id)
      .order('transaction_date', { ascending: false })

    const rows = (data ?? []).map((transaction): CsvCell[] => {
      const account = Array.isArray(transaction.business_accounts) ? transaction.business_accounts[0] : transaction.business_accounts
      return [
        transaction.transaction_date,
        transaction.direction,
        transaction.category,
        getClientName(transaction.clients) || transaction.vendor_name || transaction.payee_name,
        transaction.amount,
        account?.account_name ?? '',
        transaction.payment_method,
        transaction.notes
      ]
    })

    return csvResponse(`cashflow-${stamp}.csv`, toCsv(['Date', 'Direction', 'Category', 'Client/Vendor/Payee', 'Amount', 'Account', 'Payment Method', 'Notes'], rows))
  }

  if (exportType === 'forecast-variance') {
    const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
    const bounds = monthBounds(month)
    const [{ data: items }, { data: cashflow }] = await Promise.all([
      supabase
        .from('forecast_budget_items')
        .select('item_type, category, expected_amount')
        .eq('organization_id', organization.id)
        .gte('expected_date', bounds.start)
        .lt('expected_date', bounds.end),
      supabase
        .from('cashflow_transactions')
        .select('direction, category, amount')
        .eq('organization_id', organization.id)
        .gte('transaction_date', bounds.start)
        .lt('transaction_date', bounds.end)
    ])
    const categories = new Set([...(items ?? []).map((item) => item.category), ...(cashflow ?? []).map((row) => row.category)])
    const rows = Array.from(categories).sort().map((category): CsvCell[] => {
      const forecast = (items ?? []).filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.expected_amount), 0)
      const actual = (cashflow ?? []).filter((row) => row.category === category).reduce((sum, row) => sum + Number(row.amount), 0)
      const variance = actual - forecast
      return [month, category, forecast, actual, variance, forecast === 0 ? 'N/A' : `${((variance / forecast) * 100).toFixed(2)}%`]
    })

    return csvResponse(`forecast-variance-${month}.csv`, toCsv(['Month', 'Category', 'Forecast', 'Actual', 'Variance', 'Variance %'], rows))
  }

  if (exportType === 'income-statement') {
    const statement = await calculateIncomeStatement(organization.id, getStatementRange(Object.fromEntries(url.searchParams)))
    const rows: CsvCell[][] = [
      ['Revenue', statement.revenue],
      ['Cost of Services', statement.costOfServices],
      ['Gross Profit', statement.grossProfit],
      ['Operating Expenses', statement.operatingExpenses],
      ['Operating Profit', statement.operatingProfit],
      ['Other Income', statement.otherIncome],
      ['Other Expenses', statement.otherExpenses],
      ['Tax', statement.tax],
      ['Net Income', statement.netIncome]
    ]

    return csvResponse(`income-statement-${stamp}.csv`, toCsv(['Line Item', 'Amount'], rows))
  }

  const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const bounds = monthBounds(month)
  const [{ data: transactions }, { data: settings }] = await Promise.all([
    supabase
      .from('cashflow_transactions')
      .select('direction, category, amount')
      .eq('organization_id', organization.id)
      .gte('transaction_date', bounds.start)
      .lt('transaction_date', bounds.end),
    supabase
      .from('finance_control_settings')
      .select('tax_reserve_rate')
      .eq('organization_id', organization.id)
      .single()
  ])
  const taxableRevenue = (transactions ?? [])
    .filter((row) => row.direction === 'money_in' && ['client_retainer', 'project_payment', 'consulting_fee', 'performance_fee', 'other_income'].includes(row.category))
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const taxPaid = (transactions ?? [])
    .filter((row) => row.direction === 'money_out' && row.category === 'tax_payment')
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const targetTaxReserve = taxableRevenue * Number(settings?.tax_reserve_rate ?? 0)

  return csvResponse(`tax-summary-${month}.csv`, toCsv(['Month', 'Taxable Revenue', 'Tax Reserve Rate', 'Target Tax Reserve', 'Tax Paid', 'Reserve Gap'], [[month, taxableRevenue, Number(settings?.tax_reserve_rate ?? 0), targetTaxReserve, taxPaid, targetTaxReserve - taxPaid]]))
}
