import Link from 'next/link'

type TasksLayoutProps = {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}

export default async function TasksLayout({ children, params }: TasksLayoutProps) {
  const { orgSlug } = await params

  return (
    <>
      <div className="view-tabs">
        <Link href={`/org/${orgSlug}/operation/tasks`}>list</Link>
        <Link href={`/org/${orgSlug}/operation/tasks/board`}>board</Link>
      </div>
      {children}
    </>
  )
}
