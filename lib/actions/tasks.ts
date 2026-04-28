'use server'

import { revalidatePath } from 'next/cache'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createTaskSchema,
  updateTaskStatusSchema,
  type CreateTaskInput,
  type UpdateTaskStatusInput
} from '@/lib/validators/task.schema'

const transitions: Record<string, string[]> = {
  backlog: ['assigned', 'blocked', 'archived'],
  assigned: ['in_progress', 'blocked', 'archived'],
  in_progress: ['review', 'blocked', 'archived'],
  review: ['approved', 'in_progress', 'blocked'],
  approved: ['completed', 'in_progress'],
  completed: ['archived'],
  blocked: ['assigned', 'in_progress', 'archived'],
  archived: []
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export async function createTask(input: CreateTaskInput) {
  const parsed = createTaskSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  const { data: task, error } = await admin
    .from('tasks')
    .insert({
      organization_id: parsed.organizationId,
      client_id: parsed.clientId,
      title: parsed.title,
      description: parsed.description,
      owner_id: parsed.ownerId,
      reviewer_id: parsed.reviewerId,
      priority: parsed.priority,
      status: parsed.ownerId ? 'assigned' : 'backlog',
      due_date: parsed.dueDate,
      task_type: parsed.taskType,
      required_role: parsed.requiredRole,
      created_by: member.user_id
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (parsed.ownerId) {
    await admin.from('notifications').insert({
      organization_id: parsed.organizationId,
      user_id: parsed.ownerId,
      type: 'task_assigned',
      title: 'Task assigned',
      message: parsed.title,
      link_url: `/tasks/${task.id}`
    })
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'task',
    entity_id: task.id,
    action: 'created',
    new_data: parsed
  })

  return { taskId: task.id }
}

export async function updateTaskStatus(input: UpdateTaskStatusInput) {
  const parsed = updateTaskStatusSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  const { data: task, error } = await admin
    .from('tasks')
    .select('id, status, owner_id, reviewer_id')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.taskId)
    .single()

  if (error || !task) {
    throw new Error('Task not found')
  }

  if (!transitions[task.status]?.includes(parsed.nextStatus)) {
    throw new Error(`Invalid task status transition from ${task.status} to ${parsed.nextStatus}`)
  }

  if (parsed.nextStatus === 'review' && task.owner_id && task.owner_id !== member.user_id && member.role !== 'admin') {
    throw new Error('Only the owner can submit this task for review')
  }

  if (parsed.nextStatus === 'approved' && task.reviewer_id && task.reviewer_id !== member.user_id && member.role !== 'admin') {
    throw new Error('Only the reviewer or admin can approve this task')
  }

  const { error: updateError } = await admin
    .from('tasks')
    .update({
      status: parsed.nextStatus,
      completed_at: parsed.nextStatus === 'completed' ? new Date().toISOString() : null
    })
    .eq('id', parsed.taskId)
    .eq('organization_id', parsed.organizationId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'task',
    entity_id: parsed.taskId,
    action: 'status_updated',
    old_data: { status: task.status },
    new_data: { status: parsed.nextStatus }
  })
}

export async function createTaskFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await createTask({
    organizationId,
    clientId: readOptionalString(formData, 'clientId'),
    title: String(formData.get('title') ?? ''),
    description: readOptionalString(formData, 'description'),
    ownerId: readOptionalString(formData, 'ownerId'),
    reviewerId: readOptionalString(formData, 'reviewerId'),
    priority: String(formData.get('priority') ?? 'normal') as CreateTaskInput['priority'],
    dueDate: readOptionalString(formData, 'dueDate'),
    taskType: readOptionalString(formData, 'taskType'),
    requiredRole: readOptionalString(formData, 'requiredRole') as CreateTaskInput['requiredRole']
  })

  revalidatePath(`/org/${orgSlug}/operation/tasks`)
}

export async function updateTaskStatusFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateTaskStatus({
    organizationId,
    taskId: String(formData.get('taskId') ?? ''),
    nextStatus: String(formData.get('nextStatus') ?? 'backlog') as UpdateTaskStatusInput['nextStatus']
  })

  revalidatePath(`/org/${orgSlug}/operation/tasks`)
}
