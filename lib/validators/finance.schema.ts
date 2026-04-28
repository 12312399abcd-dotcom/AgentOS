import { z } from 'zod'

export const businessAccountSchema = z.object({
  organizationId: z.string().uuid(),
  accountName: z.string().trim().min(1),
  accountType: z.enum(['cash', 'bank', 'wallet', 'credit_card', 'loan']).default('bank'),
  currency: z.string().trim().min(3).max(3).default('USD'),
  openingBalance: z.coerce.number().default(0),
  status: z.enum(['active', 'archived']).default('active')
})

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

export const businessExpenseSchema = z.object({
  organizationId: z.string().uuid(),
  expenseDate: z.string().date(),
  dueDate: z.string().date().optional(),
  paidDate: z.string().date().optional(),
  category: z.string().trim().min(1),
  vendorName: z.string().trim().optional(),
  description: z.string().trim().optional(),
  amount: z.coerce.number().nonnegative(),
  taxAmount: z.coerce.number().nonnegative().default(0),
  status: z.enum(['unpaid', 'scheduled', 'paid', 'overdue', 'cancelled']).default('unpaid'),
  clientId: z.string().uuid().optional(),
  businessAccountId: z.string().uuid().optional(),
  paymentMethod: z.string().trim().optional()
})

export const markBusinessExpensePaidSchema = z.object({
  organizationId: z.string().uuid(),
  expenseId: z.string().uuid(),
  paidDate: z.string().date(),
  businessAccountId: z.string().uuid().optional(),
  paymentMethod: z.string().trim().optional()
})

export const capitalTransactionSchema = z.object({
  organizationId: z.string().uuid(),
  transactionDate: z.string().date(),
  transactionType: z.enum(['owner_capital_injection', 'owner_draw', 'loan_received', 'loan_repayment', 'dividend_distribution']),
  amount: z.coerce.number().nonnegative(),
  counterparty: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  businessAccountId: z.string().uuid().optional(),
  paymentMethod: z.string().trim().optional(),
  adminOverrideNote: z.string().trim().optional()
})

export type BusinessAccountInput = z.infer<typeof businessAccountSchema>
export type CashflowTransactionInput = z.infer<typeof cashflowTransactionSchema>
export type BusinessExpenseInput = z.infer<typeof businessExpenseSchema>
export type MarkBusinessExpensePaidInput = z.infer<typeof markBusinessExpensePaidSchema>
export type CapitalTransactionInput = z.infer<typeof capitalTransactionSchema>
