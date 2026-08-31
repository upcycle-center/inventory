insert into storage_areas (code, name, sort_order)
values ('SF', 'Soda Fridge', (select coalesce(max(sort_order), 0) + 1 from storage_areas));
