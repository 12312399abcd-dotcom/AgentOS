'use server'

import { revalidatePath } from 'next/cache'

import { requireOrgAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

export async function updateNotificationStatus(notificationId: string, organizationId: string, status: 'read' | 'archived') {
  await requireOrgAccess(organizationId)
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ status })
    .eq('organization_id', organizationId)
    .eq('id', notificationId)

  if (error) throw new Error(error.message)
}

export async function markNotificationReadFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateNotificationStatus(String(formData.get('notificationId') ?? ''), organizationId, 'read')
  revalidatePath(`/org/${orgSlug}/notifications`)
}

export async function archiveNotificationFromForm(organizationId: string, orgSlug: string, formData: FormData) {
  await updateNotificationStatus(String(formData.get('notificationId') ?? ''), organizationId, 'archived')
  revalidatePath(`/org/${orgSlug}/notifications`)
}
