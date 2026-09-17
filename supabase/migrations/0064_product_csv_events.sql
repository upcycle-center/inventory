-- A running log of every product CSV upload and download on the Bulk
-- Upload page. Uploads keep a copy of the actual file in the
-- product-csv-uploads Storage bucket (create it manually in the
-- Supabase dashboard -- Storage -> New bucket -> "product-csv-uploads",
-- NOT public, same as this migration can't create it via SQL);
-- downloads (template/export) are just an audit entry since they're
-- trivially regenerable.

create table product_csv_events (
  id uuid primary key default gen_random_uuid(),
  direction text not null,
  kind text not null,
  filename text,
  storage_path text,
  result_message text,
  performed_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on product_csv_events (created_at);

alter table product_csv_events enable row level security;

create policy "product_csv_events_select_all" on product_csv_events for select using (auth.role() = 'authenticated');
create policy "product_csv_events_admin_write" on product_csv_events for all using (is_admin()) with check (is_admin());

-- Requires the product-csv-uploads bucket to already exist (created
-- manually -- see note above); these policies just control access to it,
-- same pattern as 0003_storage_policies.sql for product-photos.
create policy "product_csv_uploads_admin_read"
on storage.objects for select
using (bucket_id = 'product-csv-uploads' and is_admin());

create policy "product_csv_uploads_admin_write"
on storage.objects for insert
with check (bucket_id = 'product-csv-uploads' and is_admin());

create policy "product_csv_uploads_admin_delete"
on storage.objects for delete
using (bucket_id = 'product-csv-uploads' and is_admin());
