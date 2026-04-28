import { createAdminClient } from '@/lib/supabase/admin'

export function parseStorageUrl(value: string | null | undefined) {
  if (!value?.startsWith('storage://')) return null
  const withoutScheme = value.replace('storage://', '')
  const [bucket, ...pathParts] = withoutScheme.split('/')
  const path = pathParts.join('/')

  if (!bucket || !path) return null
  return { bucket, path }
}

export async function createSignedFileUrl(value: string | null | undefined, expiresIn = 60 * 10) {
  const parsed = parseStorageUrl(value)
  if (!parsed) return value ?? null

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(parsed.bucket).createSignedUrl(parsed.path, expiresIn)

  if (error) return null
  return data.signedUrl
}

export function safeStorageFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}
