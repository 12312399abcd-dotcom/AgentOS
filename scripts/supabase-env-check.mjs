import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const envPath = join(root, '.env.local')
const migrationDir = join(root, 'supabase', 'migrations')
const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'NEXT_PUBLIC_SITE_URL'
]
const requiredMigrations = [
  '0001_agency_os_foundation.sql',
  '0002_reports_draft_data.sql',
  '0003_storage_buckets.sql',
  '0004_invoice_file_url.sql'
]
const failures = []

if (!existsSync(envPath)) {
  failures.push('Missing .env.local')
} else {
  const env = readFileSync(envPath, 'utf8')
  for (const key of requiredEnv) {
    const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'))
    if (!match) {
      failures.push(`Missing ${key} in .env.local`)
    } else if (!match[1].trim()) {
      failures.push(`${key} is empty in .env.local`)
    }
  }
}

for (const migration of requiredMigrations) {
  if (!existsSync(join(migrationDir, migration))) {
    failures.push(`Missing migration ${migration}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Supabase environment files are present')
