import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { canAccessFinance, canAccessOperation, resolveDefaultWorkspaceRoute } from '@/lib/services/workspace'

const PUBLIC_PREFIXES = ['/login', '/signup', '/auth/callback', '/invite', '/unauthorized']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || pathname === '/') {
    return NextResponse.next()
  }

  let res = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        }
      }
    }
  )

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  const orgMatch = pathname.match(/^\/org\/([^/]+)(?:\/(.*))?$/)

  if (!orgMatch) {
    return res
  }

  const orgSlug = orgMatch[1]
  const routeTail = orgMatch[2] ?? ''

  const { data: organization } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('slug', orgSlug)
    .single()

  if (!organization) {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organization.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member) {
    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  if (routeTail.startsWith('finance') && !canAccessFinance(member.role)) {
    return NextResponse.redirect(new URL(resolveDefaultWorkspaceRoute(orgSlug, member.role), req.url))
  }

  if (routeTail.startsWith('operation') && !canAccessOperation(member.role)) {
    return NextResponse.redirect(new URL(resolveDefaultWorkspaceRoute(orgSlug, member.role), req.url))
  }

  if (routeTail === 'workspace' && member.role !== 'admin') {
    return NextResponse.redirect(new URL(resolveDefaultWorkspaceRoute(orgSlug, member.role), req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
