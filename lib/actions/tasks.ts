'use server'

import { revalidatePath } from 'next/cache'

import { requireWorkspaceAccess } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  assignTaskSchema,
  createTaskSchema,
  markTaskBlockedSchema,
  updateTaskDueDateSchema,
  updateTaskStatusSchema,
  type AssignTaskInput,
  type CreateTaskInput,
  type MarkTaskBlockedInput,
  type UpdateTaskDueDateInput,
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

async function assertClientBelongsToOrg(admin: ReturnType<typeof createAdminClient>, organizationId: string, clientId?: string) {
  if (!clientId) return

  const { data } = await admin.from('clients').select('id').eq('organization_id', organizationId).eq('id', clientId).maybeSingle()
  if (!data) {
    throw new Error('Client does not belong to this organization')
  }
}

async function assertContentBelongsToOrg(admin: ReturnType<typeof createAdminClient>, organizationId: string, contentItemId?: string) {
  if (!contentItemId) return

  const { data } = await admin.from('content_items').select('id').eq('organization_id', organizationId).eq('id', contentItemId).maybeSingle()
  if (!data) {
    throw new Error('Content item does not belong to this organization')
  }
}

async function assertTaskBelongsToOrg(admin: ReturnType<typeof createAdminClient>, organizationId: string, taskId?: string) {
  if (!taskId) return

  const { data } = await admin.from('tasks').select('id').eq('organization_id', organizationId).eq('id', taskId).maybeSingle()
  if (!data) {
    throw new Error('Dependency task does not belong to this organization')
  }
}

async function syncContentStatusFromTask(
  admin: ReturnType<typeof createAdminClient>,
  task: { content_item_id: string | null; task_type: string | null; required_role: string | null },
  nextStatus: string
) {
  if (!task.content_item_id) return

  let contentStatus: string | null = null

  if (task.task_type === 'design' || task.required_role === 'designer') {
    if (nextStatus === 'in_progress') contentStatus = 'design_in_progress'
    if (nextStatus === 'completed') contentStatus = 'design_done'
  }

  if (task.task_type === 'editing' || task.required_role === 'editor') {
    if (nextStatus === 'in_progress') contentStatus = 'editing_in_progress'
    if (nextStatus === 'completed') contentStatus = 'editing_done'
  }

  if (task.task_type === 'marketing_review' && nextStatus === 'completed') {
    contentStatus = 'approved'
  }

  if (task.task_type === 'channel_scheduling' && nextStatus === 'completed') {
    contentStatus = 'ready_to_publish'
  }

  if (!contentStatus) return

  await admin.from('content_items').update({ status: contentStatus }).eq('id', task.content_item_id)
}

