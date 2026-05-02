import { signInWithPassword } from '@/lib/actions/auth'

type LoginPageProps = {
  searchParams: Promise<{ next?: string; inviteToken?: string; checkEmail?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const signupHref = params.inviteToken ? `/signup?inviteToken=${params.inviteToken}` : '/signup'

  return (
    <main className="auth-page">
      <div className="auth-container">
        <section className="auth-brand-panel" aria-label="Agency OS overview">
          <div>
            <p className="auth-eyebrow">Agency OS</p>
            <h1>Run operation and finance from one controlled system.</h1>
            <p className="auth-copy">
              Secure workspace routing, production booking, finance control, reports, cron automation, and audit history.
            </p>
          </div>

          <div className="auth-metrics" aria-label="Workspace boundaries">
            <div>
              <span>Operation</span>
              <strong>Clients, tasks, content, social, reports</strong>
            </div>
            <div>
              <span>Finance</span>
              <strong>Cashflow, payroll, invoices, forecasts</strong>
            </div>
          </div>
        </section>

        <section className="auth-form-panel" aria-label="Login form">
          <div className="auth-form-header">
            <p className="auth-eyebrow">Secure login</p>
            <h2>Welcome back</h2>
            <p className="muted">Sign in with the email assigned to your organization.</p>
          </div>

          {params.checkEmail ? (
            <p className="notice">Check your email to confirm your account, then log in.</p>
          ) : null}

          {params.inviteToken ? (
            <p className="notice">You are accepting an organization invitation. Log in with the invited email.</p>
          ) : null}

          <form className="auth-form" action={signInWithPassword}>
            <input type="hidden" name="next" value={params.next ?? ''} />
            <input type="hidden" name="inviteToken" value={params.inviteToken ?? ''} />
            <label>
              Email
              <input name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
            </label>
            <button className="auth-submit" type="submit">Log in</button>
          </form>

          <p className="auth-footer">
            New to Agency OS? <a href={signupHref}>Create an account</a>
          </p>
        </section>
      </div>
    </main>
  )
}
