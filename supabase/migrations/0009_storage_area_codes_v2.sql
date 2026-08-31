-- Move to a consistent 3-letter storage-area code system. Renames existing
-- rows in place (preserves FK references from location_products) and adds
-- the new Dry Storage area.

update storage_areas set code = 'FWN', name = 'Fridge Wine' where code = 'WF';
update storage_areas set code = 'FBR', name = 'Fridge Beer' where code = 'BF';
update storage_areas set code = 'CLQ', name = 'Cage Liquor' where code = 'LC';
update storage_areas set code = 'CBR', name = 'Cage Beer' where code = 'BC';
update storage_areas set code = 'DSP', name = 'Disposables' where code = 'DS';
update storage_areas set code = 'CLN', name = 'Cleaning' where code = 'CL';
update storage_areas set code = 'MIX', name = 'Mixers' where code = 'MX';
update storage_areas set code = 'DFK', name = 'Draft Keg' where code = 'DK';
update storage_areas set code = 'SVN', name = 'Souvenir' where code = 'SV';
update storage_areas set code = 'WIC', name = 'Walk-in Cooler' where code = 'WC';
update storage_areas set code = 'OTH', name = 'Other' where code = 'OT';
update storage_areas set code = 'FSD', name = 'Fridge Soda' where code = 'SF';

insert into storage_areas (code, name, sort_order)
values ('DRY', 'Dry Storage', (select coalesce(max(sort_order), 0) + 1 from storage_areas));
