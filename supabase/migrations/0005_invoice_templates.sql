create table if not exists public.invoice_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  company_name text not null,
  company_address text,
  company_email text,
  company_phone text,
  tax_id text,
  payment_instructions text,
  default_notes text,
  logo_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (logo_data_url is null or length(logo_data_url) <= 20480)
);

alter table public.invoice_templates enable row level security;

create policy "finance_access_invoice_templates"
on public.invoice_templates
for all
using (public.has_finance_access(organization_id))
with check (public.has_finance_access(organization_id));
