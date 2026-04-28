'use server'

import { revalidatePath } from 'next/cache'

import { assertFinancialPeriodEditable } from '@/lib/services/financial-periods'
import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createSimplePdf } from '@/lib/services/pdf'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createInvoiceSchema,
  markInvoicePaidSchema,
  updateInvoiceStatusSchema,
  type CreateInvoiceInput,
  type InvoiceItemInput,
  type MarkInvoicePaidInput,
  type UpdateInvoiceStatusInput
} from '@/lib/validators/invoice.schema'

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function collectInvoiceItems(formData: FormData): InvoiceItemInput[] {
  return [0, 1, 2]
    .map((index) => ({
      description: readOptionalString(formData, `itemDescription${index}`) ?? '',
      quantity: Number(formData.get(`itemQuantity${index}`) ?? 0),
      unitPrice: Number(formData.get(`itemUnitPrice${index}`) ?? 0)
    }))
    .filter((item) => item.description && item.quantity > 0)
}

async function nextInvoiceNumber(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  const { count } = await admin
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  return `INV-${String((count ?? 0) + 1).padStart(5, '0')}`
}

export async function createInvoice(input: CreateInvoiceInput) {
  const parsed = createInvoiceSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  const { data: client } = await admin.from('clients').select('id').eq('organization_id', parsed.organizationId).eq('id', parsed.clientId).maybeSingle()
  if (!client) throw new Error('Client does not belong to this organization')

  const invoiceNumber = await nextInvoiceNumber(admin, parsed.organizationId)
  const lineItems = parsed.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.quantity * item.unitPrice
  }))
  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0)
  const taxAmount = subtotal * (parsed.taxRate / 100)
  const totalAmount = subtotal + taxAmount

  const { data: invoice, error } = await admin
    .from('invoices')
    .insert({
      organization_id: parsed.organizationId,
      client_id: parsed.clientId,
      invoice_number: invoiceNumber,
      service_period_start: parsed.servicePeriodStart,
      service_period_end: parsed.servicePeriodEnd,
      subtotal,
      tax_rate: parsed.taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'draft',
      due_date: parsed.dueDate,
      created_by: member.user_id
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const { error: itemError } = await admin.from('invoice_items').insert(
    lineItems.map((item) => ({
      organization_id: parsed.organizationId,
      invoice_id: invoice.id,
      ...item
    }))
  )

  if (itemError) throw new Error(itemError.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'invoice',
    entity_id: invoice.id,
    action: 'created',
    new_data: { ...parsed, invoice_number: invoiceNumber, subtotal, tax_amount: taxAmount, total_amount: totalAmount }
  })

  return { invoiceId: invoice.id }
}

export async function updateInvoiceStatus(input: UpdateInvoiceStatusInput) {
  const parsed = updateInvoiceStatusSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()
  const updates: Record<string, string | null> = { status: parsed.status }
  if (parsed.status === 'sent') updates.sent_at = new Date().toISOString()

  const { error } = await admin
    .from('invoices')
    .update(updates)
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.invoiceId)

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'invoice',
    entity_id: parsed.invoiceId,
    action: 'status_updated',
    new_data: { status: parsed.status }
  })
}

export async function markInvoicePaid(input: MarkInvoicePaidInput) {
  const parsed = markInvoicePaidSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'finance')
  const admin = createAdminClient()

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, client_id, invoice_number, total_amount, status')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.invoiceId)
    .single()

  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'cancelled') throw new Error('Cancelled invoices cannot be paid')
  await assertFinancialPeriodEditable(admin, parsed.organizationId, parsed.paidDate)

  const { error: updateError } = await admin
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date(`${parsed.paidDate}T00:00:00.000Z`).toISOString()
    })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.invoiceId)

  if (updateError) throw new Error(updateError.message)

  const { data: cashflow, error: cashflowError } = await admin
    .from('cashflow_transactions')
    .insert({
      organization_id: parsed.organizationId,
      transaction_date: parsed.paidDate,
      direction: 'money_in',
      category: 'client_retainer',
      amount: Number(invoice.total_amount),
      business_account_id: parsed.businessAccountId,
      client_id: invoice.client_id,
      invoice_id: invoice.id,
      payment_method: parsed.paymentMethod,
      notes: `Invoice ${invoice.invoice_number} paid`,
      created_by: member.user_id
    })
    .select('id')
    .single()

  if (cashflowError) throw new Error(cashflowError.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'invoice',
    entity_id: invoice.id,
    action: 'paid',
    new_data: { paid_date: parsed.paidDate, cashflow_transaction_id: cashflow.id }
  })
}

