import Link from 'next/link'

type WorkspaceBreadcrumbsProps = {
  orgSlug: string
  workspace: 'operation' | 'finance' | 'settings'
}

export function WorkspaceBreadcrumbs({ orgSlug, workspace }: WorkspaceBreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link href={`/org/${orgSlug}/workspace`}>Workspace</Link>
      <span>/</span>
      <Link href={workspace === 'settings' ? `/org/${orgSlug}/settings/organization` : `/org/${orgSlug}/${workspace}/dashboard`}>
        {workspace}
      </Link>
    </nav>
  )
}
