'use server'

import { revalidatePath } from 'next/cache'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  businessAccountSchema,
  businessExpenseSchema,
  capitalTransactionSchema,
  cashflowTransactionSchema,
  markBusinessExpensePaidSchema,
  type BusinessAccountInput,
  type BusinessExpenseInput,
  type CapitalTransactionInput,
  type CashflowTransactionInput,
  type MarkBusinessExpensePaidInput
} from '@/lib/validators/finance.schema'

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

async function assertBusinessAccountBelongsToOrg(admin: ReturnType<typeof createAdminClient>, organizationId: string, accountId?: string) {
  if (!accountId) return

  const { data } = await admin
    .from('business_accounts')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('id', accountId)
    .maybeSingle()

  if (!data) throw new Error('Business account does not belong to this organization')
}

async function assertClientBelongsToOrg(admin: ReturnType<typeof createAdminClient>, organizationId: string, clientId?: string) {
  if (!clientId) return

  const { data } = await admin.from('clients').select('id').eq('organization_id', organizationId).eq('id', clientId).maybeSingle()
  if (!data) throw new Error('Client does not belong to this organization')
}

async function getCurrentCash(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    admin
      .from('business_accounts')
      .select('opening_balance, account_type')
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
    admin.from('cashflow_transactions').select('direction, amount').eq('organization_id', organizationId)
  ])

  const openingCash = (accounts ?? [])
    .filter((account) => ['cash', 'bank', 'wallet'].includes(account.account_type))
    .reduce((sum, account) => sum + Number(account.opening_balance), 0)
  const moneyIn = (transactions ?? [])
    .filter((item) => item.direction === 'money_in')
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const moneyOut = (transactions ?? [])
    .filter((item) => item.direction === 'money_out')
    .reduce((sum, item) => sum + Number(item.amount), 0)

  return openingCash + moneyIn - moneyOut
}

export async function createBusinessAccount(input: BusinessAccountInput) {
  const parsed = businessAccountSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('business_accounts')
    .insert({
      organization_id: parsed.organizationId,
      account_name: parsed.accountName,
      account_type: parsed.accountType,
      currency: parsed.currency,
      opening_balance: parsed.openingBalance,
      status: parsed.status
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'business_account',
    entity_id: data.id,
    action: 'created',
    new_data: parsed
  })

  return { accountId: data.id }
}

export async function addCashflowTransaction(input: CashflowTransactionInput) {
  const parsed = cashflowTransactionSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()
  await assertBusinessAccountBelongsToOrg(admin, parsed.organizationId, parsed.businessAccountId)
  await assertClientBelongsToOrg(admin, parsed.organizationId, parsed.clientId)

  const { data, error } = await admin
    .from('cashflow_transactions')
    .insert({
      organization_id: parsed.organizationId,
      transaction_date: parsed.transactionDate,
      direction: parsed.direction,
      category: parsed.category,
      amount: parsed.amount,
      business_account_id: parsed.businessAccountId,
      client_id: parsed.clientId,
      invoice_id: parsed.invoiceId,
      vendor_name: parsed.vendorName,
      payee_name: parsed.payeeName,
      payment_method: parsed.paymentMethod,
      notes: parsed.notes,
      created_by: member.user_id
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'cashflow_transaction',
    entity_id: data.id,
    action: 'created',
    new_data: parsed
  })

  return { transactionId: data.id }
}

