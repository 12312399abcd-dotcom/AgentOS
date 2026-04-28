import { z } from 'zod'

export const createForecastBudgetSchema = z.object({
  organizationId: z.string().uuid(),
  forecastMonth: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  openingCash: z.coerce.number().default(0),
  expectedTaxReserve: z.coerce.number().nonnegative().default(0)
})

export const forecastBudgetItemSchema = z.object({
  organizationId: z.string().uuid(),
  forecastBudgetId: z.string().uuid(),
  itemType: z.enum(['money_in', 'money_out', 'tax_reserve', 'asset_purchase', 'liability_payment', 'owner_equity']),
  category: z.string().trim().min(1),
  description: z.string().trim().optional(),
  clientId: z.string().uuid().optional(),
  expectedDate: z.string().date().optional(),
  expectedAmount: z.coerce.number().nonnegative()
})

export const updateForecastStatusSchema = z.object({
  organizationId: z.string().uuid(),
  forecastBudgetId: z.string().uuid(),
  status: z.enum(['draft', 'submitted', 'approved', 'active', 'closed'])
})

export const createFinancialPeriodSchema = z.object({
  organizationId: z.string().uuid(),
  periodMonth: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  forecastBudgetId: z.string().uuid().optional(),
  openingCash: z.coerce.number().default(0)
})

export const closeFinancialPeriodSchema = z.object({
  organizationId: z.string().uuid(),
  periodMonth: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  reviewNotes: z.string().trim().optional(),
  adminOverrideNote: z.string().trim().optional()
})

export type CreateForecastBudgetInput = z.infer<typeof createForecastBudgetSchema>
export type ForecastBudgetItemInput = z.infer<typeof forecastBudgetItemSchema>
export type UpdateForecastStatusInput = z.infer<typeof updateForecastStatusSchema>
export type CreateFinancialPeriodInput = z.infer<typeof createFinancialPeriodSchema>
export type CloseFinancialPeriodInput = z.infer<typeof closeFinancialPeriodSchema>
