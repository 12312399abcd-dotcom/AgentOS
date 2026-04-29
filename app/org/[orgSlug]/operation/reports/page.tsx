import Link from 'next/link'

import { approveReportFromForm, generateClientReportFromForm } from '@/lib/actions/reports'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createClient } from '@/lib/supabase/server'

type OperationReportsPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ clientId?: string; reportPeriod?: string; status?: string }>
}

export default async function OperationReportsPage({ params, searchParams }: OperationReportsPageProps) {
  const { orgSlug } = await params
  const filters = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) return null

  const member = await requireWorkspaceAccess(organization.id, 'operation')
  const supabase = await createClient()
  let reportsQuery = supabase
    .from('reports')
    .select('id, report_period, report_type, status, created_at, file_url, clients(name)')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })

  if (filters.clientId) reportsQuery = reportsQuery.eq('client_id', filters.clientId)
  if (filters.reportPeriod) reportsQuery = reportsQuery.eq('report_period', filters.reportPeriod)
  if (filters.status) reportsQuery = reportsQuery.eq('status', filters.status)
  if (member.role === 'viewer') reportsQuery = reportsQuery.eq('status', 'approved')

  const [{ data: clients }, { data: reports }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name'),
    reportsQuery
  ])
  const generateAction = generateClientReportFromForm.bind(null, organization.id, orgSlug)
  const approveAction = approveReportFromForm.bind(null, organization.id, orgSlug)
  const defaultPeriod = new Date().toISOString().slice(0, 7)

  return (
    <main className="shell">
      <h1>Reports</h1>
      {['admin', 'marketing', 'channel_manager'].includes(member.role) ? (
        <section className="card">
          <h2>Generate report draft</h2>
          <form className="form" action={generateAction}>
            <label>
              Client
              <select name="clientId" required defaultValue="">
                <option value="" disabled>Select client</option>
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <label>
              Report period
              <input name="reportPeriod" required pattern="\d{4}-\d{2}" defaultValue={defaultPeriod} />
            </label>
            <label>
              Notes
              <textarea name="notes" rows={3} />
            </label>
            <button type="submit">Generate draft</button>
          </form>
        </section>
      ) : null}
      <section>
        <h2>Filters</h2>
        <form className="filter-bar">
          <select name="clientId" defaultValue={filters.clientId ?? ''}>
            <option value="">All clients</option>
            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <input name="reportPeriod" placeholder="2026-04" defaultValue={filters.reportPeriod ?? ''} />
          {member.role !== 'viewer' ? (
            <select name="status" defaultValue={filters.status ?? ''}>
              <option value="">Any status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
              <option value="archived">Archived</option>
            </select>
          ) : null}
          <button type="submit">Filter</button>
        </form>
      </section>
      <section>
        <h2>Report drafts</h2>
        {(reports ?? []).length === 0 ? <p className="muted">No reports yet.</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Client</th>
                <th>Period</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(reports ?? []).map((report) => {
                const client = Array.isArray(report.clients) ? report.clients[0] : report.clients

                return (
                  <tr key={report.id}>
                    <td><Link href={`/org/${orgSlug}/operation/reports/${report.id}`}>{report.report_type} report</Link></td>
                    <td>{client?.name ?? 'No client'}</td>
                    <td>{report.report_period}</td>
                    <td>{report.status}</td>
                    <td>{report.created_at.slice(0, 10)}</td>
                    <td>
                      {report.status === 'draft' && ['admin', 'marketing'].includes(member.role) ? (
                        <form action={approveAction}>
                          <input type="hidden" name="reportId" value={report.id} />
                          <button type="submit">Approve</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