export async function createTask(input: CreateTaskInput) {
  const parsed = createTaskSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()
  await assertClientBelongsToOrg(admin, parsed.organizationId, parsed.clientId)
  await assertContentBelongsToOrg(admin, parsed.organizationId, parsed.contentItemId)
  await assertTaskBelongsToOrg(admin, parsed.organizationId, parsed.dependencyTaskId)

  const { data: task, error } = await admin
    .from('tasks')
    .insert({
      organization_id: parsed.organizationId,
      client_id: parsed.clientId,
      content_item_id: parsed.contentItemId,
      title: parsed.title,
      description: parsed.description,
      owner_id: parsed.ownerId,
      reviewer_id: parsed.reviewerId,
      priority: parsed.priority,
      status: parsed.ownerId ? 'assigned' : 'backlog',
      due_date: parsed.dueDate,
      task_type: parsed.taskType,
      required_role: parsed.requiredRole,
      dependency_task_id: parsed.dependencyTaskId,
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
    .select('id, status, owner_id, reviewer_id, content_item_id, task_type, required_role, dependency_task_id, dependency:tasks!tasks_dependency_task_id_fkey(status)')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.taskId)
    .single()

  if (error || !task) {
    throw new Error('Task not found')
  }

  if (!transitions[task.status]?.includes(parsed.nextStatus)) {
    throw new Error(`Invalid task status transition from ${task.status} to ${parsed.nextStatus}`)
  }

  const dependency = Array.isArray(task.dependency) ? task.dependency[0] : task.dependency
  if (parsed.nextStatus === 'in_progress' && task.dependency_task_id && dependency?.status !== 'completed') {
    throw new Error('Dependency task must be completed before this task can start')
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

  await syncContentStatusFromTask(admin, task, parsed.nextStatus)

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

export async function assignTask(input: AssignTaskInput) {
  const parsed = assignTaskSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  const { data: task, error } = await admin
    .from('tasks')
    .select('id, owner_id, reviewer_id, status')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.taskId)
    .single()

  if (error || !task) {
    throw new Error('Task not found')
  }

  if (task.status === 'archived' && member.role !== 'admin') {
    throw new Error('Archived tasks can only be changed by admin')
  }

  const { error: updateError } = await admin
    .from('tasks')
    .update({
      owner_id: parsed.ownerId ?? null,
      reviewer_id: parsed.reviewerId ?? null,
      status: parsed.ownerId && task.status === 'backlog' ? 'assigned' : task.status
    })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.taskId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  if (parsed.ownerId) {
    await admin.from('notifications').insert({
      organization_id: parsed.organizationId,
      user_id: parsed.ownerId,
      type: 'task_assigned',
      title: 'Task assigned',
      message: 'A task has been assigned to you',
      link_url: `/tasks/${parsed.taskId}`
    })
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'task',
    entity_id: parsed.taskId,
    action: 'assigned',
    old_data: { owner_id: task.owner_id, reviewer_id: task.reviewer_id },
    new_data: { owner_id: parsed.ownerId, reviewer_id: parsed.reviewerId }
  })
}

export async function updateTaskDueDate(input: UpdateTaskDueDateInput) {
  const parsed = updateTaskDueDateSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  const { data: task, error } = await admin
    .from('tasks')
    .select('id, due_date, status')
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.taskId)
    .single()

  if (error || !task) throw new Error('Task not found')
  if (task.status === 'archived' && member.role !== 'admin') throw new Error('Archived tasks can only be changed by admin')

  const { error: updateError } = await admin
    .from('tasks')
    .update({ due_date: parsed.dueDate ?? null })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.taskId)

  if (updateError) throw new Error(updateError.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'task',
    entity_id: parsed.taskId,
    action: 'due_date_updated',
    old_data: { due_date: task.due_date },
    new_data: { due_date: parsed.dueDate }
  })
}

export async function markTaskBlocked(input: MarkTaskBlockedInput) {
  const parsed = markTaskBlockedSchema.parse(input)
  const member = await requireWorkspaceAccess(parsed.organizationId, 'operation')
  const admin = createAdminClient()

  const { error } = await admin
    .from('tasks')
    .update({ status: 'blocked', production_risk: 'blocked' })
    .eq('organization_id', parsed.organizationId)
    .eq('id', parsed.taskId)

  if (error) throw new Error(error.message)

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'task',
    entity_id: parsed.taskId,
    action: 'blocked',
    new_data: { reason: parsed.reason }
  })
}

export async function createTaskFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await createTask({
    organizationId,
    clientId: readOptionalString(formData, 'clientId'),
    contentItemId: readOptionalString(formData, 'contentItemId'),
    title: String(formData.get('title') ?? ''),
    description: readOptionalString(formData, 'description'),
    ownerId: readOptionalString(formData, 'ownerId'),
    reviewerId: readOptionalString(formData, 'reviewerId'),
    priority: String(formData.get('priority') ?? 'normal') as CreateTaskInput['priority'],
    dueDate: readOptionalString(formData, 'dueDate'),
    taskType: readOptionalString(formData, 'taskType'),
    requiredRole: readOptionalString(formData, 'requiredRole') as CreateTaskInput['requiredRole'],
    dependencyTaskId: readOptionalString(formData, 'dependencyTaskId')
  })

  revalidatePath(`/org/${orgSlug}/operation/tasks`)
}

export async function assignTaskFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await assignTask({
    organizationId,
    taskId: String(formData.get('taskId') ?? ''),
    ownerId: readOptionalString(formData, 'ownerId'),
    reviewerId: readOptionalString(formData, 'reviewerId')
  })

  revalidatePath(`/org/${orgSlug}/operation/tasks`)
}

export async function updateTaskDueDateFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateTaskDueDate({
    organizationId,
    taskId: String(formData.get('taskId') ?? ''),
    dueDate: readOptionalString(formData, 'dueDate')
  })

  revalidatePath(`/org/${orgSlug}/operation/tasks`)
}

export async function markTaskBlockedFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await markTaskBlocked({
    organizationId,
    taskId: String(formData.get('taskId') ?? ''),
    reason: readOptionalString(formData, 'reason')
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
