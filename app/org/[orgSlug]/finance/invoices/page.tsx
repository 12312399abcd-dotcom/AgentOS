import { createInvoiceFromForm, exportInvoicePdfFromForm, markInvoicePaidFromForm, updateInvoiceStatusFromForm } from '@/lib/actions/invoices'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { createSignedFileUrl } from '@/lib/services/storage'
import { createClient } from '@/lib/supabase/server'

type FinanceInvoicesPageProps = {
  params: Promise<{ orgSlug: string }>
}

export default async function FinanceInvoicesPage({ params }: FinanceInvoicesPageProps) {
  const { orgSlug } = await params
  const organization = await getOrganizationBySlug(orgSlug)
  if (!organization) return null

  await requireWorkspaceAccess(organization.id, 'finance')
  const supabase = await createClient()
  const [{ data: clients }, { data: accounts }, { data: invoices }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('organization_id', organization.id).order('name'),
    supabase.from('business_accounts').select('id, account_name').eq('organization_id', organization.id).eq('status', 'active').order('account_name'),
    supabase
      .from('invoices')
      .select('id, invoice_number, service_period_start, service_period_end, subtotal, tax_rate, tax_amount, total_amount, status, due_date, sent_at, paid_at, file_url, clients(name), invoice_items(description, quantity, unit_price, line_total)')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
  ])
  const createAction = createInvoiceFromForm.bind(null, organization.id, orgSlug)
  const statusAction = updateInvoiceStatusFromForm.bind(null, organization.id, orgSlug)
  const paidAction = markInvoicePaidFromForm.bind(null, organization.id, orgSlug)
  const exportAction = exportInvoicePdfFromForm.bind(null, organization.id, orgSlug)
  const unpaid = (invoices ?? []).filter((invoice) => ['draft', 'sent', 'partial_paid', 'overdue'].includes(invoice.status))
  const accountsReceivable = unpaid.filter((invoice) => invoice.status !== 'draft').reduce((sum, invoice) => sum + Number(invoice.total_amount), 0)

  return (
    <main className="shell">
      <h1>Invoices</h1>
      <div className="grid">
        <div className="card"><strong>Unpaid Invoices</strong><p>{unpaid.length}</p></div>
        <div className="card"><strong>Accounts Receivable</strong><p>{accountsReceivable.toLocaleString()}</p></div>
      </div>
      <section className="card">
        <h2>Create invoice</h2>
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
          <button type="submit">Create invoice</button>
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
