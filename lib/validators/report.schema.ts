import { z } from 'zod'

export const generateReportSchema = z.object({
  organizationId: z.string().uuid(),
  clientId: z.string().uuid(),
  reportPeriod: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  notes: z.string().trim().optional()
})

export const approveReportSchema = z.object({
  organizationId: z.string().uuid(),
  reportId: z.string().uuid()
})

export type GenerateReportInput = z.infer<typeof generateReportSchema>
export type ApproveReportInput = z.infer<typeof approveReportSchema>
