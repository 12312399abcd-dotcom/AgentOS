import { z } from 'zod'

export const createTaskSchema = z.object({
  organizationId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  contentItemId: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  ownerId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueDate: z.string().date().optional(),
  taskType: z.string().trim().optional(),
  requiredRole: z.enum(['designer', 'editor', 'marketing', 'channel_manager', 'viewer']).optional(),
  dependencyTaskId: z.string().uuid().optional()
})

export const updateTaskStatusSchema = z.object({
  organizationId: z.string().uuid(),
  taskId: z.string().uuid(),
  nextStatus: z.enum(['backlog', 'assigned', 'in_progress', 'review', 'approved', 'completed', 'blocked', 'archived'])
})

export const assignTaskSchema = z.object({
  organizationId: z.string().uuid(),
  taskId: z.string().uuid(),
  ownerId: z.string().uuid().optional(),
  reviewerId: z.string().uuid().optional()
})

export const updateTaskDueDateSchema = z.object({
  organizationId: z.string().uuid(),
  taskId: z.string().uuid(),
  dueDate: z.string().date().optional()
})

export const markTaskBlockedSchema = z.object({
  organizationId: z.string().uuid(),
  taskId: z.string().uuid(),
  reason: z.string().trim().optional()
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>
export type AssignTaskInput = z.infer<typeof assignTaskSchema>
export type UpdateTaskDueDateInput = z.infer<typeof updateTaskDueDateSchema>
export type MarkTaskBlockedInput = z.infer<typeof markTaskBlockedSchema>
