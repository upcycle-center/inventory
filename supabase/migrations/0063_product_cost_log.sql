-- Logs every case_cost change on a product (manual edit or CSV upload) so
-- the price actually paid can be compared against the standing cost that
-- was on file before it changed -- a lightweight cost-variance trail that
-- doesn't require a real Receiving workflow (not built yet) to exist.

create table product_cost_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  previous_cost numeric,
  new_cost numeric not null,
  variance numeric,
  variance_pct numeric,
  source text not null,
  changed_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on product_cost_log (product_id);
create index on product_cost_log (created_at);

alter table product_cost_log enable row level security;

create policy "product_cost_log_select_all" on product_cost_log for select using (auth.role() = 'authenticated');
create policy "product_cost_log_admin_write" on product_cost_log for all using (is_admin()) with check (is_admin());
