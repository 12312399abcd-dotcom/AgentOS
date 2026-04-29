import { createClient } from '@/lib/supabase/server'

export type StatementRange = {
  start: string
  end: string
}

export function getStatementRange(searchParams: { month?: string; quarter?: string; year?: string; start?: string; end?: string }): StatementRange {
  if (searchParams.start && searchParams.end) {
    return { start: searchParams.start, end: searchParams.end }
  }

  if (searchParams.quarter) {
    const [yearText, quarterText] = searchParams.quarter.split('-Q')
    const year = Number(yearText)
    const quarter = Number(quarterText)
    const startMonth = (quarter - 1) * 3
    const start = new Date(Date.UTC(year, startMonth, 1)).toISOString().slice(0, 10)
    const end = new Date(Date.UTC(year, startMonth + 3, 1)).toISOString().slice(0, 10)
    return { start, end }
  }

  if (searchParams.year) {
    return {
      start: `${searchParams.year}-01-01`,
      end: `${Number(searchParams.year) + 1}-01-01`
    }
  }

  const month = searchParams.month ?? new Date().toISOString().slice(0, 7)
  const [year, monthNumber] = month.split('-').map(Number)

  return {
    start: `${month}-01`,
    end: new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10)
  }
}

const revenueCategories = new Set([
  'client_retainer',
  'project_payment',
  'consulting_fee',
  'performance_fee',
  'other_income'
])

const costOfServicesCategories = new Set([
  'freelancer_payment',
  'production_cost',
  'ad_spend',
  'direct_contractor_cost',
  'client_fulfillment_cost'
])

const operatingExpenseCategories = new Set([
  'payroll',
  'staff_salary',
  'software_subscription',
  'office_rent',
  'office_cost',
  'equipment_purchase',
  'marketing_expense',
  'bank_fee',
  'professional_services',
  'other_expense'
])

const taxCategories = new Set(['tax_payment'])
const otherIncomeCategories = new Set(['interest_income', 'refund_received'])
const otherExpenseCategories = new Set(['interest_expense'])
const excludedIncomeStatementCategories = new Set([
  'owner_capital_injection',
  'loan_received',
  'cash_adjustment_in',
  'owner_draw',
  'loan_repayment',
  'dividend_distribution',
  'cash_adjustment_out'
])

export async function calculateIncomeStatement(organizationId: string, range: StatementRange) {
  const supabase = await createClient()
  const { data: transactions } = await supabase
    .from('cashflow_transactions')
    .select('direction, category, amount, client_id')
    .eq('organization_id', organizationId)
    .gte('transaction_date', range.start)
    .lt('transaction_date', range.end)

  const rows = transactions ?? []
  const revenue = rows
    .filter((row) => row.direction === 'money_in' && revenueCategories.has(row.category))
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const otherIncome = rows
    .filter((row) => row.direction === 'money_in' && otherIncomeCategories.has(row.category))
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const costOfServices = rows
    .filter((row) => row.direction === 'money_out' && (costOfServicesCategories.has(row.category) || (row.category === 'freelancer_payment' && row.client_id)))
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const operatingExpenses = rows
    .filter((row) => row.direction === 'money_out' && operatingExpenseCategories.has(row.category) && !excludedIncomeStatementCategories.has(row.category))
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const otherExpenses = rows
    .filter((row) => row.direction === 'money_out' && otherExpenseCategories.has(row.category))
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const tax = rows
    .filter((row) => row.direction === 'money_out' && taxCategories.has(row.category))
    .reduce((sum, row) => sum + Number(row.amount), 0)
  const grossProfit = revenue - costOfServices
  const operatingProfit = grossProfit - operatingExpenses
  const netIncome = operatingProfit + otherIncome - otherExpenses - tax

  const byCategory = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.category] = (acc[row.category] ?? 0) + Number(row.amount) * (row.direction === 'money_in' ? 1 : -1)
    return acc
  }, {})

  return {
    range,
    revenue,
    costOfServices,
    grossProfit,
    operatingExpenses,
    operatingProfit,
    otherIncome,
    otherExpenses,
    tax,
    netIncome,
    byCategory
  }
}