export async function exportInvoicePdf(organizationId: string, invoiceId: string) {
  const member = await requireWorkspaceAccess(organizationId, 'finance')
  const admin = createAdminClient()
  const { data: invoice } = await admin
    .from('invoices')
    .select('id, invoice_number, service_period_start, service_period_end, subtotal, tax_rate, tax_amount, total_amount, status, due_date, clients(name, contact_email), invoice_items(description, quantity, unit_price, line_total)')
    .eq('organization_id', organizationId)
    .eq('id', invoiceId)
    .single()

  if (!invoice) throw new Error('Invoice not found')

  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
  const lines = [
    `Invoice ${invoice.invoice_number}`,
    `Client: ${client?.name ?? 'Client'}`,
    `Email: ${client?.contact_email ?? ''}`,
    `Status: ${invoice.status}`,
    `Due date: ${invoice.due_date ?? ''}`,
    `Service period: ${invoice.service_period_start ?? ''} to ${invoice.service_period_end ?? ''}`,
    '',
    'Items:',
    ...(invoice.invoice_items ?? []).map((item) => `${item.description} | ${item.quantity} x ${item.unit_price} = ${item.line_total}`),
    '',
    `Subtotal: ${invoice.subtotal}`,
    `Tax rate: ${invoice.tax_rate}%`,
    `Tax amount: ${invoice.tax_amount}`,
    `Total: ${invoice.total_amount}`
  ]
  const pdf = createSimplePdf(lines)
  const path = `${organizationId}/invoices/${invoice.id}.pdf`
  const { error: uploadError } = await admin.storage.from('invoices').upload(path, pdf, {
    contentType: 'application/pdf',
    upsert: true
  })

  if (uploadError) throw new Error(uploadError.message)

  const fileUrl = `storage://invoices/${path}`
  const { error: updateError } = await admin
    .from('invoices')
    .update({ file_url: fileUrl })
    .eq('organization_id', organizationId)
    .eq('id', invoiceId)

  if (updateError) throw new Error(updateError.message)

  await admin.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: member.user_id,
    entity_type: 'invoice',
    entity_id: invoiceId,
    action: 'pdf_exported',
    new_data: { bucket: 'invoices', path }
  })
}

export async function createInvoiceFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await createInvoice({
    organizationId,
    clientId: String(formData.get('clientId') ?? ''),
    servicePeriodStart: readOptionalString(formData, 'servicePeriodStart'),
    servicePeriodEnd: readOptionalString(formData, 'servicePeriodEnd'),
    taxRate: Number(formData.get('taxRate') ?? 0),
    dueDate: readOptionalString(formData, 'dueDate'),
    items: collectInvoiceItems(formData)
  })
  revalidatePath(`/org/${orgSlug}/finance/invoices`)
}

export async function updateInvoiceStatusFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateInvoiceStatus({
    organizationId,
    invoiceId: String(formData.get('invoiceId') ?? ''),
    status: String(formData.get('status') ?? 'draft') as UpdateInvoiceStatusInput['status']
  })
  revalidatePath(`/org/${orgSlug}/finance/invoices`)
}

export async function markInvoicePaidFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await markInvoicePaid({
    organizationId,
    invoiceId: String(formData.get('invoiceId') ?? ''),
    paidDate: String(formData.get('paidDate') ?? ''),
    businessAccountId: readOptionalString(formData, 'businessAccountId'),
    paymentMethod: readOptionalString(formData, 'paymentMethod')
  })
  revalidatePath(`/org/${orgSlug}/finance/invoices`)
  revalidatePath(`/org/${orgSlug}/finance/cashflow`)
  revalidatePath(`/org/${orgSlug}/finance/dashboard`)
}

export async function exportInvoicePdfFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await exportInvoicePdf(organizationId, String(formData.get('invoiceId') ?? ''))
  revalidatePath(`/org/${orgSlug}/finance/invoices`)
}
