import Link from 'next/link'

import { approveReportFromForm } from '@/lib/actions/reports'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'
import type { ReportDraft } from '@/lib/services/report-builder'

type ReportDetailPageProps = {
  params: Promise<{ orgSlug: string; reportId: string }>
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { orgSlug, reportId } = await params
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  const member = await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  const { data: report } = await supabase
    .from('reports')
    .select('id, report_period, report_type, status, report_data, notes, created_at, file_url, clients(name)')
    .eq('organization_id', organization.id)
    .eq('id', reportId)
    .single()

  if (!report) {
    return (
      <main className="shell">
        <h1>Report not found</h1>
      </main>
    )
  }

  const client = Array.isArray(report.clients) ? report.clients[0] : report.clients
  const data = report.report_data as ReportDraft
  const approveAction = approveReportFromForm.bind(null, organization.id, orgSlug)

  return (
    <main className="shell">
      <Link href={`/org/${orgSlug}/operation/reports`}>Back to reports</Link>
      <h1>{client?.name ?? data.client?.name ?? 'Client'} · {report.report_period}</h1>
      <div className="grid">
        <section className="card">
          <h2>Status</h2>
          <p>{report.status}</p>
          <p>{report.notes}</p>
          {report.status === 'draft' && ['admin', 'marketing'].includes(member.role) ? (
            <form action={approveAction}>
              <input type="hidden" name="reportId" value={report.id} />
              <button type="submit">Approve report</button>
            </form>
          ) : null}
        </section>
        <section className="card">
          <h2>Warnings</h2>
          {data.warnings?.length ? (
            <ul>{data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          ) : (
            <p>No blocking warnings.</p>
          )}
        </section>
      </div>
      <section>
        <h2>Work Completed</h2>
        <div className="grid">
          {(data.workCompleted ?? []).map((task) => (
            <article className="card" key={task.id}>
              <strong>{task.title}</strong>
              <p>{task.task_type ?? task.required_role ?? 'Task'} · {task.completed_at?.slice(0, 10) ?? ''}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Content Published</h2>
        <div className="grid">
          {(data.contentPublished ?? []).map((item) => (
            <article className="card" key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.platform} · {item.content_type ?? 'Content'} · {item.publish_date ?? ''}</p>
              {item.published_url ? <a href={item.published_url}>Published URL</a> : null}
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Channel Performance</h2>
        <div className="grid">
          {Object.entries(data.channelPerformance ?? {}).map(([channel, summary]) => (
            <article className="card" key={channel}>
              <strong>{channel}</strong>
              <p>{summary.posts} posts</p>
              <p>{summary.reach.toLocaleString()} reach · {summary.clicks.toLocaleString()} clicks · {summary.leads.toLocaleString()} leads</p>
              <p>{summary.engagement.toLocaleString()} engagement · {summary.spend.toLocaleString()} spend</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Top Performing Posts</h2>
        <div className="grid">
          {(data.topPosts ?? []).map((post) => (
            <article className="card" key={post.id}>
              <strong>{post.title}</strong>
              <p>{post.channel} · {post.reach} reach · {post.clicks} clicks · {post.leads} leads</p>
              <a href={post.published_url}>Open post</a>
            </article>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Recommendations</h2>
        <ul>{(data.recommendations ?? []).map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul>
      </section>
      <section className="card">
        <h2>Export</h2>
        <p className="muted">PDF export and Supabase Storage upload will be connected in a later report export pass.</p>
      </section>
    </main>
  )
}
