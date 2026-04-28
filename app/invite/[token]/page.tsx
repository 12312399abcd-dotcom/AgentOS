import Link from 'next/link'

import { acceptInvitation, getInvitationPreview } from '@/lib/actions/organizations'

type InvitePageProps = {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const invitation = await getInvitationPreview(token)

  async function accept() {
    'use server'
    await acceptInvitation(token)
  }

  if (!invitation) {
    return (
      <main className="shell">
        <h1>Invitation not found</h1>
        <p className="muted">Ask your organization admin to send a new invitation.</p>
      </main>
    )
  }

  const organization = Array.isArray(invitation.organizations) ? invitation.organizations[0] : invitation.organizations
  const expired = new Date(invitation.expires_at) < new Date()
  const unavailable = invitation.status !== 'pending' || expired || organization?.status !== 'active'

  return (
    <main className="shell">
      <h1>Organization Invitation</h1>
      <div className="card">
        <p><strong>Organization:</strong> {organization?.name ?? 'Unknown organization'}</p>
        <p><strong>Email:</strong> {invitation.email}</p>
        <p><strong>Role:</strong> {invitation.role}</p>
        <p><strong>Workspace access:</strong> {invitation.role === 'finance_moderator' ? 'Finance only' : 'Operation only'}</p>
      </div>
      {unavailable ? (
        <p className="notice">This invitation is no longer available.</p>
      ) : (
        <>
          <p className="muted">Sign in or create an account with the invited email, then accept the invitation.</p>
          <div className="actions">
            <Link href={`/login?inviteToken=${token}`}>Log in</Link>
            <Link href={`/signup?inviteToken=${token}`}>Create account</Link>
          </div>
          <form action={accept}>
            <button type="submit">Accept invitation</button>
          </form>
        </>
      )}
    </main>
  )
}
