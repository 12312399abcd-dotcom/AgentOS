create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'removed')),
  daily_time_limit_minutes int default 480,
  weekly_time_limit_minutes int default 2400,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'suspended', 'cancelled')),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  currency text not null default 'USD',
  business_type text not null default 'agency' check (business_type in ('agency', 'studio', 'consultancy', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'finance_moderator', 'designer', 'editor', 'marketing', 'channel_manager', 'viewer')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'removed')),
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('finance_moderator', 'designer', 'editor', 'marketing', 'channel_manager', 'viewer')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.organization_workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_type text not null check (workspace_type in ('operation', 'finance')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  unique (organization_id, workspace_type)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  contact_name text,
  contact_email text,
  monthly_retainer numeric not null default 0 check (monthly_retainer >= 0),
  account_manager_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now()
);

create table public.client_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  campaign text,
  platform text not null,
  content_type text,
  title text not null,
  caption text,
  brief text,
  asset_url text,
  status text not null default 'idea' check (status in ('idea', 'planned', 'scheduled', 'brief_ready', 'design_in_progress', 'design_done', 'editing_in_progress', 'editing_done', 'internal_review', 'approved', 'ready_to_publish', 'published', 'reported')),
  publish_date date,
  published_url text,
  owner_id uuid references public.profiles(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  notion_page_id text,
  notion_source_url text,
  synced_from text,
  last_synced_at timestamptz,
  production_template text,
  requires_design boolean not null default true,
  requires_editing boolean not null default true,
  requires_channel_manager boolean not null default true,
  production_risk text not null default 'normal' check (production_risk in ('normal', 'watch', 'high', 'blocked')),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null,
  title text not null,
  description text,
  owner_id uuid references public.profiles(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'backlog' check (status in ('backlog', 'assigned', 'in_progress', 'review', 'approved', 'completed', 'blocked', 'archived')),
  due_date date,
  task_type text,
  required_role text check (required_role is null or required_role in ('designer', 'editor', 'marketing', 'channel_manager', 'viewer')),
  dependency_task_id uuid references public.tasks(id) on delete set null,
  booking_source text not null default 'manual' check (booking_source in ('manual', 'content_schedule', 'notion_sync', 'automation')),
  production_risk text not null default 'normal' check (production_risk in ('normal', 'watch', 'high', 'blocked')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete set null,
  channel text not null,
  published_url text not null,
  published_at timestamptz,
  reach int not null default 0 check (reach >= 0),
  impressions int not null default 0 check (impressions >= 0),
  likes int not null default 0 check (likes >= 0),
  comments int not null default 0 check (comments >= 0),
  shares int not null default 0 check (shares >= 0),
  saves int not null default 0 check (saves >= 0),
  clicks int not null default 0 check (clicks >= 0),
  leads int not null default 0 check (leads >= 0),
  spend numeric not null default 0 check (spend >= 0),
  report_period text,
  created_at timestamptz not null default now()
);

create table public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_name text not null,
  account_type text not null default 'cash' check (account_type in ('cash', 'bank', 'wallet', 'credit_card', 'loan')),
  currency text not null default 'USD',
  opening_balance numeric not null default 0,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create table public.finance_control_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  payroll_cycle text not null default 'beginning_of_month' check (payroll_cycle in ('beginning_of_month', 'middle_of_month', 'end_of_month')),
  financial_period text not null default 'monthly' check (financial_period in ('monthly')),
  reserve_months numeric not null default 1,
  minimum_cash_reserve numeric not null default 0,
  tax_reserve_rate numeric not null default 0,
  expense_variance_warning_percent numeric not null default 10,
  cash_risk_warning_days int not null default 14,
  strict_spending_control boolean not null default false,
  owner_draw_requires_reserve_check boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.forecast_budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  forecast_month text not null,
  opening_cash numeric not null default 0,
  expected_money_in numeric not null default 0,
  expected_money_out numeric not null default 0,
  expected_tax_reserve numeric not null default 0,
  expected_closing_cash numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'active', 'closed')),
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, forecast_month)
);

create table public.forecast_budget_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  forecast_budget_id uuid not null references public.forecast_budgets(id) on delete cascade,
  item_type text not null check (item_type in ('money_in', 'money_out', 'tax_reserve', 'asset_purchase', 'liability_payment', 'owner_equity')),
  category text not null,
  description text,
  client_id uuid references public.clients(id) on delete set null,
  expected_date date,
  expected_amount numeric not null default 0 check (expected_amount >= 0),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_number text not null,
  service_period_start date,
  service_period_end date,
  subtotal numeric not null default 0 check (subtotal >= 0),
  tax_rate numeric not null default 0 check (tax_rate >= 0),
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  total_amount numeric not null default 0 check (total_amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'sent', 'partial_paid', 'paid', 'overdue', 'cancelled')),
  due_date date,
  sent_at timestamptz,
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  line_total numeric not null default 0 check (line_total >= 0)
);

