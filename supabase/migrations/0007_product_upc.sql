-- SKU is the internal code (required, drives the auto-generated cheat-sheet
-- barcode). UPC is the real manufacturer barcode, optional, added when known
-- (e.g. from a supplier invoice) so warehouse receiving can eventually scan
-- the actual delivered product/case, not just the cheat sheet.

alter table products add column upc text;

alter table products add constraint products_upc_unique unique (upc);
