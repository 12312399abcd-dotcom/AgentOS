'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requireAdmin, requireUser } from '@/lib/services/permissions'
import { writeAuditLog } from '@/lib/services/audit'
import { startMemberSession } from '@/lib/services/sessions'
import { resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createOrganizationSchema,
  inviteMemberSchema,
  updateFinanceControlSettingsSchema,
  updateMemberTimeLimitsSchema,
  updateOrganizationMemberSchema,
  updateOrganizationSettingsSchema,
  type CreateOrganizationInput,
  type InviteMemberInput,
  type UpdateFinanceControlSettingsInput,
  type UpdateMemberTimeLimitsInput,
  type UpdateOrganizationMemberInput,
  type UpdateOrganizationSettingsInput
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

  try {
    const setupSteps = [
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

    for (const step of setupSteps) {
      const { error } = await step
      if (error) throw new Error(error.message)
    }
  } catch (error) {
    await admin.from('organizations').delete().eq('id', organization.id)
    throw error
  }

  await startMemberSession(organization.id, user.id)

  redirect(`/org/${organization.slug}/workspace`)
}

export async function createOrganizationFromForm(formData: FormData) {
  try {
    await createOrganization({
      name: readString(formData, 'name'),
      slug: readString(formData, 'slug'),
      timezone: readString(formData, 'timezone'),
      currency: readString(formData, 'currency').toUpperCase(),
      businessType: readString(formData, 'businessType') as CreateOrganizationInput['businessType'],
      payrollCycle: readString(formData, 'payrollCycle') as CreateOrganizationInput['payrollCycle'],
      financialPeriod: 'monthly'
    })
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join(', ')
      : error instanceof Error
        ? error.message
        : 'Could not create organization'
    redirect(`/onboarding/create-organization?error=${encodeURIComponent(message)}`)
  }
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

export async function inviteOrganizationMemberFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  const invitation = await inviteOrganizationMember({
    organizationId,
    email: readString(formData, 'email'),
    role: readString(formData, 'role') as InviteMemberInput['role']
  })

  revalidatePath(`/org/${orgSlug}/settings/members`)
  redirect(`/org/${orgSlug}/settings/members?inviteToken=${invitation.token}`)
}

export async function updateOrganizationSettings(input: UpdateOrganizationSettingsInput) {
  const parsed = updateOrganizationSettingsSchema.parse(input)
  const member = await requireAdmin(parsed.organizationId)
  const admin = createAdminClient()

  const { data: current } = await admin
    .from('organizations')
    .select('id, name, slug, timezone, currency')
    .eq('id', parsed.organizationId)
    .single()

  if (!current) throw new Error('Organization not found')

  if (current.slug !== parsed.slug) {
    const { data: existing } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', parsed.slug)
      .neq('id', parsed.organizationId)
      .maybeSingle()

    if (existing) throw new Error('Organization slug is already taken')
  }

  const { error } = await admin
    .from('organizations')
    .update({
      name: parsed.name,
      slug: parsed.slug,
      timezone: parsed.timezone,
      currency: parsed.currency,
      updated_at: new Date().toISOString()
    })
    .eq('id', parsed.organizationId)

  if (error) throw new Error(error.message)

  await writeAuditLog({
    organizationId: parsed.organizationId,
    actorId: member.user_id,
    entityType: 'organization',
    entityId: parsed.organizationId,
    action: 'settings_updated',
    oldData: current,
    newData: parsed
  })

  return { slug: parsed.slug }
}

export async function updateFinanceControlSettings(input: UpdateFinanceControlSettingsInput) {
  const parsed = updateFinanceControlSettingsSchema.parse(input)
  const member = await requireAdmin(parsed.organizationId)
  const admin = createAdminClient()

  const { data: current } = await admin
    .from('finance_control_settings')
    .select('*')
    .eq('organization_id', parsed.organizationId)
    .single()

  const payload = {
    payroll_cycle: parsed.payrollCycle,
    reserve_months: parsed.reserveMonths,
    minimum_cash_reserve: parsed.minimumCashReserve,
    tax_reserve_rate: parsed.taxReserveRate,
    expense_variance_warning_percent: parsed.expenseVarianceWarningPercent,
    cash_risk_warning_days: parsed.cashRiskWarningDays,
    strict_spending_control: parsed.strictSpendingControl,
    owner_draw_requires_reserve_check: parsed.ownerDrawRequiresReserveCheck,
    updated_at: new Date().toISOString()
  }

  const { error } = await admin
    .from('finance_control_settings')
    .upsert({
      organization_id: parsed.organizationId,
      financial_period: 'monthly',
      ...payload
    })

  if (error) throw new Error(error.message)

  await writeAuditLog({
    organizationId: parsed.organizationId,
    actorId: member.user_id,
    entityType: 'finance_control_settings',
    action: 'settings_updated',
    oldData: current,
    newData: payload
  })
}

export async function updateOrganizationSettingsFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  const result = await updateOrganizationSettings({
    organizationId,
    name: readString(formData, 'name'),
    slug: readString(formData, 'slug'),
    timezone: readString(formData, 'timezone'),
    currency: readString(formData, 'currency')
  })

  revalidatePath(`/org/${orgSlug}/settings/organization`)

  if (result.slug !== orgSlug) {
    redirect(`/org/${result.slug}/settings/organization`)
  }
}

export async function updateFinanceControlSettingsFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateFinanceControlSettings({
    organizationId,
    payrollCycle: readString(formData, 'payrollCycle') as UpdateFinanceControlSettingsInput['payrollCycle'],
    reserveMonths: Number(formData.get('reserveMonths') ?? 0),
    minimumCashReserve: Number(formData.get('minimumCashReserve') ?? 0),
    taxReserveRate: Number(formData.get('taxReserveRate') ?? 0),
    expenseVarianceWarningPercent: Number(formData.get('expenseVarianceWarningPercent') ?? 0),
    cashRiskWarningDays: Number(formData.get('cashRiskWarningDays') ?? 0),
    strictSpendingControl: formData.get('strictSpendingControl') === 'on',
    ownerDrawRequiresReserveCheck: formData.get('ownerDrawRequiresReserveCheck') === 'on'
  })

  revalidatePath(`/org/${orgSlug}/settings/organization`)
  revalidatePath(`/org/${orgSlug}/finance/dashboard`)
}

export async function updateMemberTimeLimits(input: UpdateMemberTimeLimitsInput) {
  const parsed = updateMemberTimeLimitsSchema.parse(input)
  const member = await requireAdmin(parsed.organizationId)
  const admin = createAdminClient()

  const { data: orgMember } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', parsed.organizationId)
    .eq('user_id', parsed.userId)
    .eq('status', 'active')
    .single()

  if (!orgMember) throw new Error('Member not found')

  const { data: current } = await admin
    .from('profiles')
    .select('id, daily_time_limit_minutes, weekly_time_limit_minutes')
    .eq('id', parsed.userId)
    .single()

  const { error } = await admin
    .from('profiles')
    .update({
      daily_time_limit_minutes: parsed.dailyTimeLimitMinutes,
      weekly_time_limit_minutes: parsed.weeklyTimeLimitMinutes
    })
    .eq('id', parsed.userId)

  if (error) throw new Error(error.message)

  await writeAuditLog({
    organizationId: parsed.organizationId,
    actorId: member.user_id,
    entityType: 'profile',
    entityId: parsed.userId,
    action: 'time_limits_updated',
    oldData: current,
    newData: {
      daily_time_limit_minutes: parsed.dailyTimeLimitMinutes,
      weekly_time_limit_minutes: parsed.weeklyTimeLimitMinutes
    }
  })
}

export async function updateMemberTimeLimitsFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateMemberTimeLimits({
    organizationId,
    userId: readString(formData, 'userId'),
    dailyTimeLimitMinutes: Number(formData.get('dailyTimeLimitMinutes') ?? 480),
    weeklyTimeLimitMinutes: Number(formData.get('weeklyTimeLimitMinutes') ?? 2400)
  })

  revalidatePath(`/org/${orgSlug}/settings/members`)
  revalidatePath(`/org/${orgSlug}/settings/sessions`)
}

export async function updateOrganizationMember(input: UpdateOrganizationMemberInput) {
  const parsed = updateOrganizationMemberSchema.parse(input)
  const adminMember = await requireAdmin(parsed.organizationId)
  const admin = createAdminClient()

  const { data: current } = await admin
    .from('organization_members')
    .select('id, user_id, role, status')
    .eq('organization_id', parsed.organizationId)
    .eq('user_id', parsed.userId)
    .single()

  if (!current) throw new Error('Member not found')

  const removingAdminAccess = current.role === 'admin' && (parsed.role !== 'admin' || parsed.status !== 'active')
  if (removingAdminAccess) {
    const { count } = await admin
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', parsed.organizationId)
      .eq('role', 'admin')
      .eq('status', 'active')

    if ((count ?? 0) <= 1) {
      throw new Error('Cannot remove or demote the last active admin')
    }
  }

  const { error } = await admin
    .from('organization_members')
    .update({
      role: parsed.role,
      status: parsed.status
    })
    .eq('id', current.id)

  if (error) throw new Error(error.message)

  await writeAuditLog({
    organizationId: parsed.organizationId,
    actorId: adminMember.user_id,
    entityType: 'organization_member',
    entityId: current.id,
    action: 'membership_updated',
    oldData: current,
    newData: {
      user_id: parsed.userId,
      role: parsed.role,
      status: parsed.status
    }
  })
}

export async function updateOrganizationMemberFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateOrganizationMember({
    organizationId,
    userId: readString(formData, 'userId'),
    role: readString(formData, 'role') as UpdateOrganizationMemberInput['role'],
    status: readString(formData, 'status') as UpdateOrganizationMemberInput['status']
  })

  revalidatePath(`/org/${orgSlug}/settings/members`)
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
    .select('id, organization_id, email, role, status, expires_at, organizations(slug, status)')
    .eq('token', token)
    .single()

  if (error || !invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status !== 'pending' || new Date(invitation.expires_at) < new Date()) {
    if (new Date(invitation.expires_at) < new Date()) {
      await admin.from('organization_invitations').update({ status: 'expired' }).eq('id', invitation.id)
    }

    throw new Error('Invitation is no longer valid')
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('Authenticated email does not match the invitation email')
  }

  const org = Array.isArray(invitation.organizations) ? invitation.organizations[0] : invitation.organizations
  if (!org || org.status !== 'active') {
    throw new Error('Organization is not active')
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

  await startMemberSession(invitation.organization_id, user.id)
  redirect(resolveDefaultWorkspaceRoute(org.slug, invitation.role))
}
