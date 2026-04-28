'use server'

import { revalidatePath } from 'next/cache'

import { getStatementRange, calculateBalanceSheet } from '@/lib/services/finance-statements'
import { requireAdmin, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  closeFinancialPeriodSchema,
  createFinancialPeriodSchema,
  createForecastBudgetSchema,
  forecastBudgetItemSchema,
  updateForecastStatusSchema,
  type CloseFinancialPeriodInput,
  type CreateFinancialPeriodInput,
  type CreateForecastBudgetInput,
  type ForecastBudgetItemInput,
  type UpdateForecastStatusInput
} from '@/lib/validators/forecast.schema'

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function periodBounds(periodMonth: string) {
  const [year, month] = periodMonth.split('-').map(Number)
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  }
}

async function recalculateForecastTotals(admin: ReturnType<typeof createAdminClient>, organizationId: string, forecastBudgetId: string) {
  const [{ data: budget }, { data: items }] = await Promise.all([
    admin
      .from('forecast_budgets')
      .select('opening_cash, expected_tax_reserve')
      .eq('organization_id', organizationId)
      .eq('id', forecastBudgetId)
      .single(),
    admin
      .from('forecast_budget_items')
      .select('item_type, expected_amount')
      .eq('organization_id', organizationId)
      .eq('forecast_budget_id', forecastBudgetId)
  ])

  if (!budget) throw new Error('Forecast budget not found')

  const expectedMoneyIn = (items ?? [])
    .filter((item) => ['money_in', 'owner_equity'].includes(item.item_type))
    .reduce((sum, item) => sum + Number(item.expected_amount), 0)
  const expectedMoneyOut = (items ?? [])
    .filter((item) => ['money_out', 'asset_purchase', 'liability_payment', 'tax_reserve'].includes(item.item_type))
    .reduce((sum, item) => sum + Number(item.expected_amount), 0)
  const expectedTaxReserve = (items ?? [])
    .filter((item) => item.item_type === 'tax_reserve')
    .reduce((sum, item) => sum + Number(item.expected_amount), Number(budget.expected_tax_reserve ?? 0))
  const expectedClosingCash = Number(budget.opening_cash) + expectedMoneyIn - expectedMoneyOut

  const { error } = await admin
    .from('forecast_budgets')
    .update({
      expected_money_in: expectedMoneyIn,
      expected_money_out: expectedMoneyOut,
      expected_tax_reserve: expectedTaxReserve,
      expected_closing_cash: expectedClosingCash
    })
    .eq('organization_id', organizationId)
    .eq('id', forecastBudgetId)

  if (error) throw new Error(error.message)
}

export async function createForecastBudget(input: CreateForecastBudgetInput) {
  const parsed = createForecastBudgetSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('forecast_budgets')
    .insert({
      organization_id: parsed.organizationId,
      forecast_month: parsed.forecastMonth,
      opening_cash: parsed.openingCash,
      expected_tax_reserve: parsed.expectedTaxReserve,
      expected_closing_cash: parsed.openingCash - parsed.expectedTaxReserve,
      created_by: member.user_id
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'forecast_budget',
    entity_id: data.id,
    action: 'created',
    new_data: parsed
  })

  return { forecastBudgetId: data.id }
}

export async function addForecastBudgetItem(input: ForecastBudgetItemInput) {
  const parsed = forecastBudgetItemSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  if (parsed.clientId) {
    const { data: client } = await admin.from('clients').select('id').eq('organization_id', parsed.organizationId).eq('id', parsed.clientId).maybeSingle()
    if (!client) throw new Error('Client does not belong to this organization')
  }

  const { data, error } = await admin
    .from('forecast_budget_items')
    .insert({
      organization_id: parsed.organizationId,
      forecast_budget_id: parsed.forecastBudgetId,
      item_type: parsed.itemType,
      category: parsed.category,
      description: parsed.description,
      client_id: parsed.clientId,
      expected_date: parsed.expectedDate,
      expected_amount: parsed.expectedAmount
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  await recalculateForecastTotals(admin, parsed.organizationId, parsed.forecastBudgetId)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'forecast_budget_item',
    entity_id: data.id,
    action: 'created',
    new_data: parsed
  })
}

