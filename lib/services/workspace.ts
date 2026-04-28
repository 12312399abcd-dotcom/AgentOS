export const ORG_ROLES = [
  'admin',
  'finance_moderator',
  'designer',
  'editor',
  'marketing',
  'channel_manager',
  'viewer'
] as const

export type OrgRole = (typeof ORG_ROLES)[number]
export type Workspace = 'operation' | 'finance'

export function canAccessOperation(role: string | null | undefined) {
  return ['admin', 'designer', 'editor', 'marketing', 'channel_manager', 'viewer'].includes(role ?? '')
}

export function canAccessFinance(role: string | null | undefined) {
  return ['admin', 'finance_moderator'].includes(role ?? '')
}

export function resolveDefaultWorkspaceRoute(orgSlug: string, role: string | null | undefined) {
  switch (role) {
    case 'admin':
      return `/org/${orgSlug}/workspace`
    case 'finance_moderator':
      return `/org/${orgSlug}/finance/dashboard`
    case 'designer':
    case 'editor':
    case 'marketing':
    case 'channel_manager':
    case 'viewer':
      return `/org/${orgSlug}/operation/dashboard`
    default:
      return '/unauthorized'
  }
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
