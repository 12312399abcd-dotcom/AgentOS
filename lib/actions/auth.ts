'use server'

import { redirect } from 'next/navigation'

import { resolvePostLoginRoute } from '@/lib/services/post-login'
import { createClient } from '@/lib/supabase/server'

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`)
  }

  return value.trim()
}

export async function signInWithPassword(formData: FormData) {
  const email = requiredString(formData, 'email').toLowerCase()
  const password = requiredString(formData, 'password')
  const next = formData.get('next')
  const inviteToken = formData.get('inviteToken')
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(error.message)
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
