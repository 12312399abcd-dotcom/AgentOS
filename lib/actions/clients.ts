'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/services/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClientSchema, type CreateClientInput } from '@/lib/validators/client.schema'

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export async function createClient(input: CreateClientInput) {
  const parsed = createClientSchema.parse(input)
  const member = await requireAdmin(parsed.organizationId)
  const admin = createAdminClient()

  const { data: client, error } = await admin
    .from('clients')
    .insert({
      organization_id: parsed.organizationId,
      name: parsed.name,
      category: parsed.category,
      contact_name: parsed.contactName,
      contact_email: parsed.contactEmail,
      monthly_retainer: parsed.monthlyRetainer,
      account_manager_id: parsed.accountManagerId,
      status: parsed.status
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (parsed.accountManagerId) {
    await admin.from('client_members').insert({
      organization_id: parsed.organizationId,
      client_id: client.id,
      user_id: parsed.accountManagerId,
      member_role: 'account_manager'
    })
  }

  await admin.from('audit_logs').insert({
    organization_id: parsed.organizationId,
    actor_id: member.user_id,
    entity_type: 'client',
    entity_id: client.id,
    action: 'created',
    new_data: parsed
  })

  return { clientId: client.id }
}

export async function createClientFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await createClient({
    organizationId,
    name: String(formData.get('name') ?? ''),
    category: readOptionalString(formData, 'category'),
    contactName: readOptionalString(formData, 'contactName'),
    contactEmail: readOptionalString(formData, 'contactEmail'),
    monthlyRetainer: Number(formData.get('monthlyRetainer') ?? 0),
    status: String(formData.get('status') ?? 'active') as CreateClientInput['status'],
    accountManagerId: readOptionalString(formData, 'accountManagerId')
  })

  revalidatePath(`/org/${orgSlug}/operation/clients`)
}
