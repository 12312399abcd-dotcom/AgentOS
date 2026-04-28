import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const findings = []

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') return []
    if (statSync(path).isDirectory()) return walk(path)
    return [path]
  })
}

const files = walk(root).filter((file) => /\.(ts|tsx|js|mjs)$/.test(file))

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const rel = file.replace(`${root}/`, '')
  const isAllowedAuthAction = rel === 'lib/actions/auth.ts'
  const isSecurityCheckScript = rel === 'scripts/static-security-check.mjs'

  if (rel.startsWith('app/api/cron/') && !text.includes('verifyCron(req)')) {
    findings.push(`${rel}: cron route does not call verifyCron(req)`)
  }

  if (text.includes('SUPABASE_SERVICE_ROLE_KEY') && !rel.startsWith('lib/supabase/admin') && !isSecurityCheckScript) {
    findings.push(`${rel}: references SUPABASE_SERVICE_ROLE_KEY outside admin client`)
  }

  if (rel.startsWith('lib/actions/') && !isAllowedAuthAction && !text.includes('requireWorkspaceAccess') && !text.includes('requireAdmin') && !text.includes('requireOrgAccess') && !text.includes('requireUser')) {
    findings.push(`${rel}: server action file has no obvious permission guard import`)
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'))
  process.exit(1)
}

console.log('Static security checks passed')
