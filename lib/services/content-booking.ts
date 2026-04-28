import type { ScheduleContentInput } from '@/lib/validators/content.schema'

type ProductionTask = {
  title: string
  task_type: string
  required_role: string
  due_date: string | null
  production_risk: 'normal' | 'watch' | 'high'
}

function minusDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() - days)
  return value.toISOString().slice(0, 10)
}

export function calculateProductionTaskDueDate(publishDate: string, taskType?: string | null, requiredRole?: string | null) {
  if (taskType === 'design' || requiredRole === 'designer') return minusDays(publishDate, 4)
  if (taskType === 'editing' || requiredRole === 'editor') return minusDays(publishDate, 3)
  if (taskType === 'marketing_review') return minusDays(publishDate, 2)
  if (taskType === 'channel_scheduling' || taskType === 'publishing' || requiredRole === 'channel_manager') {
    return minusDays(publishDate, 1)
  }

  return publishDate
}

export function calculateProductionRisk(input: Pick<ScheduleContentInput, 'publishDate' | 'requiresDesign' | 'requiresEditing'>) {
  if (!input.publishDate) {
    return 'normal'
  }

  const publishDate = new Date(`${input.publishDate}T00:00:00.000Z`)
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const daysUntilPublish = Math.ceil((publishDate.getTime() - todayUtc.getTime()) / 86_400_000)
  const needsProduction = input.requiresDesign || input.requiresEditing

  if (needsProduction && daysUntilPublish <= 1) {
    return 'high'
  }

  if (needsProduction && daysUntilPublish <= 3) {
    return 'watch'
  }

  return 'normal'
}

export function buildProductionTasks(input: ScheduleContentInput): ProductionTask[] {
  if (!input.publishDate) {
    return []
  }

  const productionRisk = calculateProductionRisk(input)
  const tasks: ProductionTask[] = []

  if (input.requiresDesign) {
    tasks.push({
      title: `Design assets for ${input.title}`,
      task_type: 'design',
      required_role: 'designer',
      due_date: calculateProductionTaskDueDate(input.publishDate, 'design', 'designer'),
      production_risk: productionRisk
    })
  }

  if (input.requiresEditing) {
    tasks.push({
      title: `Edit copy/script for ${input.title}`,
      task_type: 'editing',
      required_role: 'editor',
      due_date: calculateProductionTaskDueDate(input.publishDate, 'editing', 'editor'),
      production_risk: productionRisk
    })
  }

  if (input.requiresChannelManager) {
    tasks.push({
      title: `Schedule/publish ${input.title}`,
      task_type: 'channel_scheduling',
      required_role: 'channel_manager',
      due_date: calculateProductionTaskDueDate(input.publishDate, 'channel_scheduling', 'channel_manager'),
      production_risk: productionRisk
    })
  }

  return tasks
}
