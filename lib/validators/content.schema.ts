import { z } from 'zod'

export const scheduleContentSchema = z.object({
  organizationId: z.string().uuid(),
  clientId: z.string().uuid(),
  campaign: z.string().trim().optional(),
  title: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  contentType: z.string().trim().optional(),
  caption: z.string().trim().optional(),
  brief: z.string().trim().optional(),
  assetUrl: z.string().url().optional().or(z.literal('')),
  publishDate: z.string().date().optional(),
  ownerId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  requiresDesign: z.boolean().default(true),
  requiresEditing: z.boolean().default(true),
  requiresChannelManager: z.boolean().default(true),
  bookingSource: z.enum(['content_schedule', 'notion_sync']).default('content_schedule')
})

export type ScheduleContentInput = z.infer<typeof scheduleContentSchema>
