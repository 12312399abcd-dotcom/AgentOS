import { z } from 'zod'

export const cashflowTransactionSchema = z.object({
  organizationId: z.string().uuid(),
  transactionDate: z.string().date(),
  direction: z.enum(['money_in', 'money_out']),
  category: z.string().trim().min(1),
  amount: z.number().nonnegative(),
  businessAccountId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  vendorName: z.string().trim().optional(),
  payeeName: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  notes: z.string().trim().optional()
})

export type CashflowTransactionInput = z.infer<typeof cashflowTransactionSchema>
