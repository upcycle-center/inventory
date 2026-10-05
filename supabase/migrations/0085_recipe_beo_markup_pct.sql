-- A second markup %, separate from the retail Target Markup% -- used to
-- price a recipe for Catering client invoicing via a BEO (Banquet Event
-- Order). Same markup-of-cost formula, own column so it can be tuned
-- independently. Defaults to 300%.
alter table recipes add column if not exists beo_markup_pct numeric(6, 2) not null default 300;
