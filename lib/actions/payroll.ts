'use server'

import { revalidatePath } from 'next/cache'

import { assertFinancialPeriodEditable } from '@/lib/services/financial-periods'
import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  approvePayrollCycleSchema,
  createPayrollCycleSchema,
  payPayrollCycleSchema,
  payrollItemSchema,
  type ApprovePayrollCycleInput,
  type CreatePayrollCycleInput,
  type PayPayrollCycleInput,
  type PayrollItemInput
} from '@/lib/validators/payroll.schema'

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

async function recalculatePayrollCycle(admin: ReturnType<typeof createAdminClient>, organizationId: string, payrollCycleId: string) {
  const { data: items, error } = await admin
    .from('payroll_items')
    .select('gross_amount, tax_amount, net_amount, payment_status')
    .eq('organization_id', organizationId)
    .eq('payroll_cycle_id', payrollCycleId)

  if (error) throw new Error(error.message)

  const totalGross = (items ?? []).reduce((sum, item) => sum + Number(item.gross_amount), 0)
  const taxWithholding = (items ?? []).reduce((sum, item) => sum + Number(item.tax_amount), 0)
  const totalNet = (items ?? []).reduce((sum, item) => sum + Number(item.net_amount), 0)
  const paidCount = (items ?? []).filter((item) => item.payment_status === 'paid').length
  const status = paidCount > 0 && paidCount < (items ?? []).length ? 'partial_paid' : paidCount === (items ?? []).length && paidCount > 0 ? 'paid' : undefined

  const update: Record<string, number | string> = {
    total_gross_pay: totalGross,
    total_net_pay: totalNet,
    tax_withholding: taxWithholding
  }

  if (status) update.status = status

  const { error: updateError } = await admin
    .from('payroll_cycles')
    .update(update)
    .eq('organization_id', organizationId)
    .eq('id', payrollCycleId)

  if (updateError) throw new Error(updateError.message)
}

async function getCurrentCash(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    admin.from('business_accounts').select('opening_balance').eq('organization_id', organizationId).eq('status', 'active'),
    admin.from('cashflow_transactions').select('direction, amount').eq('organization_id', organizationId)
  ])

  const openingCash = (accounts ?? []).reduce((sum, account) => sum + Number(account.opening_balance), 0)
  const moneyIn = (transactions ?? []).filter((item) => item.direction === 'money_in').reduce((sum, item) => sum + Number(item.amount), 0)
  const moneyOut = (transactions ?? []).filter((item) => item.direction === 'money_out').reduce((sum, item) => sum + Number(item.amount), 0)
  return openingCash + moneyIn - moneyOut
}

export async function createPayrollCycle(input: CreatePayrollCycleInput) {
  const parsed = createPayrollCycleSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('payroll_cycles')
    .insert({
      organization_id: parsed.organizationId,
      period_month: parsed.periodMonth,
      payroll_due_date: parsed.payrollDueDate,
      status: 'planned'
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'payroll_cycle',
    entity_id: data.id,
    action: 'created',
    new_data: parsed
  })

  return { payrollCycleId: data.id }
}

export async function addPayrollItem(input: PayrollItemInput) {
  const parsed = payrollItemSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()
  const netAmount = Math.max(parsed.grossAmount - parsed.taxAmount, 0)

  const { data: cycle } = await admin
    .from('payroll_cycles')
    .select('id')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.payrollCycleId)
    .single()

  if (!cycle) throw new Error('Payroll cycle not found')

  const { data, error } = await admin
    .from('payroll_items')
    .insert({
      organization_id: parsed.organizationId,
      payroll_cycle_id: parsed.payrollCycleId,
      user_id: parsed.userId,
      payee_name: parsed.payeeName,
      payee_type: parsed.payeeType,
      gross_amount: parsed.grossAmount,
      tax_amount: parsed.taxAmount,
      net_amount: netAmount,
      payment_status: 'unpaid'
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  await recalculatePayrollCycle(admin, parsed.organizationId, parsed.payrollCycleId)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'payroll_item',
    entity_id: data.id,
    action: 'created',
    new_data: parsed
  })
}

export async function approvePayrollCycle(input: ApprovePayrollCycleInput) {
  const parsed = approvePayrollCycleSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  const { error } = await admin
    .from('payroll_cycles')
    .update({
      status: 'approved',
      approved_by: member.user_id,
      approved_at: new Date().toISOString()
    })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.payrollCycleId)

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'payroll_cycle',
    entity_id: parsed.payrollCycleId,
    action: 'approved'
  })
}

