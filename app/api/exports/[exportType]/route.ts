import { NextResponse } from 'next/server'

import { csvResponse, toCsv, type CsvCell } from '@/lib/services/csv'
import { getContentItems, parseContentFilters } from '@/lib/services/content-queries'
import { getStatementRange, calculateBalanceSheet, calculateIncomeStatement } from '@/lib/services/finance-statements'
import { getOrganizationBySlug, getWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type ExportRouteProps = {
  params: Promise<{ exportType: string }>
}

type ExportRow = Record<string, CsvCell> & {
  business_accounts?: unknown
  clients?: unknown
  payroll_items?: ExportRow[]
  profiles?: unknown
}

const operationExports = new Set(['content', 'tasks', 'social'])
const financeExports = new Set(['cashflow', 'business-expenses', 'invoices', 'payroll', 'capital-loans', 'forecast-variance', 'income-statement', 'balance-sheet', 'tax-summary'])

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

function exportError(error: { message?: string } | null) {
  return NextResponse.json({ error: error?.message ?? 'Export query failed' }, { status: 500 })
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
    const access = await getWorkspaceAccess(organization.id, 'operation')
    if (!access.member) return NextResponse.json({ error: access.error }, { status: access.status })
  } else if (financeExports.has(exportType)) {
    const access = await getWorkspaceAccess(organization.id, 'finance')
    if (!access.member) return NextResponse.json({ error: access.error }, { status: access.status })
  } else {
    return NextResponse.json({ error: 'Unsupported export type' }, { status: 404 })
  }

  const supabase = await createClient()
  const stamp = new Date().toISOString().slice(0, 10)
  const clientId = url.searchParams.get('clientId')
  const status = url.searchParams.get('status')
  const requiredRole = url.searchParams.get('requiredRole')
  const direction = url.searchParams.get('direction')
  const category = url.searchParams.get('category')
  const businessAccountId = url.searchParams.get('businessAccountId')
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  const dueStart = url.searchParams.get('dueStart')
  const dueEnd = url.searchParams.get('dueEnd')
  const periodMonth = url.searchParams.get('periodMonth')
  const transactionType = url.searchParams.get('transactionType')

  if (exportType === 'content') {
    const items = await getContentItems(organization.id, parseContentFilters(Object.fromEntries(url.searchParams)))
    const rows = items.map((item): CsvCell[] => [
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
    let query = supabase
      .from('tasks')
      .select('title, task_type, required_role, status, priority, due_date, production_risk, clients(name)')
      .eq('organization_id', organization.id)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (clientId) query = query.eq('client_id', clientId)
    if (status) query = query.eq('status', status)
    if (requiredRole) query = query.eq('required_role', requiredRole)

    const { data, error } = await query
    if (error) return exportError(error)

    const rows = ((data ?? []) as unknown as ExportRow[]).map((task): CsvCell[] => [
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
    let query = supabase
      .from('social_posts')
      .select('channel, published_url, published_at, reach, impressions, likes, comments, shares, saves, clicks, leads, spend, report_period, clients(name)')
      .eq('organization_id', organization.id)
      .order('published_at', { ascending: false, nullsFirst: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    if (error) return exportError(error)

    const rows = ((data ?? []) as unknown as ExportRow[]).map((post): CsvCell[] => [
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
    let query = supabase
      .from('cashflow_transactions')
      .select('transaction_date, direction, category, amount, vendor_name, payee_name, payment_method, notes, clients(name), business_accounts(account_name)')
      .eq('organization_id', organization.id)
      .order('transaction_date', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)
    if (direction) query = query.eq('direction', direction)
    if (category) query = query.ilike('category', `%${category}%`)
    if (businessAccountId) query = query.eq('business_account_id', businessAccountId)
    if (start) query = query.gte('transaction_date', start)
    if (end) query = query.lte('transaction_date', end)

    const { data, error } = await query
    if (error) return exportError(error)

    const rows = ((data ?? []) as unknown as ExportRow[]).map((transaction): CsvCell[] => {
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

  if (exportType === 'business-expenses') {
    let query = supabase
      .from('business_expenses')
      .select('expense_date, due_date, paid_date, category, vendor_name, description, amount, tax_amount, total_amount, status, clients(name)')
      .eq('organization_id', organization.id)
      .order('expense_date', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)
    if (status) query = query.eq('status', status)
    if (category) query = query.ilike('category', `%${category}%`)
    if (start) query = query.gte('expense_date', start)
    if (end) query = query.lte('expense_date', end)

    const { data, error } = await query
    if (error) return exportError(error)
    const rows = ((data ?? []) as unknown as ExportRow[]).map((expense): CsvCell[] => [
      expense.expense_date,
      expense.due_date,
      expense.paid_date,
      expense.category,
      expense.vendor_name || getClientName(expense.clients) || 'Company-level',
      expense.description,
      expense.amount,
      expense.tax_amount,
      expense.total_amount,
      expense.status
    ])

    return csvResponse(`business-expenses-${stamp}.csv`, toCsv(['Expense Date', 'Due Date', 'Paid Date', 'Category', 'Vendor/Client', 'Description', 'Amount', 'Tax', 'Total', 'Status'], rows))
  }

  if (exportType === 'invoices') {
    let query = supabase
      .from('invoices')
      .select('invoice_number, service_period_start, service_period_end, subtotal, tax_rate, tax_amount, total_amount, status, due_date, sent_at, paid_at, clients(name)')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)
    if (status) query = query.eq('status', status)
    if (dueStart) query = query.gte('due_date', dueStart)
    if (dueEnd) query = query.lte('due_date', dueEnd)

    const { data, error } = await query
    if (error) return exportError(error)
    const rows = ((data ?? []) as unknown as ExportRow[]).map((invoice): CsvCell[] => [
      invoice.invoice_number,
      getClientName(invoice.clients),
      invoice.service_period_start,
      invoice.service_period_end,
      invoice.subtotal,
      invoice.tax_rate,
      invoice.tax_amount,
      invoice.total_amount,
      invoice.status,
      invoice.due_date,
      invoice.sent_at,
      invoice.paid_at
    ])

    return csvResponse(`invoices-${stamp}.csv`, toCsv(['Invoice', 'Client', 'Service Start', 'Service End', 'Subtotal', 'Tax Rate', 'Tax Amount', 'Total', 'Status', 'Due Date', 'Sent At', 'Paid At'], rows))
  }

  if (exportType === 'payroll') {
    let query = supabase
      .from('payroll_cycles')
      .select('period_month, payroll_due_date, total_gross_pay, total_net_pay, tax_withholding, status, paid_at, payroll_items(payee_name, payee_type, gross_amount, tax_amount, net_amount, payment_status, paid_date, profiles(full_name, email))')
      .eq('organization_id', organization.id)
      .order('period_month', { ascending: false })

    if (periodMonth) query = query.eq('period_month', periodMonth)
    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return exportError(error)
    const rows = ((data ?? []) as unknown as ExportRow[]).flatMap((cycle): CsvCell[][] =>
      ((cycle.payroll_items ?? []) as unknown as ExportRow[]).map((item): CsvCell[] => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        return [
          cycle.period_month,
          cycle.payroll_due_date,
          cycle.status,
          cycle.total_gross_pay,
          cycle.total_net_pay,
          cycle.tax_withholding,
          cycle.paid_at,
          profile?.full_name ?? profile?.email ?? item.payee_name,
          item.payee_type,
          item.gross_amount,
          item.tax_amount,
          item.net_amount,
          item.payment_status,
          item.paid_date
        ]
      })
    )

    return csvResponse(`payroll-${stamp}.csv`, toCsv(['Period', 'Due Date', 'Cycle Status', 'Cycle Gross', 'Cycle Net', 'Cycle Tax', 'Cycle Paid At', 'Payee', 'Payee Type', 'Gross', 'Tax', 'Net', 'Payment Status', 'Paid Date'], rows))
  }

  if (exportType === 'capital-loans') {
    let query = supabase
      .from('capital_transactions')
      .select('transaction_date, transaction_type, amount, counterparty, notes')
      .eq('organization_id', organization.id)
      .order('transaction_date', { ascending: false })

    if (transactionType) query = query.eq('transaction_type', transactionType)
    if (start) query = query.gte('transaction_date', start)
    if (end) query = query.lte('transaction_date', end)

    const { data, error } = await query
    if (error) return exportError(error)
    const rows = ((data ?? []) as unknown as ExportRow[]).map((transaction): CsvCell[] => [
      transaction.transaction_date,
      transaction.transaction_type,
      transaction.counterparty,
      transaction.amount,
      transaction.notes
    ])

    return csvResponse(`capital-loans-${stamp}.csv`, toCsv(['Date', 'Type', 'Counterparty', 'Amount', 'Notes'], rows))
  }

  if (exportType === 'forecast-variance') {
    const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
    const bounds = monthBounds(month)
    let forecastQuery = supabase
      .from('forecast_budget_items')
      .select('item_type, category, expected_amount')
      .eq('organization_id', organization.id)
      .gte('expected_date', bounds.start)
      .lt('expected_date', bounds.end)
    let cashflowQuery = supabase
      .from('cashflow_transactions')
      .select('direction, category, amount')
      .eq('organization_id', organization.id)
      .gte('transaction_date', bounds.start)
      .lt('transaction_date', bounds.end)

    if (clientId) {
      forecastQuery = forecastQuery.eq('client_id', clientId)
      cashflowQuery = cashflowQuery.eq('client_id', clientId)
    }

    if (category) {
      forecastQuery = forecastQuery.ilike('category', `%${category}%`)
      cashflowQuery = cashflowQuery.ilike('category', `%${category}%`)
    }

    const [{ data: items, error: forecastError }, { data: cashflow, error: cashflowError }] = await Promise.all([forecastQuery, cashflowQuery])
    if (forecastError) return exportError(forecastError)
    if (cashflowError) return exportError(cashflowError)
    const forecastItems = (items ?? []) as unknown as ExportRow[]
    const cashflowRows = (cashflow ?? []) as unknown as ExportRow[]
    const categories = new Set([...forecastItems.map((item) => item.category), ...cashflowRows.map((row) => row.category)])
    const rows = Array.from(categories).sort().map((category): CsvCell[] => {
      const forecast = forecastItems.filter((item) => item.category === category).reduce((sum, item) => sum + Number(item.expected_amount), 0)
      const actual = cashflowRows.filter((row) => row.category === category).reduce((sum, row) => sum + Number(row.amount), 0)
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

  if (exportType === 'balance-sheet') {
    const sheet = await calculateBalanceSheet(organization.id, getStatementRange(Object.fromEntries(url.searchParams)))
    const rows: CsvCell[][] = [
      ['Assets', 'Cash', sheet.cash],
      ['Assets', 'Accounts Receivable', sheet.accountsReceivable],
      ['Assets', 'Prepaid Expenses', sheet.prepaidExpenses],
      ['Assets', 'Equipment Assets', sheet.equipmentAssets],
      ['Assets', 'Deposits', sheet.deposits],
      ['Assets', 'Total Assets', sheet.totalAssets],
      ['Liabilities', 'Accounts Payable', sheet.accountsPayable],
      ['Liabilities', 'Tax Payable', sheet.taxPayable],
      ['Liabilities', 'Payroll Payable', sheet.payrollPayable],
      ['Liabilities', 'Loans Payable', sheet.loansPayable],
      ['Liabilities', 'Unearned Revenue', sheet.unearnedRevenue],
      ['Liabilities', 'Credit Card Payable', sheet.creditCardPayable],
      ['Liabilities', 'Total Liabilities', sheet.totalLiabilities],
      ['Equity', 'Owner Capital', sheet.ownerCapital],
      ['Equity', 'Owner Draws', sheet.ownerDraws],
      ['Equity', 'Retained Earnings', sheet.retainedEarnings],
      ['Equity', 'Current Period Profit', sheet.currentPeriodProfit],
      ['Equity', 'Total Equity', sheet.totalEquity],
      ['Validation', 'Balance Status', sheet.balanceStatus]
    ]

    return csvResponse(`balance-sheet-${stamp}.csv`, toCsv(['Section', 'Line Item', 'Amount'], rows))
  }

  const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const bounds = monthBounds(month)
  const [{ data: transactions, error: transactionsError }, { data: settings, error: settingsError }] = await Promise.all([
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
  if (transactionsError) return exportError(transactionsError)
  if (settingsError) return exportError(settingsError)
  const transactionRows = (transactions ?? []) as unknown as ExportRow[]
  const taxableRevenue = transactionRows
    .filter((row) => row.direction === 'money_in' && ['client_retainer', 'project_payment', 'consulting_fee', 'performance_fee', 'other_income'].includes(String(row.category)))
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const taxPaid = transactionRows
    .filter((row) => row.direction === 'money_out' && row.category === 'tax_payment')
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const financeSettings = settings as { tax_reserve_rate?: number | string | null } | null
  const taxReserveRate = Number(financeSettings?.tax_reserve_rate ?? 0)
  const targetTaxReserve = taxableRevenue * taxReserveRate

  return csvResponse(`tax-summary-${month}.csv`, toCsv(['Month', 'Taxable Revenue', 'Tax Reserve Rate', 'Target Tax Reserve', 'Tax Paid', 'Reserve Gap'], [[month, taxableRevenue, taxReserveRate, targetTaxReserve, taxPaid, targetTaxReserve - taxPaid]]))
}
