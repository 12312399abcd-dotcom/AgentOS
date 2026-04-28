import { createClient } from '@/lib/supabase/server'

export type ContentFilters = {
  clientId?: string
  platform?: string
  status?: string
  ownerId?: string
  reviewerId?: string
  requiredRole?: string
  publishFrom?: string
  publishTo?: string
  productionRisk?: string
  missingTask?: string
  notionSource?: string
  search?: string
}

export type ContentItemRow = {
  id: string
  title: string
  campaign: string | null
  platform: string
  content_type: string | null
  caption: string | null
  brief: string | null
  asset_url: string | null
  status: string
  publish_date: string | null
  published_url: string | null
  owner_id: string | null
  reviewer_id: string | null
  requires_design: boolean
  requires_editing: boolean
  requires_channel_manager: boolean
  notion_page_id: string | null
  notion_source_url: string | null
  production_risk: string
  clients: { name: string } | { name: string }[] | null
  tasks: { id: string; required_role: string | null; status: string }[] | null
}

export function parseContentFilters(searchParams: Record<string, string | string[] | undefined>): ContentFilters {
  const get = (key: keyof ContentFilters) => {
    const value = searchParams[key]
    if (Array.isArray(value)) {
      return value[0]
    }
    return value || undefined
  }

  return {
    clientId: get('clientId'),
    platform: get('platform'),
    status: get('status'),
    ownerId: get('ownerId'),
    reviewerId: get('reviewerId'),
    requiredRole: get('requiredRole'),
    publishFrom: get('publishFrom'),
    publishTo: get('publishTo'),
    productionRisk: get('productionRisk'),
    missingTask: get('missingTask'),
    notionSource: get('notionSource'),
    search: get('search')
  }
}

export function hasMissingProductionTask(item: ContentItemRow) {
  const tasks = Array.isArray(item.tasks) ? item.tasks : []
  const roles = new Set(tasks.map((task) => task.required_role))

  return (
    (item.requires_design && !roles.has('designer')) ||
    (item.requires_editing && !roles.has('editor')) ||
    (item.requires_channel_manager && !roles.has('channel_manager'))
  )
}

export async function getContentItems(organizationId: string, filters: ContentFilters = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('content_items')
    .select(
      'id, title, campaign, platform, content_type, caption, brief, asset_url, status, publish_date, published_url, owner_id, reviewer_id, requires_design, requires_editing, requires_channel_manager, notion_page_id, notion_source_url, production_risk, clients(name), tasks(id, required_role, status)'
    )
    .eq('organization_id', organizationId)
    .order('publish_date', { ascending: true, nullsFirst: false })
    .limit(200)

  if (filters.clientId) query = query.eq('client_id', filters.clientId)
  if (filters.platform) query = query.ilike('platform', `%${filters.platform}%`)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.ownerId) query = query.eq('owner_id', filters.ownerId)
  if (filters.reviewerId) query = query.eq('reviewer_id', filters.reviewerId)
  if (filters.publishFrom) query = query.gte('publish_date', filters.publishFrom)
  if (filters.publishTo) query = query.lte('publish_date', filters.publishTo)
  if (filters.productionRisk) query = query.eq('production_risk', filters.productionRisk)
  if (filters.notionSource === 'yes') query = query.not('notion_page_id', 'is', null)
  if (filters.notionSource === 'no') query = query.is('notion_page_id', null)
  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,caption.ilike.%${filters.search}%,brief.ilike.%${filters.search}%,platform.ilike.%${filters.search}%,published_url.ilike.%${filters.search}%,notion_source_url.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  let items = (data ?? []) as ContentItemRow[]

  if (filters.requiredRole) {
    items = items.filter((item) => {
      if (filters.requiredRole === 'designer') return item.requires_design
      if (filters.requiredRole === 'editor') return item.requires_editing
      if (filters.requiredRole === 'channel_manager') return item.requires_channel_manager
      return false
    })
  }

  if (filters.missingTask === 'yes') {
    items = items.filter(hasMissingProductionTask)
  }

  if (filters.missingTask === 'no') {
    items = items.filter((item) => !hasMissingProductionTask(item))
  }

  return items
}

export async function getContentFilterOptions(organizationId: string) {
  const supabase = await createClient()
  const [{ data: clients }, { data: members }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('organization_id', organizationId).order('name'),
    supabase
      .from('organization_members')
      .select('user_id, role, profiles(full_name, email)')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
  ])

  return {
    clients: clients ?? [],
    members: members ?? []
  }
}

export function groupContentByListWindow(items: ContentItemRow[]) {
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const weekEnd = new Date(today)
  weekEnd.setUTCDate(today.getUTCDate() + 7)
  const nextWeekEnd = new Date(today)
  nextWeekEnd.setUTCDate(today.getUTCDate() + 14)

  return {
    Today: items.filter((item) => item.publish_date === todayIso),
    'This Week': items.filter((item) => item.publish_date && item.publish_date > todayIso && item.publish_date <= weekEnd.toISOString().slice(0, 10)),
    'Next Week': items.filter((item) => item.publish_date && item.publish_date > weekEnd.toISOString().slice(0, 10) && item.publish_date <= nextWeekEnd.toISOString().slice(0, 10)),
    Later: items.filter((item) => item.publish_date && item.publish_date > nextWeekEnd.toISOString().slice(0, 10)),
    'No Publish Date': items.filter((item) => !item.publish_date)
  }
}
