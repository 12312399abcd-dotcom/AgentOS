import { signUpWithPassword } from '@/lib/actions/auth'

type SignupPageProps = {
  searchParams: Promise<{ inviteToken?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams

  return (
    <main className="shell">
      <h1>Create Account</h1>
      <form className="form" action={signUpWithPassword}>
        <input type="hidden" name="inviteToken" value={params.inviteToken ?? ''} />
        <label>
          Full name
          <input name="fullName" type="text" autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="new-password" required minLength={8} />
        </label>
        <button type="submit">Create account</button>
      </form>
    </main>
  )
}
