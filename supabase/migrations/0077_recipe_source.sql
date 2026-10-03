-- Reference info for a recipe found online: the source URL, and the
-- original ingredients/ratios as published, kept on file separately from
-- the venue's own (possibly adjusted) ingredient list above.
alter table recipes add column if not exists source_url text;
alter table recipes add column if not exists original_recipe text;
