-- PO Request flow: when Warehouse can't fully pull a Recipe Request's
-- pick list (an ingredient is out of stock), they flag the missing
-- ingredient(s) -- this creates/adds to a Purchase Order for that
-- ingredient's supplier (status 'requested', i.e. "needs to be ordered"
-- -- distinct from 'placed', which means it's actually been sent to the
-- supplier) and marks the Recipe Request 'partial' instead of silently
-- losing track of what's still owed.
alter type po_status add value if not exists 'requested';
alter type recipe_request_status add value if not exists 'partial';

create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity_oz numeric(10, 3),
  note text,
  -- Traceability back to the Recipe Request that triggered this item, if
  -- any -- null for a manually-added PO line.
  recipe_request_id uuid references recipe_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table purchase_order_items enable row level security;

create policy "purchase_order_items_select" on purchase_order_items for select using (auth.role() = 'authenticated');
create policy "purchase_order_items_write" on purchase_order_items for all using (is_warehouse()) with check (is_warehouse());