create table public.cashflow_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_date date not null,
  direction text not null check (direction in ('money_in', 'money_out')),
  category text not null,
  amount numeric not null check (amount >= 0),
  business_account_id uuid references public.business_accounts(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  vendor_name text,
  payee_name text,
  payment_method text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_date date not null,
  due_date date,
  paid_date date,
  category text not null,
  vendor_name text,
  description text,
  amount numeric not null default 0 check (amount >= 0),
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  total_amount numeric not null default 0 check (total_amount >= 0),
  status text not null default 'unpaid' check (status in ('unpaid', 'scheduled', 'paid', 'overdue', 'cancelled')),
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.capital_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  transaction_date date not null,
  transaction_type text not null check (transaction_type in ('owner_capital_injection', 'owner_draw', 'loan_received', 'loan_repayment', 'dividend_distribution')),
  amount numeric not null default 0 check (amount >= 0),
  counterparty text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.financial_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_month text not null,
  period_start date,
  period_end date,
  forecast_budget_id uuid references public.forecast_budgets(id) on delete set null,
  opening_cash numeric not null default 0,
  closing_cash numeric not null default 0,
  minimum_cash_reserve numeric not null default 0,
  tax_reserve_rate numeric not null default 0,
  projected_closing_cash numeric not null default 0,
  actual_closing_cash numeric not null default 0,
  cash_risk_status text not null default 'normal' check (cash_risk_status in ('normal', 'watch', 'high', 'critical')),
  status text not null default 'open' check (status in ('planning', 'open', 'review', 'closed', 'locked')),
  review_notes text,
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, period_month)
);

create table public.balance_sheet_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_month text not null,
  cash numeric not null default 0,
  accounts_receivable numeric not null default 0,
  prepaid_expenses numeric not null default 0,
  equipment_assets numeric not null default 0,
  deposits numeric not null default 0,
  total_assets numeric not null default 0,
  accounts_payable numeric not null default 0,
  tax_payable numeric not null default 0,
  payroll_payable numeric not null default 0,
  loans_payable numeric not null default 0,
  unearned_revenue numeric not null default 0,
  credit_card_payable numeric not null default 0,
  total_liabilities numeric not null default 0,
  owner_capital numeric not null default 0,
  owner_draws numeric not null default 0,
  retained_earnings numeric not null default 0,
  current_period_profit numeric not null default 0,
  total_equity numeric not null default 0,
  balance_status text generated always as (
    case when total_assets = total_liabilities + total_equity then 'balanced' else 'out_of_balance' end
  ) stored,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, period_month)
);

create table public.payroll_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_month text not null,
  payroll_due_date date not null,
  total_gross_pay numeric not null default 0 check (total_gross_pay >= 0),
  total_net_pay numeric not null default 0 check (total_net_pay >= 0),
  tax_withholding numeric not null default 0 check (tax_withholding >= 0),
  status text not null default 'planned' check (status in ('planned', 'reserved', 'approved', 'paid', 'partial_paid', 'blocked')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, period_month)
);

