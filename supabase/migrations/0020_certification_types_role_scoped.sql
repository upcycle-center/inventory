-- Certification types are now scoped to which roles they're relevant for
-- (null/empty = applies to everyone). Certified Alcohol replaces Certified
-- Bartender as the Stand Staff cert (merging any existing records so no
-- data is lost), and a new Forklift Certification is added for Warehouse
-- and Operations.

alter table certification_types add column applicable_roles text[];

-- Merge: anyone with Certified Bartender but not already Certified Alcohol
-- gets an Alcohol record carrying over their existing dates.
insert into user_certifications (user_id, certification_type_id, certified_at, expires_at, created_at)
select uc.user_id, alcohol.id, uc.certified_at, uc.expires_at, uc.created_at
from user_certifications uc
join certification_types bartender on bartender.id = uc.certification_type_id and bartender.name = 'Certified Bartender'
cross join lateral (select id from certification_types where name = 'Certified Alcohol') as alcohol
where not exists (
  select 1 from user_certifications uc2
  join certification_types alcohol2 on alcohol2.id = uc2.certification_type_id
  where alcohol2.name = 'Certified Alcohol' and uc2.user_id = uc.user_id
);

delete from certification_types where name = 'Certified Bartender';

update location_staff_roles set required_certification = 'Certified Alcohol' where required_certification = 'Certified Bartender';

update certification_types set applicable_roles = array['stand_lead'] where name in ('Certified Alcohol', 'Certified Food');

insert into certification_types (name, sort_order, applicable_roles)
values ('Forklift Certification', (select coalesce(max(sort_order), 0) + 1 from certification_types), array['warehouse', 'ops']);
