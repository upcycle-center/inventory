-- Default Target Markup % changes from 400 to 500 -- applied to
-- existing recipes too, since this feature is brand new today and no
-- recipe has a legitimately-saved custom value yet.
alter table recipes alter column target_markup_pct set default 500;
update recipes set target_markup_pct = 500;