export async function addBusinessExpense(input: BusinessExpenseInput) {
  const parsed = businessExpenseSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()
  await assertClientBelongsToOrg(admin, parsed.organizationId, parsed.clientId)
  await assertBusinessAccountBelongsToOrg(admin, parsed.organizationId, parsed.businessAccountId)

  const totalAmount = parsed.amount + parsed.taxAmount
  const { data: expense, error } = await admin
    .from('business_expenses')
    .insert({
      organization_id: parsed.organizationId,
      expense_date: parsed.expenseDate,
      due_date: parsed.dueDate,
      paid_date: parsed.status === 'paid' ? parsed.paidDate ?? parsed.expenseDate : null,
      category: parsed.category,
      vendor_name: parsed.vendorName,
      description: parsed.description,
      amount: parsed.amount,
      tax_amount: parsed.taxAmount,
      total_amount: totalAmount,
      status: parsed.status,
      client_id: parsed.clientId,
      created_by: member.user_id
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  if (parsed.status === 'paid') {
    await addCashflowTransaction({
      organizationId: parsed.organizationId,
      transactionDate: parsed.paidDate ?? parsed.expenseDate,
      direction: 'money_out',
      category: parsed.category,
      amount: totalAmount,
      businessAccountId: parsed.businessAccountId,
      clientId: parsed.clientId,
      vendorName: parsed.vendorName,
      paymentMethod: parsed.paymentMethod,
      notes: parsed.description
    })
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'business_expense',
    entity_id: expense.id,
    action: 'created',
    new_data: parsed
  })

  return { expenseId: expense.id }
}

export async function markBusinessExpensePaid(input: MarkBusinessExpensePaidInput) {
  const parsed = markBusinessExpensePaidSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()
  await assertBusinessAccountBelongsToOrg(admin, parsed.organizationId, parsed.businessAccountId)

  const { data: expense, error } = await admin
    .from('business_expenses')
    .select('id, category, total_amount, client_id, vendor_name, description, status')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.expenseId)
    .single()

  if (error || !expense) throw new Error('Expense not found')
  if (expense.status === 'cancelled') throw new Error('Cancelled expenses cannot be paid')

  const { error: updateError } = await admin
    .from('business_expenses')
    .update({ status: 'paid', paid_date: parsed.paidDate })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.expenseId)

  if (updateError) throw new Error(updateError.message)

  const cashflow = await addCashflowTransaction({
    organizationId: parsed.organizationId,
    transactionDate: parsed.paidDate,
    direction: 'money_out',
    category: expense.category,
    amount: Number(expense.total_amount),
    businessAccountId: parsed.businessAccountId,
    clientId: expense.client_id ?? undefined,
    vendorName: expense.vendor_name ?? undefined,
    paymentMethod: parsed.paymentMethod,
    notes: expense.description ?? undefined
  })

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'business_expense',
    entity_id: parsed.expenseId,
    action: 'marked_paid',
    new_data: { paid_date: parsed.paidDate, cashflow_transaction_id: cashflow.transactionId }
  })
}

export async function addCapitalTransaction(input: CapitalTransactionInput) {
  const parsed = capitalTransactionSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()
  await assertBusinessAccountBelongsToOrg(admin, parsed.organizationId, parsed.businessAccountId)

  const { data: settings } = await admin
    .from('finance_control_settings')
    .select('minimum_cash_reserve, owner_draw_requires_reserve_check')
    .eq('organization_id', parsed.organizationId)
    .single()

  const minimumReserve = Number(settings?.minimum_cash_reserve ?? 0)
  const requiresReserveCheck = settings?.owner_draw_requires_reserve_check ?? true

  if (['owner_draw', 'dividend_distribution'].includes(parsed.transactionType) && requiresReserveCheck) {
    const currentCash = await getCurrentCash(admin, parsed.organizationId)
    const projectedCashAfterDraw = currentCash - parsed.amount

    if (projectedCashAfterDraw < minimumReserve && (!parsed.adminOverrideNote || member.role !== 'admin')) {
      throw new Error('Owner draw would break minimum cash reserve and requires admin override note')
    }
  }

  const { data: capital, error } = await admin
    .from('capital_transactions')
    .insert({
      organization_id: parsed.organizationId,
      transaction_date: parsed.transactionDate,
      transaction_type: parsed.transactionType,
      amount: parsed.amount,
      counterparty: parsed.counterparty,
      notes: parsed.notes,
      created_by: member.user_id
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const direction = ['owner_capital_injection', 'loan_received'].includes(parsed.transactionType) ? 'money_in' : 'money_out'
  const { data: cashflow, error: cashflowError } = await admin
    .from('cashflow_transactions')
    .insert({
      organization_id: parsed.organizationId,
      transaction_date: parsed.transactionDate,
      direction,
      category: parsed.transactionType,
      amount: parsed.amount,
      business_account_id: parsed.businessAccountId,
      payee_name: direction === 'money_out' ? parsed.counterparty : undefined,
      vendor_name: direction === 'money_in' ? parsed.counterparty : undefined,
      payment_method: parsed.paymentMethod,
      notes: parsed.notes,
      created_by: member.user_id
    })
    .select('id')
    .single()

  if (cashflowError) throw new Error(cashflowError.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'capital_transaction',
    entity_id: capital.id,
    action: 'created',
    new_data: {
      ...parsed,
      cashflow_transaction_id: cashflow.id
    }
  })

  return { capitalTransactionId: capital.id, cashflowTransactionId: cashflow.id }
}

export async function createBusinessAccountFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await createBusinessAccount({
    organizationId,
    accountName: String(formData.get('accountName') ?? ''),
    accountType: String(formData.get('accountType') ?? 'bank') as BusinessAccountInput['accountType'],
    currency: String(formData.get('currency') ?? 'USD'),
    openingBalance: Number(formData.get('openingBalance') ?? 0),
    status: 'active'
  })

  revalidatePath(`/org/${orgSlug}/finance`)
}

