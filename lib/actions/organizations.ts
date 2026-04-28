'use server'

import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'

import { requireAdmin, requireUser } from '@/lib/services/permissions'
import { resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createOrganizationSchema,
  inviteMemberSchema,
  type CreateOrganizationInput,
  type InviteMemberInput
} from '@/lib/validators/organization.schema'

function readString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export async function createOrganization(input: CreateOrganizationInput) {
  const user = await requireUser()
  const parsed = createOrganizationSchema.parse(input)
  const admin = createAdminClient()

  const { data: existing } = await admin.from('organizations').select('id').eq('slug', parsed.slug).maybeSingle()
  if (existing) {
    throw new Error('Organization slug is already taken')
  }

  await admin.from('profiles').upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? user.email ?? 'Agency OS User',
    email: user.email ?? ''
  })

  const { data: organization, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: parsed.name,
      slug: parsed.slug,
      owner_id: user.id,
      timezone: parsed.timezone,
      currency: parsed.currency,
      business_type: parsed.businessType
    })
    .select('id, slug')
    .single()

  if (orgError) {
    throw new Error(orgError.message)
  }

  const inserts = [
    admin.from('organization_members').insert({
      organization_id: organization.id,
      user_id: user.id,
      role: 'admin',
      status: 'active'
    }),
    admin.from('organization_workspaces').insert([
      { organization_id: organization.id, workspace_type: 'operation' },
      { organization_id: organization.id, workspace_type: 'finance' }
    ]),
    admin.from('finance_control_settings').insert({
      organization_id: organization.id,
      payroll_cycle: parsed.payrollCycle,
      financial_period: parsed.financialPeriod
    }),
    admin.from('business_accounts').insert({
      organization_id: organization.id,
      account_name: 'Main Business Account',
      account_type: 'bank',
      currency: parsed.currency
    }),
    admin.from('audit_logs').insert({
      organization_id: organization.id,
      actor_id: user.id,
      entity_type: 'organization',
      entity_id: organization.id,
      action: 'created',
      new_data: parsed
    })
  ]

  const results = await Promise.all(inserts)
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    throw new Error(failed.error.message)
  }

  redirect(`/org/${organization.slug}/workspace`)
}

export async function createOrganizationFromForm(formData: FormData) {
  await createOrganization({
    name: readString(formData, 'name'),
    slug: readString(formData, 'slug'),
    timezone: readString(formData, 'timezone'),
    currency: readString(formData, 'currency'),
    businessType: readString(formData, 'businessType') as CreateOrganizationInput['businessType'],
    payrollCycle: readString(formData, 'payrollCycle') as CreateOrganizationInput['payrollCycle'],
    financialPeriod: 'monthly'
  })
}

export async function inviteOrganizationMember(input: InviteMemberInput) {
  const parsed = inviteMemberSchema.parse(input)
  const user = await requireUser()
  await requireAdmin(parsed.organizationId)

  const admin = createAdminClient()

  const { data: invitedProfile } = await admin.from('profiles').select('id').eq('email', parsed.email).maybeSingle()
  if (invitedProfile) {
    const { data: existingMember } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', parsed.organizationId)
      .eq('user_id', invitedProfile.id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingMember) {
      throw new Error('This user is already an active member')
    }
  }

  const { data: pendingInvitation } = await admin
    .from('organization_invitations')
    .select('id, token')
    .eq('organization_id', parsed.organizationId)
    .eq('email', parsed.email)
    .eq('status', 'pending')
    .maybeSingle()

  if (pendingInvitation) {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 14)
    await admin
      .from('organization_invitations')
      .update({ role: parsed.role, expires_at: expiresAt.toISOString() })
      .eq('id', pendingInvitation.id)

    return { token: pendingInvitation.token }
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 14)

  const { error } = await admin.from('organization_invitations').insert({
    organization_id: parsed.organizationId,
    email: parsed.email,
    role: parsed.role,
    token,
    expires_at: expiresAt.toISOString(),
    invited_by: user.id
  })

  if (error) {
    throw new Error(error.message)
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: user.id,
    entity_type: 'organization_invitation',
    action: 'created',
    new_data: { email: parsed.email, role: parsed.role }
  })

  return { token }
}

export async function inviteOrganizationMemberFromForm(organizationId: string, formData: FormData) {
  await inviteOrganizationMember({
    organizationId,
    email: readString(formData, 'email'),
    role: readString(formData, 'role') as InviteMemberInput['role']
  })
}

export async function getInvitationPreview(token: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('organization_invitations')
    .select('email, role, status, expires_at, organizations(name, status)')
    .eq('token', token)
    .single()

  if (error) {
    return null
  }

  return data
}

export async function acceptInvitation(token: string) {
  const user = await requireUser()
  const admin = createAdminClient()

  const { data: invitation, error } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role, status, expires_at, organizations(slug)')
    .eq('token', token)
    .single()

  if (error || !invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation is no longer valid')
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('Authenticated email does not match the invitation email')
  }

  await admin.from('profiles').upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? user.email ?? 'Agency OS User',
    email: user.email ?? ''
  })

  const { error: memberError } = await admin.from('organization_members').upsert({
    organization_id: invitation.organization_id,
    user_id: user.id,
    role: invitation.role,
    status: 'active'
  })

  if (memberError) {
    throw new Error(memberError.message)
  }

  await admin
    .from('organization_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  await admin.from('audit_logs').insert({
    organization_id: invitation.organization_id,
    actor_id: user.id,
    entity_type: 'organization_invitation',
    entity_id: invitation.id,
    action: 'accepted',
    new_data: { role: invitation.role }
  })

  const org = Array.isArray(invitation.organizations) ? invitation.organizations[0] : invitation.organizations
  redirect(resolveDefaultWorkspaceRoute(org.slug, invitation.role))
}
