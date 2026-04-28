import { signInWithPassword } from '@/lib/actions/auth'

type LoginPageProps = {
  searchParams: Promise<{ next?: string; inviteToken?: string; checkEmail?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

  return (
    <main className="shell">
      <h1>Agency OS Login</h1>
      {params.checkEmail ? <p className="notice">Check your email to confirm your account, then log in.</p> : null}
      <form className="form" action={signInWithPassword}>
        <input type="hidden" name="next" value={params.next ?? ''} />
        <input type="hidden" name="inviteToken" value={params.inviteToken ?? ''} />
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Log in</button>
      </form>
    </main>
  )
}