export async function payPayrollCycle(input: PayPayrollCycleInput) {
  const parsed = payPayrollCycleSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  const [{ data: cycle }, { data: items }, { data: settings }] = await Promise.all([
    admin
      .from('payroll_cycles')
      .select('id, status, total_net_pay')
      .eq('organization_id', parsed.organizationId)
      .eq('id', parsed.payrollCycleId)
      .single(),
    admin
      .from('payroll_items')
      .select('id, payee_name, payee_type, net_amount, payment_status')
      .eq('organization_id', parsed.organizationId)
      .eq('payroll_cycle_id', parsed.payrollCycleId)
      .neq('payment_status', 'paid'),
    admin
      .from('finance_control_settings')
      .select('minimum_cash_reserve')
      .eq('organization_id', parsed.organizationId)
      .single()
  ])

  if (!cycle) throw new Error('Payroll cycle not found')
  if (!['approved', 'partial_paid'].includes(cycle.status)) throw new Error('Payroll must be approved before payment')
  await assertFinancialPeriodEditable(admin, parsed.organizationId, parsed.paidDate)

  const currentCash = await getCurrentCash(admin, parsed.organizationId)
  const payrollDue = (items ?? []).reduce((sum, item) => sum + Number(item.net_amount), 0)
  const projectedCashAfterPayroll = currentCash - payrollDue
  const minimumReserve = Number(settings?.minimum_cash_reserve ?? 0)

  if (projectedCashAfterPayroll < minimumReserve && member.role !== 'admin') {
    throw new Error('Payroll payment would break minimum cash reserve and requires admin')
  }

  for (const item of items ?? []) {
    const { data: cashflow, error: cashflowError } = await admin
      .from('cashflow_transactions')
      .insert({
        organization_id: parsed.organizationId,
        transaction_date: parsed.paidDate,
        direction: 'money_out',
        category: item.payee_type === 'freelancer' || item.payee_type === 'contractor' ? 'freelancer_payment' : 'payroll',
        amount: Number(item.net_amount),
        business_account_id: parsed.businessAccountId,
        payee_name: item.payee_name,
        payment_method: parsed.paymentMethod,
        notes: 'Payroll payment',
        created_by: member.user_id
      })
      .select('id')
      .single()

    if (cashflowError) throw new Error(cashflowError.message)

    await admin
      .from('payroll_items')
      .update({
        payment_status: 'paid',
        paid_date: parsed.paidDate,
        cashflow_transaction_id: cashflow.id
      })
      .eq('organization_id', parsed.organizationId)
      .eq('id', item.id)
  }

  await admin
    .from('payroll_cycles')
    .update({ status: 'paid', paid_at: new Date(`${parsed.paidDate}T00:00:00.000Z`).toISOString() })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.payrollCycleId)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'payroll_cycle',
    entity_id: parsed.payrollCycleId,
    action: 'paid',
    new_data: {
      payroll_due: payrollDue,
      projected_cash_after_payroll: projectedCashAfterPayroll
    }
  })
}

export async function createPayrollCycleFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await createPayrollCycle({
    organizationId,
    periodMonth: String(formData.get('periodMonth') ?? ''),
    payrollDueDate: String(formData.get('payrollDueDate') ?? '')
  })
  revalidatePath(`/org/${orgSlug}/finance/payroll`)
}

export async function addPayrollItemFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await addPayrollItem({
    organizationId,
    payrollCycleId: String(formData.get('payrollCycleId') ?? ''),
    userId: readOptionalString(formData, 'userId'),
    payeeName: readOptionalString(formData, 'payeeName'),
    payeeType: String(formData.get('payeeType') ?? 'employee') as PayrollItemInput['payeeType'],
    grossAmount: Number(formData.get('grossAmount') ?? 0),
    taxAmount: Number(formData.get('taxAmount') ?? 0)
  })
  revalidatePath(`/org/${orgSlug}/finance/payroll`)
}

export async function approvePayrollCycleFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await approvePayrollCycle({
    organizationId,
    payrollCycleId: String(formData.get('payrollCycleId') ?? '')
  })
  revalidatePath(`/org/${orgSlug}/finance/payroll`)
}

export async function payPayrollCycleFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await payPayrollCycle({
    organizationId,
    payrollCycleId: String(formData.get('payrollCycleId') ?? ''),
    paidDate: String(formData.get('paidDate') ?? ''),
    businessAccountId: readOptionalString(formData, 'businessAccountId'),
    paymentMethod: readOptionalString(formData, 'paymentMethod')
  })
  revalidatePath(`/org/${orgSlug}/finance/payroll`)
  revalidatePath(`/org/${orgSlug}/finance/cashflow`)
  revalidatePath(`/org/${orgSlug}/finance/dashboard`)
}