export async function calculateBalanceSheet(organizationId: string, range: StatementRange) {
  const supabase = await createClient()
  const [incomeStatement, accountsResult, cashflowResult, invoicesResult, expensesResult, payrollResult, capitalResult] = await Promise.all([
    calculateIncomeStatement(organizationId, range),
    supabase.from('business_accounts').select('opening_balance, account_type').eq('organization_id', organizationId).eq('status', 'active'),
    supabase.from('cashflow_transactions').select('direction, category, amount').eq('organization_id', organizationId).lt('transaction_date', range.end),
    supabase
      .from('invoices')
      .select('status, total_amount, sent_at, paid_at, created_at')
      .eq('organization_id', organizationId)
      .lt('created_at', `${range.end}T00:00:00.000Z`),
    supabase
      .from('business_expenses')
      .select('status, category, total_amount, expense_date, paid_date')
      .eq('organization_id', organizationId)
      .lt('expense_date', range.end),
    supabase
      .from('payroll_cycles')
      .select('status, total_net_pay, tax_withholding, payroll_due_date, paid_at')
      .eq('organization_id', organizationId)
      .lt('payroll_due_date', range.end),
    supabase.from('capital_transactions').select('transaction_type, amount').eq('organization_id', organizationId).lt('transaction_date', range.end)
  ])

  const accounts = accountsResult.data ?? []
  const cashflow = cashflowResult.data ?? []
  const invoices = invoicesResult.data ?? []
  const expenses = expensesResult.data ?? []
  const payroll = payrollResult.data ?? []
  const capital = capitalResult.data ?? []
  const openingCash = accounts
    .filter((account) => ['cash', 'bank', 'wallet'].includes(account.account_type))
    .reduce((sum, account) => sum + Number(account.opening_balance), 0)
  const moneyIn = cashflow.filter((row) => row.direction === 'money_in').reduce((sum, row) => sum + Number(row.amount), 0)
  const moneyOut = cashflow.filter((row) => row.direction === 'money_out').reduce((sum, row) => sum + Number(row.amount), 0)
  const cash = openingCash + moneyIn - moneyOut
  const accountsReceivable = invoices
    .filter((invoice) => {
      const wasIssued = Boolean(invoice.sent_at) || ['sent', 'partial_paid', 'overdue', 'paid'].includes(invoice.status)
      const paidAfterSnapshot = invoice.paid_at ? invoice.paid_at >= `${range.end}T00:00:00.000Z` : true
      return wasIssued && invoice.status !== 'cancelled' && paidAfterSnapshot
    })
    .reduce((sum, invoice) => sum + Number(invoice.total_amount), 0)
  const accountsPayable = expenses
    .filter((expense) => {
      const paidAfterSnapshot = expense.paid_date ? expense.paid_date >= range.end : true
      return expense.status !== 'cancelled' && paidAfterSnapshot
    })
    .reduce((sum, expense) => sum + Number(expense.total_amount), 0)
  const taxPayable =
    expenses
      .filter((expense) => {
        const paidAfterSnapshot = expense.paid_date ? expense.paid_date >= range.end : true
        return expense.category === 'tax_payment' && expense.status !== 'cancelled' && paidAfterSnapshot
      })
      .reduce((sum, expense) => sum + Number(expense.total_amount), 0) +
    payroll
      .filter((cycle) => {
        const paidAfterSnapshot = cycle.paid_at ? cycle.paid_at >= `${range.end}T00:00:00.000Z` : true
        return paidAfterSnapshot
      })
      .reduce((sum, cycle) => sum + Number(cycle.tax_withholding), 0)
  const payrollPayable = payroll
    .filter((cycle) => {
      const paidAfterSnapshot = cycle.paid_at ? cycle.paid_at >= `${range.end}T00:00:00.000Z` : true
      return paidAfterSnapshot && ['planned', 'reserved', 'approved', 'partial_paid', 'blocked', 'paid'].includes(cycle.status)
    })
    .reduce((sum, cycle) => sum + Number(cycle.total_net_pay), 0)
  const loansReceived = capital.filter((row) => row.transaction_type === 'loan_received').reduce((sum, row) => sum + Number(row.amount), 0)
  const loanRepayments = capital.filter((row) => row.transaction_type === 'loan_repayment').reduce((sum, row) => sum + Number(row.amount), 0)
  const loansPayable = loansReceived - loanRepayments
  const ownerCapital = capital.filter((row) => row.transaction_type === 'owner_capital_injection').reduce((sum, row) => sum + Number(row.amount), 0)
  const ownerDraws = capital.filter((row) => row.transaction_type === 'owner_draw').reduce((sum, row) => sum + Number(row.amount), 0)
  const retainedEarnings = 0
  const currentPeriodProfit = incomeStatement.netIncome
  const totalAssets = cash + accountsReceivable
  const totalLiabilities = accountsPayable + taxPayable + payrollPayable + loansPayable
  const totalEquity = ownerCapital - ownerDraws + retainedEarnings + currentPeriodProfit

  return {
    range,
    cash,
    accountsReceivable,
    prepaidExpenses: 0,
    equipmentAssets: 0,
    deposits: 0,
    totalAssets,
    accountsPayable,
    taxPayable,
    payrollPayable,
    loansPayable,
    unearnedRevenue: 0,
    creditCardPayable: 0,
    totalLiabilities,
    ownerCapital,
    ownerDraws,
    retainedEarnings,
    currentPeriodProfit,
    totalEquity,
    balanceStatus: totalAssets === totalLiabilities + totalEquity ? 'balanced' : 'out_of_balance'
  }
}
