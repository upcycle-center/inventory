-- Grant Kitchen and Catering managers the same broad, unrestricted access
-- as Warehouse (any location, no event assignment required) by folding
-- them into is_warehouse(). Split into its own migration since the new
-- enum values from 0014 can't be referenced in the same transaction they
-- were added in.

create or replace function is_warehouse() returns boolean
language sql stable security definer as $$
  select current_user_role() in ('admin', 'warehouse', 'kitchen', 'catering');
$$;
