import { redirect } from 'next/navigation'
import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { canAccessFinance, canAccessOperation, type Workspace } from './workspace'

export type OrgMember = {
  id: string
  organization_id: string
  user_id: string
  role: string
  status: string
}

export type OrganizationSummary = {
  id: string
  name: string
  slug: string
  status: string
  timezone: string
  currency: string
}

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
})

export async function requireUser() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

export const getOrganizationBySlug = cache(async (orgSlug: string): Promise<OrganizationSummary | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, status, timezone, currency')
    .eq('slug', orgSlug)
    .single()

  if (error) {
    return null
  }

  return data as OrganizationSummary
})

export const getCurrentOrgMember = cache(async (orgId: string): Promise<OrgMember | null> => {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, organization_id, user_id, role, status')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (error) {
    return null
  }

  return data
})

export async function requireOrgAccess(orgId: string) {
  const member = await getCurrentOrgMember(orgId)

  if (!member) {
    redirect('/unauthorized')
  }

  return member
}

export async function requireWorkspaceAccess(orgId: string, workspace: Workspace) {
  const member = await requireOrgAccess(orgId)

  if (workspace === 'operation' && !canAccessOperation(member.role)) {
    redirect('/unauthorized')
  }

  if (workspace === 'finance' && !canAccessFinance(member.role)) {
    redirect('/unauthorized')
  }

  return member
}

export async function getWorkspaceAccess(orgId: string, workspace: Workspace) {
  const member = await getCurrentOrgMember(orgId)

  if (!member) {
    return { member: null, error: 'No organization access', status: 401 }
  }

  if (workspace === 'operation' && !canAccessOperation(member.role)) {
    return { member: null, error: 'No operation access', status: 403 }
  }

  if (workspace === 'finance' && !canAccessFinance(member.role)) {
    return { member: null, error: 'No finance access', status: 403 }
  }

  return { member, error: null, status: 200 }
}

export async function requireAdmin(orgId: string) {
  const member = await requireOrgAccess(orgId)

  if (member.role !== 'admin') {
    redirect('/unauthorized')
  }

  return member
}

export const listActiveMemberships = cache(async () => {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select('id, role, organizations(id, name, slug, status)')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).filter((membership) => {
    const organization = Array.isArray(membership.organizations)
      ? membership.organizations[0]
      : membership.organizations

    return organization?.status === 'active'
  })
})
