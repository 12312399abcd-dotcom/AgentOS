import { redirect } from 'next/navigation'

type ContentPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function ContentPage({ params }: ContentPageProps) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/operation/content/calendar`)
}
