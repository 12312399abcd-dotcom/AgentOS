import { signUpWithPassword } from '@/lib/actions/auth'

type SignupPageProps = {
  searchParams: Promise<{ inviteToken?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams

  return (
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="Agency OS overview">
        <div>
          <p className="auth-eyebrow">Join the system</p>
          <h1>Start running your agency with precision.</h1>
          <p className="auth-copy">
            Deploy your delivery workspace, automate your content pipeline, and control your finance in minutes.
          </p>
        </div>

        <div className="auth-metrics" aria-label="Core modules">
          <div>
            <span>Scalability</span>
            <strong>Standardized workflows for 10x output</strong>
          </div>
          <div>
            <span>Control</span>
            <strong>Real-time margin and workload visibility</strong>
          </div>
        </div>
      </section>

      <section className="auth-form-panel" aria-label="Signup form">
        <div className="auth-form-header">
          <p className="auth-eyebrow">New Account</p>
          <h2>Create your identity</h2>
          <p className="muted">Use your professional email to get started.</p>
        </div>

        {params.inviteToken ? (
          <p className="notice">
            You are accepting an organization invitation. Please sign up to join your team.
          </p>
        ) : null}

        <form className="auth-form" action={signUpWithPassword}>
          <input type="hidden" name="inviteToken" value={params.inviteToken ?? ''} />
          <label>
            Full Name
            <input name="fullName" type="text" autoComplete="name" placeholder="Alex Rivera" required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" placeholder="alex@agency.com" required />
          </label>
          <label>
            Password
            <input 
              name="password" 
              type="password" 
              autoComplete="new-password" 
              placeholder="Min 8 characters" 
              required 
              minLength={8} 
            />
          </label>
          <button className="auth-submit" type="submit">Create account</button>
        </form>

        <p className="auth-footer">
          Already have an account? <a href="/login">Log in</a>
        </p>
      </section>
    </main>
  )
}