export async function updateForecastStatus(input: UpdateForecastStatusInput) {
  const parsed = updateForecastStatusSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  const updates: Record<string, string | null> = { status: parsed.status }
  if (parsed.status === 'approved') {
    updates.approved_by = member.user_id
    updates.approved_at = new Date().toISOString()
  }

  const { data: budget, error } = await admin
    .from('forecast_budgets')
    .update(updates)
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.forecastBudgetId)
    .select('id, forecast_month, opening_cash, expected_closing_cash')
    .single()

  if (error || !budget) throw new Error(error?.message ?? 'Forecast budget not found')

  if (parsed.status === 'active') {
    const bounds = periodBounds(budget.forecast_month)
    await admin.from('financial_periods').upsert({
      organization_id: parsed.organizationId,
      period_month: budget.forecast_month,
      period_start: bounds.start,
      period_end: bounds.end,
      forecast_budget_id: budget.id,
      opening_cash: budget.opening_cash,
      projected_closing_cash: budget.expected_closing_cash,
      status: 'open'
    })
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'forecast_budget',
    entity_id: parsed.forecastBudgetId,
    action: 'status_updated',
    new_data: { status: parsed.status }
  })
}

export async function createFinancialPeriod(input: CreateFinancialPeriodInput) {
  const parsed = createFinancialPeriodSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()
  const bounds = periodBounds(parsed.periodMonth)

  const { data: settings } = await admin
    .from('finance_control_settings')
    .select('minimum_cash_reserve, tax_reserve_rate')
    .eq('organization_id', parsed.organizationId)
    .single()

  const { data, error } = await admin
    .from('financial_periods')
    .insert({
      organization_id: parsed.organizationId,
      period_month: parsed.periodMonth,
      period_start: bounds.start,
      period_end: bounds.end,
      forecast_budget_id: parsed.forecastBudgetId,
      opening_cash: parsed.openingCash,
      minimum_cash_reserve: settings?.minimum_cash_reserve ?? 0,
      tax_reserve_rate: settings?.tax_reserve_rate ?? 0,
      status: 'planning'
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'financial_period',
    entity_id: data.id,
    action: 'created',
    new_data: parsed
  })
}

export async function closeFinancialPeriod(input: CloseFinancialPeriodInput) {
  const parsed = closeFinancialPeriodSchema.parse(input)
  const member = await requireAdmin(parsed.organizationId)
  const admin = createAdminClient()
  const balanceSheet = await calculateBalanceSheet(parsed.organizationId, getStatementRange({ month: parsed.periodMonth }))
  const balanceGap = balanceSheet.totalAssets - (balanceSheet.totalLiabilities + balanceSheet.totalEquity)

  if (balanceGap !== 0 && !parsed.adminOverrideNote) {
    throw new Error('Balance sheet is out of balance and requires an admin override note')
  }

  const { data: period } = await admin
    .from('financial_periods')
    .select('id, minimum_cash_reserve')
    .eq('organization_id', parsed.organizationId)
    .eq('period_month', parsed.periodMonth)
    .single()

  if (!period) throw new Error('Financial period not found')

  const minimumReserve = Number(period.minimum_cash_reserve ?? 0)
  const cashRiskStatus = balanceSheet.cash < 0 ? 'critical' : balanceSheet.cash < minimumReserve ? 'high' : 'normal'

  const { error: snapshotError } = await admin.from('balance_sheet_snapshots').upsert({
    organization_id: parsed.organizationId,
    period_month: parsed.periodMonth,
    cash: balanceSheet.cash,
    accounts_receivable: balanceSheet.accountsReceivable,
    prepaid_expenses: balanceSheet.prepaidExpenses,
    equipment_assets: balanceSheet.equipmentAssets,
    deposits: balanceSheet.deposits,
    total_assets: balanceSheet.totalAssets,
    accounts_payable: balanceSheet.accountsPayable,
    tax_payable: balanceSheet.taxPayable,
    payroll_payable: balanceSheet.payrollPayable,
    loans_payable: balanceSheet.loansPayable,
    unearned_revenue: balanceSheet.unearnedRevenue,
    credit_card_payable: balanceSheet.creditCardPayable,
    total_liabilities: balanceSheet.totalLiabilities,
    owner_capital: balanceSheet.ownerCapital,
    owner_draws: balanceSheet.ownerDraws,
    retained_earnings: balanceSheet.retainedEarnings,
    current_period_profit: balanceSheet.currentPeriodProfit,
    total_equity: balanceSheet.totalEquity,
    created_by: member.user_id
  })

  if (snapshotError) throw new Error(snapshotError.message)

  const { error: updateError } = await admin
    .from('financial_periods')
    .update({
      closing_cash: balanceSheet.cash,
      actual_closing_cash: balanceSheet.cash,
      cash_risk_status: cashRiskStatus,
      status: 'locked',
      review_notes: parsed.reviewNotes ?? parsed.adminOverrideNote,
      closed_by: member.user_id,
      closed_at: new Date().toISOString()
    })
    .eq('organization_id', parsed.organizationId)
    .eq('period_month', parsed.periodMonth)

  if (updateError) throw new Error(updateError.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'financial_period',
    entity_id: period.id,
    action: 'closed',
    new_data: {
      period_month: parsed.periodMonth,
      actual_closing_cash: balanceSheet.cash,
      balance_status: balanceSheet.balanceStatus,
      balance_gap: balanceGap,
      admin_override_note: parsed.adminOverrideNote
    }
  })
}

