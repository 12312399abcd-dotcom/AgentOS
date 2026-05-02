import Link from 'next/link'

type ContentLayoutProps = {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

const views = ['calendar', 'schedule', 'list', 'board', 'table', 'timeline']

export default async function ContentLayout({ children, params }: ContentLayoutProps) {
  const { orgSlug } = await params

  return (
    <>
      <div className="view-tabs">
        {views.map((view) => (
          <Link key={view} href={`/org/${orgSlug}/operation/content/${view}`}>
            {view}
          </Link>
        ))}
      </div>
      {children}
    </>
  )
}
