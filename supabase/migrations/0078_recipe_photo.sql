-- A photo of the finished drink, for visual reference -- reuses the
-- existing public product-photos bucket rather than a dedicated one.
alter table recipes add column if not exists photo_url text;
