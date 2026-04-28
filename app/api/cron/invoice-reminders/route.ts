import { NextResponse } from 'next/server'

import { verifyCron } from '@/lib/services/cron'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const admin = createAdminClient()
  const { data: invoices, error } = await admin
    .from('invoices')
    .select('id, organization_id, invoice_number, due_date')
    .eq('status', 'sent')
    .lt('due_date', today)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if ((invoices ?? []).length > 0) {
    await admin
      .from('invoices')
      .update({ status: 'overdue' })
      .in('id', invoices!.map((invoice) => invoice.id))
  }

  return NextResponse.json({ overdue: invoices?.length ?? 0 })
}
