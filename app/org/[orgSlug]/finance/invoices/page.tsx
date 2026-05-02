import {
  createInvoiceFromForm,
  exportInvoicePdfFromForm,
  markInvoicePaidFromForm,
  updateInvoiceStatusFromForm,
  updateInvoiceTemplateFromForm
} from '@/lib/actions/invoices'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createSignedFileUrl } from '@/lib/services/storage'
import { createClient } from '@/lib/supabase/server'

type FinanceInvoicesPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ clientId?: string; status?: string; dueStart?: string; dueEnd?: string }>
}

export default async function FinanceInvoicesPage({ params, searchParams }: FinanceInvoicesPageProps) {
  const { orgSlug } = await params
  const filters = await searchParams
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  let invoicesQuery = supabase
    .from('invoices')
    .select('id, invoice_number, service_period_start, service_period_end, subtotal, tax_rate, tax_amount, total_amount, status, due_date, sent_at, paid_at, file_url, clients(name), invoice_items(description, quantity, unit_price, line_total)')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })

  if (filters.clientId) invoicesQuery = invoicesQuery.eq('client_id', filters.clientId)
  if (filters.status) invoicesQuery = invoicesQuery.eq('status', filters.status)
  if (filters.dueStart) invoicesQuery = invoicesQuery.gte('due_date', filters.dueStart)
  if (filters.dueEnd) invoicesQuery = invoicesQuery.lte('due_date', filters.dueEnd)

  const [{ data: clients }, { data: accounts }, { data: invoices }, { data: template }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name'),
    supabase.from('business_accounts').select('id, account_name').eq('organization_id', organization.id).eq('status', 'active').order('account_name'),
    invoicesQuery,
    supabase
      .from('invoice_templates')
      .select('company_name, company_address, company_email, company_phone, tax_id, payment_instructions, default_notes, logo_data_url')
      .eq('organization_id', organization.id)
      .maybeSingle()
  ])
  const createAction = createInvoiceFromForm.bind(null, organization.id, orgSlug)
  const statusAction = updateInvoiceStatusFromForm.bind(null, organization.id, orgSlug)
  const paidAction = markInvoicePaidFromForm.bind(null, organization.id, orgSlug)
  const exportAction = exportInvoicePdfFromForm.bind(null, organization.id, orgSlug)
  const templateAction = updateInvoiceTemplateFromForm.bind(null, organization.id, orgSlug)
  const unpaid = (invoices ?? []).filter((invoice) => ['draft', 'sent', 'partial_paid', 'overdue'].includes(invoice.status))
  const accountsReceivable = unpaid.filter((invoice) => invoice.status !== 'draft').reduce((sum, invoice) => sum + Number(invoice.total_amount), 0)
  const exportParams = new URLSearchParams({ orgSlug })
  if (filters.clientId) exportParams.set('clientId', filters.clientId)
  if (filters.status) exportParams.set('status', filters.status)
  if (filters.dueStart) exportParams.set('dueStart', filters.dueStart)
  if (filters.dueEnd) exportParams.set('dueEnd', filters.dueEnd)

  return (
    <main className="shell">
      <h1>Quotes / Invoices</h1>
      <div className="actions">
        <a href={`/api/exports/invoices?${exportParams.toString()}`}>Export CSV</a>
      </div>
      <div className="grid">
        <div className="card"><strong>Unpaid Invoices</strong><p>{unpaid.length}</p></div>
        <div className="card"><strong>Accounts Receivable</strong><p>{accountsReceivable.toLocaleString()}</p></div>
      </div>
      <section className="card">
        <h2>Invoice template setup</h2>
        <p className="muted">Set company details once. New PDF quotes and invoices will use this information. Logo must be a small data URL under 20KB.</p>
        <form className="form form-wide" action={templateAction}>
          <label>Company name<input name="companyName" required defaultValue={template?.company_name ?? organization.name} /></label>
          <label>Company email<input name="companyEmail" type="email" defaultValue={template?.company_email ?? ''} /></label>
          <label>Company phone<input name="companyPhone" defaultValue={template?.company_phone ?? ''} /></label>
          <label>Tax ID<input name="taxId" defaultValue={template?.tax_id ?? ''} /></label>
          <label className="form-span-2">Company address<textarea name="companyAddress" rows={2} defaultValue={template?.company_address ?? ''} /></label>
          <label className="form-span-2">Payment instructions<textarea name="paymentInstructions" rows={3} defaultValue={template?.payment_instructions ?? ''} /></label>
          <label className="form-span-2">Default notes<textarea name="defaultNotes" rows={3} defaultValue={template?.default_notes ?? ''} /></label>
          <label className="form-span-2">Logo data URL under 20KB<textarea name="logoDataUrl" rows={3} maxLength={20480} defaultValue={template?.logo_data_url ?? ''} /></label>
          <button type="submit">Save template</button>
        </form>
      </section>
      <section>
        <h2>Filters</h2>
        <form className="filter-bar">
          <select name="clientId" defaultValue={filters.clientId ?? ''}>
            <option value="">All clients</option>
            {(clients ?? []).map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={filters.status ?? ''}>
            <option value="">Any status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partial_paid">Partial paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <label>Due from<input name="dueStart" type="date" defaultValue={filters.dueStart ?? ''} /></label>
          <label>Due to<input name="dueEnd" type="date" defaultValue={filters.dueEnd ?? ''} /></label>
          <button type="submit">Filter</button>
        </form>
      </section>
      <section className="card">
        <h2>Create quote / invoice</h2>
        <form className="form" action={createAction}>
          <label>
            Client
            <select name="clientId" required defaultValue="">
              <option value="" disabled>Select client</option>
              {(clients ?? []).map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label>Service period start<input name="servicePeriodStart" type="date" /></label>
          <label>Service period end<input name="servicePeriodEnd" type="date" /></label>
          <label>Tax rate %<input name="taxRate" type="number" min="0" step="0.01" defaultValue="0" /></label>
          <label>Due date<input name="dueDate" type="date" /></label>
          {[0, 1, 2].map((index) => (
            <div className="grid" key={index}>
              <label>Item description<input name={`itemDescription${index}`} required={index === 0} /></label>
              <label>Quantity<input name={`itemQuantity${index}`} type="number" min="0" step="0.01" defaultValue={index === 0 ? '1' : '0'} /></label>
              <label>Unit price<input name={`itemUnitPrice${index}`} type="number" min="0" step="0.01" defaultValue="0" /></label>
            </div>
          ))}
          <button type="submit">Create draft</button>
        </form>
      </section>
      <section>
        <h2>Invoices</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Total</th>
                <th>Status</th>
                <th>Due</th>
                <th>Items</th>
                <th>Status</th>
                <th>Paid</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {await Promise.all((invoices ?? []).map(async (invoice) => {
                const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients
                const fileUrl = await createSignedFileUrl(invoice.file_url)
                return (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_number}</td>
                    <td>{client?.name ?? 'No client'}</td>
                    <td>{Number(invoice.total_amount).toLocaleString()}</td>
                    <td>{invoice.status}</td>
                    <td>{invoice.due_date ?? ''}</td>
                    <td>
                      <ul>
                        {(invoice.invoice_items ?? []).map((item) => (
                          <li key={`${invoice.id}-${item.description}`}>{item.description}: {Number(item.line_total).toLocaleString()}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <form className="inline-form" action={statusAction}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <select name="status" defaultValue={invoice.status}>
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="partial_paid">Partial paid</option>
                          <option value="overdue">Overdue</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button type="submit">Save</button>
                      </form>
                    </td>
                    <td>
                      {invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
                        <form className="inline-form" action={paidAction}>
                          <input type="hidden" name="invoiceId" value={invoice.id} />
                          <input name="paidDate" type="date" required />
                          <select name="businessAccountId" defaultValue="">
                            <option value="">No account</option>
                            {(accounts ?? []).map((account) => (
                              <option key={account.id} value={account.id}>{account.account_name}</option>
                            ))}
                          </select>
                          <input name="paymentMethod" placeholder="Method" />
                          <button type="submit">Paid</button>
                        </form>
                      ) : null}
                    </td>
                    <td>
                      <form className="inline-form" action={exportAction}>
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button type="submit">Generate</button>
                      </form>
                      {fileUrl ? <a href={fileUrl}>Open</a> : null}
                    </td>
                  </tr>
                )
              }))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
