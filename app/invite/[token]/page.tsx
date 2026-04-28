import { acceptInvitation } from '@/lib/actions/organizations'

type InvitePageProps = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params

  async function accept() {
    'use server'
    await acceptInvitation(token)
  }

  return (
    <main className="shell">
      <h1>Organization Invitation</h1>
      <p className="muted">Accept this invitation after signing in with the invited email address.</p>
      <form action={accept}>
        <button type="submit">Accept invitation</button>
      </form>
    </main>
  )
}