export async function createForecastBudgetFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await createForecastBudget({
    organizationId,
    forecastMonth: String(formData.get('forecastMonth') ?? ''),
    openingCash: Number(formData.get('openingCash') ?? 0),
    expectedTaxReserve: Number(formData.get('expectedTaxReserve') ?? 0)
  })
  revalidatePath(`/org/${orgSlug}/finance/forecast-budget`)
}

export async function addForecastBudgetItemFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await addForecastBudgetItem({
    organizationId,
    forecastBudgetId: String(formData.get('forecastBudgetId') ?? ''),
    itemType: String(formData.get('itemType') ?? 'money_out') as ForecastBudgetItemInput['itemType'],
    category: String(formData.get('category') ?? ''),
    description: readOptionalString(formData, 'description'),
    clientId: readOptionalString(formData, 'clientId'),
    expectedDate: readOptionalString(formData, 'expectedDate'),
    expectedAmount: Number(formData.get('expectedAmount') ?? 0)
  })
  revalidatePath(`/org/${orgSlug}/finance/forecast-budget`)
}

export async function updateForecastStatusFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateForecastStatus({
    organizationId,
    forecastBudgetId: String(formData.get('forecastBudgetId') ?? ''),
    status: String(formData.get('status') ?? 'draft') as UpdateForecastStatusInput['status']
  })
  revalidatePath(`/org/${orgSlug}/finance/forecast-budget`)
  revalidatePath(`/org/${orgSlug}/finance/period-close`)
}

export async function createFinancialPeriodFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await createFinancialPeriod({
    organizationId,
    periodMonth: String(formData.get('periodMonth') ?? ''),
    forecastBudgetId: readOptionalString(formData, 'forecastBudgetId'),
    openingCash: Number(formData.get('openingCash') ?? 0)
  })
  revalidatePath(`/org/${orgSlug}/finance/period-close`)
}

export async function closeFinancialPeriodFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await closeFinancialPeriod({
    organizationId,
    periodMonth: String(formData.get('periodMonth') ?? ''),
    reviewNotes: readOptionalString(formData, 'reviewNotes'),
    adminOverrideNote: readOptionalString(formData, 'adminOverrideNote')
  })

  revalidatePath(`/org/${orgSlug}/finance/period-close`)
  revalidatePath(`/org/${orgSlug}/finance/balance-sheet`)
  revalidatePath(`/org/${orgSlug}/finance/dashboard`)
}