create table public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payroll_cycle_id uuid not null references public.payroll_cycles(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  payee_name text,
  payee_type text not null default 'employee' check (payee_type in ('employee', 'contractor', 'freelancer', 'owner_salary')),
  gross_amount numeric not null default 0 check (gross_amount >= 0),
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  net_amount numeric not null default 0 check (net_amount >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'approved', 'paid', 'partial_paid', 'blocked')),
  paid_date date,
  cashflow_transaction_id uuid references public.cashflow_transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.member_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  login_time timestamptz not null default now(),
  logout_time timestamptz,
  active_minutes int not null default 0,
  idle_minutes int not null default 0,
  status text not null default 'active' check (status in ('active', 'idle', 'warning', 'locked', 'logged_out')),
  consent_version text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  link_url text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  report_period text not null,
  report_type text not null default 'monthly',
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  generated_by uuid references public.profiles(id) on delete set null,
  file_url text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table public.notion_sync_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sync_type text not null default 'content',
  notion_database_id text,
  client_id uuid references public.clients(id) on delete set null,
  sync_mode text not null check (sync_mode in ('preview', 'import', 'update')),
  imported_count int not null default 0,
  updated_count int not null default 0,
  skipped_count int not null default 0,
  error_count int not null default 0,
  status text not null default 'completed' check (status in ('previewed', 'completed', 'partial_failed', 'failed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.user_view_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  module text not null check (module in ('content', 'tasks', 'social', 'finance')),
  default_view text not null,
  filters jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, module)
);

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.current_org_role(target_org_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.organization_members
  where organization_id = target_org_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_org_role(target_org_id) = 'admin';
$$;

create or replace function public.has_operation_access(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_org_role(target_org_id) in ('admin', 'designer', 'editor', 'marketing', 'channel_manager', 'viewer');
$$;

create or replace function public.has_finance_access(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_org_role(target_org_id) in ('admin', 'finance_moderator');
$$;

create or replace function public.is_client_member(target_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_members
    where client_id = target_client_id
      and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.organization_workspaces enable row level security;
alter table public.clients enable row level security;
alter table public.client_members enable row level security;
alter table public.content_items enable row level security;
alter table public.tasks enable row level security;
alter table public.social_posts enable row level security;
alter table public.business_accounts enable row level security;
alter table public.finance_control_settings enable row level security;
alter table public.forecast_budgets enable row level security;
alter table public.forecast_budget_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.cashflow_transactions enable row level security;
alter table public.business_expenses enable row level security;
alter table public.capital_transactions enable row level security;
alter table public.financial_periods enable row level security;
alter table public.balance_sheet_snapshots enable row level security;
alter table public.payroll_cycles enable row level security;
alter table public.payroll_items enable row level security;
alter table public.member_sessions enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notion_sync_logs enable row level security;
alter table public.user_view_preferences enable row level security;

create policy "users_read_own_profile" on public.profiles for select using (id = auth.uid());
create policy "users_update_own_profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members_read_organizations" on public.organizations for select using (public.is_org_member(id));
create policy "admins_update_organizations" on public.organizations for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy "members_read_memberships" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "admins_manage_memberships" on public.organization_members for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "admins_manage_invitations" on public.organization_invitations for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "members_read_workspaces" on public.organization_workspaces for select using (public.is_org_member(organization_id));

create policy "operation_read_clients" on public.clients for select using (public.has_operation_access(organization_id) or public.has_finance_access(organization_id));
create policy "admins_manage_clients" on public.clients for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "operation_read_client_members" on public.client_members for select using (public.has_operation_access(organization_id));
create policy "admins_manage_client_members" on public.client_members for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "operation_read_content" on public.content_items for select using (public.has_operation_access(organization_id));
create policy "operation_write_content" on public.content_items for all using (public.current_org_role(organization_id) in ('admin', 'marketing', 'channel_manager', 'editor')) with check (public.current_org_role(organization_id) in ('admin', 'marketing', 'channel_manager', 'editor'));

create policy "operation_read_tasks" on public.tasks for select using (public.has_operation_access(organization_id));
create policy "operation_write_tasks" on public.tasks for all using (public.current_org_role(organization_id) in ('admin', 'designer', 'editor', 'marketing', 'channel_manager')) with check (public.current_org_role(organization_id) in ('admin', 'designer', 'editor', 'marketing', 'channel_manager'));

create policy "operation_read_social_posts" on public.social_posts for select using (public.has_operation_access(organization_id));
create policy "operation_write_social_posts" on public.social_posts for all using (public.current_org_role(organization_id) in ('admin', 'marketing', 'channel_manager')) with check (public.current_org_role(organization_id) in ('admin', 'marketing', 'channel_manager'));

create policy "finance_access_business_accounts" on public.business_accounts for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_finance_settings" on public.finance_control_settings for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_forecasts" on public.forecast_budgets for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_forecast_items" on public.forecast_budget_items for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_invoices" on public.invoices for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_invoice_items" on public.invoice_items for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_cashflow" on public.cashflow_transactions for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_expenses" on public.business_expenses for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_capital" on public.capital_transactions for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_periods" on public.financial_periods for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_balance_sheets" on public.balance_sheet_snapshots for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_payroll_cycles" on public.payroll_cycles for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));
create policy "finance_access_payroll_items" on public.payroll_items for all using (public.has_finance_access(organization_id)) with check (public.has_finance_access(organization_id));

create policy "users_read_own_sessions" on public.member_sessions for select using (user_id = auth.uid() or public.is_org_admin(organization_id));
create policy "users_manage_own_sessions" on public.member_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users_read_own_notifications" on public.notifications for select using (user_id = auth.uid());
create policy "users_update_own_notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "operation_read_reports" on public.reports for select using (public.has_operation_access(organization_id));
create policy "operation_manage_reports" on public.reports for all using (public.current_org_role(organization_id) in ('admin', 'marketing')) with check (public.current_org_role(organization_id) in ('admin', 'marketing'));

create policy "members_read_audit_logs" on public.audit_logs for select using (public.is_org_admin(organization_id));
create policy "operation_read_notion_logs" on public.notion_sync_logs for select using (public.has_operation_access(organization_id));
create policy "operation_manage_notion_logs" on public.notion_sync_logs for all using (public.current_org_role(organization_id) in ('admin', 'marketing', 'channel_manager')) with check (public.current_org_role(organization_id) in ('admin', 'marketing', 'channel_manager'));

create policy "users_manage_view_preferences" on public.user_view_preferences for all using (user_id = auth.uid() and public.is_org_member(organization_id)) with check (user_id = auth.uid() and public.is_org_member(organization_id));

create index clients_organization_id_idx on public.clients(organization_id);
create index tasks_org_status_due_idx on public.tasks(organization_id, status, due_date);
create index tasks_content_item_id_idx on public.tasks(content_item_id);
create index content_items_org_publish_idx on public.content_items(organization_id, publish_date, status);
create index content_items_notion_page_idx on public.content_items(organization_id, notion_page_id);
create index cashflow_org_date_idx on public.cashflow_transactions(organization_id, transaction_date);
create index invoices_org_status_due_idx on public.invoices(organization_id, status, due_date);
create index notifications_user_status_idx on public.notifications(user_id, status, created_at);