export async function addCashflowTransactionFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await addCashflowTransaction({
    organizationId,
    transactionDate: String(formData.get('transactionDate') ?? ''),
    direction: String(formData.get('direction') ?? 'money_in') as CashflowTransactionInput['direction'],
    category: String(formData.get('category') ?? ''),
    amount: Number(formData.get('amount') ?? 0),
    businessAccountId: readOptionalString(formData, 'businessAccountId'),
    clientId: readOptionalString(formData, 'clientId'),
    vendorName: readOptionalString(formData, 'vendorName'),
    payeeName: readOptionalString(formData, 'payeeName'),
    paymentMethod: readOptionalString(formData, 'paymentMethod'),
    notes: readOptionalString(formData, 'notes')
  })

  revalidatePath(`/org/${orgSlug}/finance/cashflow`)
  revalidatePath(`/org/${orgSlug}/finance/dashboard`)
}

export async function addBusinessExpenseFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await addBusinessExpense({
    organizationId,
    expenseDate: String(formData.get('expenseDate') ?? ''),
    dueDate: readOptionalString(formData, 'dueDate'),
    paidDate: readOptionalString(formData, 'paidDate'),
    category: String(formData.get('category') ?? ''),
    vendorName: readOptionalString(formData, 'vendorName'),
    description: readOptionalString(formData, 'description'),
    amount: Number(formData.get('amount') ?? 0),
    taxAmount: Number(formData.get('taxAmount') ?? 0),
    status: String(formData.get('status') ?? 'unpaid') as BusinessExpenseInput['status'],
    clientId: readOptionalString(formData, 'clientId'),
    businessAccountId: readOptionalString(formData, 'businessAccountId'),
    paymentMethod: readOptionalString(formData, 'paymentMethod')
  })

  revalidatePath(`/org/${orgSlug}/finance/business-expenses`)
  revalidatePath(`/org/${orgSlug}/finance/cashflow`)
  revalidatePath(`/org/${orgSlug}/finance/dashboard`)
}

export async function markBusinessExpensePaidFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await markBusinessExpensePaid({
    organizationId,
    expenseId: String(formData.get('expenseId') ?? ''),
    paidDate: String(formData.get('paidDate') ?? ''),
    businessAccountId: readOptionalString(formData, 'businessAccountId'),
    paymentMethod: readOptionalString(formData, 'paymentMethod')
  })

  revalidatePath(`/org/${orgSlug}/finance/business-expenses`)
  revalidatePath(`/org/${orgSlug}/finance/cashflow`)
  revalidatePath(`/org/${orgSlug}/finance/dashboard`)
}

export async function addCapitalTransactionFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await addCapitalTransaction({
    organizationId,
    transactionDate: String(formData.get('transactionDate') ?? ''),
    transactionType: String(formData.get('transactionType') ?? 'owner_capital_injection') as CapitalTransactionInput['transactionType'],
    amount: Number(formData.get('amount') ?? 0),
    counterparty: readOptionalString(formData, 'counterparty'),
    notes: readOptionalString(formData, 'notes'),
    businessAccountId: readOptionalString(formData, 'businessAccountId'),
    paymentMethod: readOptionalString(formData, 'paymentMethod'),
    adminOverrideNote: readOptionalString(formData, 'adminOverrideNote')
  })

  revalidatePath(`/org/${orgSlug}/finance/capital-loans`)
  revalidatePath(`/org/${orgSlug}/finance/cashflow`)
  revalidatePath(`/org/${orgSlug}/finance/dashboard`)
  revalidatePath(`/org/${orgSlug}/finance/balance-sheet`)
}
