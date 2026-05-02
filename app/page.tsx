import Link from 'next/link'

const agencyFeatures = [
  {
    title: 'Client delivery control',
    copy: 'Track every client, campaign, task, owner, review state, and deadline from one operating layer.'
  },
  {
    title: 'Content production booking',
    copy: 'Turn scheduled content into designer, editor, and channel-manager tasks with due dates and production risk.'
  },
  {
    title: 'Business finance workspace',
    copy: 'Separate cashflow, payroll, invoices, forecasts, tax reserve, and period close from day-to-day operation work.'
  },
  {
    title: 'Agency reporting',
    copy: 'Build client reports from approved work, published links, social metrics, and structured operational records.'
  }
]

const platformPillars = [
  'Operation workspace',
  'Finance workspace',
  'Content calendar',
  'Task workflow',
  'Client reporting',
  'Audit history'
]

const workflowSteps = [
  'Plan client content',
  'Auto-book production tasks',
  'Review creative and copy',
  'Publish and collect metrics',
  'Report client outcomes',
  'Control cash and payroll'
]

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" href="/">Agency OS</Link>
        <nav aria-label="Primary navigation">
          <a href="#platform">Platform</a>
          <a href="#workflow">Workflow</a>
          <a href="#finance">Finance</a>
          <a href="#reports">Reports</a>
        </nav>
        <div className="landing-nav-actions">
          <Link href="/login">Log in</Link>
          <Link className="landing-button" href="/signup">Start setup</Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Agency management system</p>
            <h1>Run your agency from one OS.</h1>
            <p>
              Agency OS gives creative and marketing agencies one structured source of truth for delivery, team workload,
              publishing, reporting, invoices, cashflow, payroll, and financial control.
            </p>
            <div className="landing-actions">
              <Link className="landing-button" href="/signup">Start setup</Link>
              <Link className="landing-button landing-button-secondary" href="/login">Log in</Link>
            </div>
          </div>

          <div className="landing-product-panel" aria-label="Agency OS product preview">
            <div className="landing-panel-top">
              <span>Agency command center</span>
              <strong>May delivery health</strong>
            </div>
            <div className="landing-kpi-grid">
              <div><span>Open tasks</span><strong>128</strong></div>
              <div><span>Content this week</span><strong>42</strong></div>
              <div><span>Production risk</span><strong>7</strong></div>
              <div><span>Payroll gap</span><strong>$0</strong></div>
            </div>
            <div className="landing-workload">
              <div><span>Design</span><i style={{ width: '78%' }} /></div>
              <div><span>Editing</span><i style={{ width: '64%' }} /></div>
              <div><span>Publishing</span><i style={{ width: '52%' }} /></div>
            </div>
            <div className="landing-panel-footer">
              <span>Next risk</span>
              <strong>3 scheduled posts missing production tasks</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-trust" aria-label="Agency OS scope">
        <div className="landing-trust-inner">
          {platformPillars.map((pillar) => (
            <span key={pillar}>{pillar}</span>
          ))}
        </div>
      </section>

      <section id="platform" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Built for agencies only</p>
            <h2>All agency work in one place.</h2>
          </div>
          <div className="landing-feature-grid">
            {agencyFeatures.map((feature) => (
              <article className="landing-feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="landing-split">
        <div className="landing-split-inner">
          <div>
            <p className="landing-eyebrow">Production workflow</p>
            <h2>Content planning creates real operational work.</h2>
            <p>
              When a content item is scheduled, Agency OS can book the required design, editing, review, and publishing
              tasks. Managers see bottlenecks before the publish date is missed.
            </p>
          </div>
          <ol className="landing-steps">
            {workflowSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>

      <section id="finance" className="landing-finance">
        <div className="landing-container">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Finance workspace</p>
            <h2>
              Separate agency finance
              <br />
              from production.
            </h2>
            <p>
              Finance Moderator and Admin roles get cash safety, payroll readiness, invoice payment, forecast variance,
              income statement, balance sheet, and period close tools without exposing finance to operation roles.
            </p>
          </div>
          <div className="landing-finance-grid">
            <div><span>Cash control</span><strong>Current cash, reserve, gap, spending allowance</strong></div>
            <div><span>Payroll protection</span><strong>Beginning-of-month salary planning and risk status</strong></div>
            <div><span>Forecast vs actual</span><strong>Category-level variance for revenue and expenses</strong></div>
          </div>
        </div>
      </section>

      <section id="reports" className="landing-cta">
        <div className="landing-container">
          <p className="landing-eyebrow">Agency OS</p>
          <h2>Build the system behind your agency.</h2>
          <p>
            Keep delivery, publishing, finance, reporting, and permissions connected to one source of truth.
          </p>
          <Link className="landing-button" href="/signup">Create your agency workspace</Link>
        </div>
      </section>
    </main>
  )
}
