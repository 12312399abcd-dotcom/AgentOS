'use server'

import { redirect } from 'next/navigation'

import { requireUser } from '@/lib/services/permissions'
import { resolvePostLoginRoute } from '@/lib/services/post-login'
import { endCurrentMemberSession, startMemberSession } from '@/lib/services/sessions'
import { resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'
import { createClient } from '@/lib/supabase/server'

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`)
  }

  return value.trim()
}

function loginRedirectWithError(message: string, next: FormDataEntryValue | null, inviteToken: FormDataEntryValue | null): never {
  const params = new URLSearchParams({ error: message })

  if (typeof next === 'string' && next.startsWith('/')) {
    params.set('next', next)
  }

  if (typeof inviteToken === 'string' && inviteToken) {
    params.set('inviteToken', inviteToken)
  }

  redirect(`/login?${params.toString()}`)
}

export async function signInWithPassword(formData: FormData) {
  const email = requiredString(formData, 'email').toLowerCase()
  const password = requiredString(formData, 'password')
  const next = formData.get('next')
  const inviteToken = formData.get('inviteToken')
  let supabase: Awaited<ReturnType<typeof createClient>>

  try {
    supabase = await createClient()
  } catch {
    loginRedirectWithError('Login is not configured yet. Check Supabase environment variables on Vercel.', next, inviteToken)
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    loginRedirectWithError(error.message, next, inviteToken)
  }

  if (typeof inviteToken === 'string' && inviteToken) {
    redirect(`/invite/${inviteToken}`)
  }

  if (typeof next === 'string' && next.startsWith('/')) {
    redirect(next)
  }

  redirect(await resolvePostLoginRoute())
}

export async function signUpWithPassword(formData: FormData) {
  const fullName = requiredString(formData, 'fullName')
  const email = requiredString(formData, 'email').toLowerCase()
  const password = requiredString(formData, 'password')
  const inviteToken = formData.get('inviteToken')
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const redirectTo =
    typeof inviteToken === 'string' && inviteToken
      ? `${siteUrl}/auth/callback?inviteToken=${inviteToken}`
      : `${siteUrl}/auth/callback`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: fullName
      }
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data.session) {
    if (typeof inviteToken === 'string' && inviteToken) {
      redirect(`/invite/${inviteToken}`)
    }

    redirect('/onboarding/create-organization')
  }

  redirect('/login?checkEmail=1')
}

export async function selectOrganizationFromForm(formData: FormData) {
  const user = await requireUser()
  const organizationId = requiredString(formData, 'organizationId')
  const orgSlug = requiredString(formData, 'orgSlug')
  const role = requiredString(formData, 'role')
  const currentOrganizationId = formData.get('currentOrganizationId')

  if (
    typeof currentOrganizationId === 'string' &&
    currentOrganizationId &&
    currentOrganizationId !== organizationId
  ) {
    await endCurrentMemberSession(currentOrganizationId)
  }

  await startMemberSession(organizationId, user.id)
  redirect(resolveDefaultWorkspaceRoute(orgSlug, role))
}

export async function signOut(formData: FormData) {
  const organizationId = formData.get('organizationId')
  if (typeof organizationId === 'string' && organizationId) {
    await endCurrentMemberSession(organizationId)
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
