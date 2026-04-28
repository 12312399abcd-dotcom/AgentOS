alter table public.reports
drop constraint if exists reports_status_check;

alter table public.reports
add constraint reports_status_check
check (status in ('draft', 'approved', 'sent', 'archived'));

alter table public.reports
add column if not exists report_data jsonb not null default '{}'::jsonb,
add column if not exists notes text,
add column if not exists approved_at timestamptz;
