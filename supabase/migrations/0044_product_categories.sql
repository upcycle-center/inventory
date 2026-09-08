-- Categories replace the old ad-hoc "is this liquor/wine" storage-area-name
-- guess for anything accounting-facing: each category carries its own GL
-- Code, and pour-based categories (liquor, wine) get their retail value
-- projected off a per-pour price rather than the bottle's own sale_price,
-- since those aren't sold whole.
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  gl_code text,
  is_pour_based boolean not null default false,
  created_at timestamptz not null default now()
);

alter table product_categories enable row level security;

create policy "product_categories_select" on product_categories for select using (auth.role() = 'authenticated');
create policy "product_categories_write" on product_categories for all using (is_admin()) with check (is_admin());

alter table products add column category_id uuid references product_categories (id) on delete set null;

-- Pour details, only meaningful for a pour-based category's products
-- (e.g. a 750ml bottle poured at 1.5oz for $9/pour) -- null for anything
-- sold whole.
alter table products add column bottle_size_oz numeric(6, 2);
alter table products add column pour_size_oz numeric(6, 2);
alter table products add column pour_price numeric(10, 2);
