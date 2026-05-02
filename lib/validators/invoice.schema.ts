import { z } from 'zod'

export const invoiceItemInputSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative()
})

export const createInvoiceSchema = z.object({
  organizationId: z.string().uuid(),
  clientId: z.string().uuid(),
  servicePeriodStart: z.string().date().optional(),
  servicePeriodEnd: z.string().date().optional(),
  taxRate: z.coerce.number().nonnegative().default(0),
  dueDate: z.string().date().optional(),
  items: z.array(invoiceItemInputSchema).min(1)
})

export const updateInvoiceStatusSchema = z.object({
  organizationId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  status: z.enum(['draft', 'sent', 'partial_paid', 'overdue', 'cancelled'])
})

export const markInvoicePaidSchema = z.object({
  organizationId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  paidDate: z.string().date(),
  businessAccountId: z.string().uuid().optional(),
  paymentMethod: z.string().trim().optional()
})

export const invoiceTemplateSchema = z.object({
  organizationId: z.string().uuid(),
  companyName: z.string().trim().min(1),
  companyAddress: z.string().trim().optional(),
  companyEmail: z.string().trim().email().optional().or(z.literal('')),
  companyPhone: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  paymentInstructions: z.string().trim().optional(),
  defaultNotes: z.string().trim().optional(),
  logoDataUrl: z.string().trim().max(20480, 'Logo must be under 20KB').optional()
})

export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>
export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidSchema>
export type InvoiceTemplateInput = z.infer<typeof invoiceTemplateSchema>
