import { z } from 'zod'

export const publishContentSchema = z.object({
  organizationId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  publishedUrl: z.string().trim().url(),
  publishedAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/)
    .optional()
})

export const updateSocialMetricsSchema = z.object({
  organizationId: z.string().uuid(),
  socialPostId: z.string().uuid(),
  reach: z.coerce.number().int().nonnegative().default(0),
  impressions: z.coerce.number().int().nonnegative().default(0),
  likes: z.coerce.number().int().nonnegative().default(0),
  comments: z.coerce.number().int().nonnegative().default(0),
  shares: z.coerce.number().int().nonnegative().default(0),
  saves: z.coerce.number().int().nonnegative().default(0),
  clicks: z.coerce.number().int().nonnegative().default(0),
  leads: z.coerce.number().int().nonnegative().default(0),
  spend: z.coerce.number().nonnegative().default(0),
  reportPeriod: z.string().trim().optional()
})

export type PublishContentInput = z.infer<typeof publishContentSchema>
export type UpdateSocialMetricsInput = z.infer<typeof updateSocialMetricsSchema>
