'use server'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { cashflowTransactionSchema, type CashflowTransactionInput } from '@/lib/validators/finance.schema'

export async function addCashflowTransaction(input: CashflowTransactionInput) {
  const parsed = cashflowTransactionSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

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
