-- product-photos bucket is public-read (created via Management API); these
-- policies control who can write into it.

create policy "product_photos_public_read"
on storage.objects for select
using (bucket_id = 'product-photos');

create policy "product_photos_warehouse_write"
on storage.objects for insert
with check (bucket_id = 'product-photos' and is_warehouse());

create policy "product_photos_warehouse_update"
on storage.objects for update
using (bucket_id = 'product-photos' and is_warehouse());

create policy "product_photos_admin_delete"
on storage.objects for delete
using (bucket_id = 'product-photos' and is_admin());
