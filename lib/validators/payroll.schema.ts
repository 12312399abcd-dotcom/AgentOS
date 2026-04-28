import { z } from 'zod'

export const createPayrollCycleSchema = z.object({
  organizationId: z.string().uuid(),
  periodMonth: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  payrollDueDate: z.string().date()
})

export const payrollItemSchema = z.object({
  organizationId: z.string().uuid(),
  payrollCycleId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  payeeName: z.string().trim().optional(),
  payeeType: z.enum(['employee', 'contractor', 'freelancer', 'owner_salary']).default('employee'),
  grossAmount: z.coerce.number().nonnegative(),
  taxAmount: z.coerce.number().nonnegative().default(0)
})

export const approvePayrollCycleSchema = z.object({
  organizationId: z.string().uuid(),
  payrollCycleId: z.string().uuid()
})

export const payPayrollCycleSchema = z.object({
  organizationId: z.string().uuid(),
  payrollCycleId: z.string().uuid(),
  paidDate: z.string().date(),
  businessAccountId: z.string().uuid().optional(),
  paymentMethod: z.string().trim().optional()
})

export type CreatePayrollCycleInput = z.infer<typeof createPayrollCycleSchema>
export type PayrollItemInput = z.infer<typeof payrollItemSchema>
export type ApprovePayrollCycleInput = z.infer<typeof approvePayrollCycleSchema>
export type PayPayrollCycleInput = z.infer<typeof payPayrollCycleSchema>
