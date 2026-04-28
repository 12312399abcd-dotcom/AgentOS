import { redirect } from 'next/navigation'

type TaskListRedirectProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function TaskListRedirect({ params }: TaskListRedirectProps) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/operation/tasks`)
}
