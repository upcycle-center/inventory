-- Liquor bottles are sold in mL (1L, 750ml, 375ml), not oz -- rename and
-- convert any values already entered under the old oz column so TOT
-- Retail's pours-per-bottle math keeps working (pour_size_oz stays oz,
-- since US pours are conventionally specified that way).
alter table products rename column bottle_size_oz to bottle_size_ml;
update products set bottle_size_ml = round(bottle_size_ml * 29.5735, 2) where bottle_size_ml is not null;
