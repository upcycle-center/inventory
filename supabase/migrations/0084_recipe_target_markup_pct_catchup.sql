-- Catch-up script: migrations 0081-0083 were never actually applied --
-- the live column was still named target_pour_cost_pct. This renames
-- whichever of the old names is currently present (handles either
-- starting point) straight to target_markup_pct, and sets every
-- recipe to the 500% default, since no recipe has ever had a
-- legitimately-saved custom value under any of the old names.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'recipes' and column_name = 'target_pour_cost_pct'
  ) then
    alter table recipes rename column target_pour_cost_pct to target_markup_pct;
  elsif exists (
    select 1 from information_schema.columns
    where table_name = 'recipes' and column_name = 'target_profit_pct'
  ) then
    alter table recipes rename column target_profit_pct to target_markup_pct;
  end if;
end $$;

alter table recipes alter column target_markup_pct set default 500;
update recipes set target_markup_pct = 500;
