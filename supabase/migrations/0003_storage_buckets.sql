insert into storage.buckets (id, name, public)
values
  ('client-assets', 'client-assets', false),
  ('reports', 'reports', false),
  ('invoices', 'invoices', false)
on conflict (id) do nothing;

create policy "org_operation_read_client_assets"
on storage.objects
for select
using (
  bucket_id = 'client-assets'
  and public.has_operation_access((storage.foldername(name))[1]::uuid)
);

create policy "org_operation_upload_client_assets"
on storage.objects
for insert
with check (
  bucket_id = 'client-assets'
  and public.has_operation_access((storage.foldername(name))[1]::uuid)
);

create policy "org_operation_update_client_assets"
on storage.objects
for update
using (
  bucket_id = 'client-assets'
  and public.has_operation_access((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'client-assets'
  and public.has_operation_access((storage.foldername(name))[1]::uuid)
);

create policy "org_report_file_access"
on storage.objects
for select
using (
  bucket_id = 'reports'
  and (
    public.has_operation_access((storage.foldername(name))[1]::uuid)
    or public.has_finance_access((storage.foldername(name))[1]::uuid)
  )
);

create policy "org_report_file_upload"
on storage.objects
for insert
with check (
  bucket_id = 'reports'
  and public.current_org_role((storage.foldername(name))[1]::uuid) in ('admin', 'marketing')
);

create policy "org_invoice_file_finance_access"
on storage.objects
for select
using (
  bucket_id = 'invoices'
  and public.has_finance_access((storage.foldername(name))[1]::uuid)
);

create policy "org_invoice_file_finance_upload"
on storage.objects
for insert
with check (
  bucket_id = 'invoices'
  and public.has_finance_access((storage.foldername(name))[1]::uuid)
);

create policy "admin_delete_storage_files"
on storage.objects
for delete
using (
  bucket_id in ('client-assets', 'reports', 'invoices')
  and public.current_org_role((storage.foldername(name))[1]::uuid) = 'admin'
);
