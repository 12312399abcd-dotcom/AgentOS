import { z } from 'zod'

import { normalizeSlug } from '@/lib/services/workspace'

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).transform(normalizeSlug),
  timezone: z.string().trim().min(1).default('Asia/Ho_Chi_Minh'),
  currency: z.string().trim().min(3).max(3).default('USD'),
  businessType: z.enum(['agency', 'studio', 'consultancy', 'other']).default('agency'),
  payrollCycle: z.enum(['beginning_of_month', 'middle_of_month', 'end_of_month']).default('beginning_of_month'),
  financialPeriod: z.enum(['monthly']).default('monthly')
})

export const inviteMemberSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(['finance_moderator', 'designer', 'editor', 'marketing', 'channel_manager', 'viewer'])
})

export const updateOrganizationSettingsSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).transform(normalizeSlug),
  timezone: z.string().trim().min(1),
  currency: z.string().trim().min(3).max(3)
})

export const updateFinanceControlSettingsSchema = z.object({
  organizationId: z.string().uuid(),
  payrollCycle: z.enum(['beginning_of_month', 'middle_of_month', 'end_of_month']),
  reserveMonths: z.coerce.number().nonnegative(),
  minimumCashReserve: z.coerce.number().nonnegative(),
  taxReserveRate: z.coerce.number().nonnegative(),
  expenseVarianceWarningPercent: z.coerce.number().nonnegative(),
  cashRiskWarningDays: z.coerce.number().int().nonnegative(),
  strictSpendingControl: z.boolean().default(false),
  ownerDrawRequiresReserveCheck: z.boolean().default(true)
})

export const updateMemberTimeLimitsSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  dailyTimeLimitMinutes: z.coerce.number().int().min(0),
  weeklyTimeLimitMinutes: z.coerce.number().int().min(0)
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>
export type UpdateFinanceControlSettingsInput = z.infer<typeof updateFinanceControlSettingsSchema>
export type UpdateMemberTimeLimitsInput = z.infer<typeof updateMemberTimeLimitsSchema>
