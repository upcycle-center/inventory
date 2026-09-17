-- Certification types now support a Roster-facing detail page: a
-- description field, plus seeding the two certifications called out for
-- Roster roles (T.E.A.M for Bartender, ServeSafe for Server Food) so the
-- Roster page's Certified badge works without any manual setup.

alter table certification_types add column if not exists description text;

insert into certification_types (name, description, sort_order, applicable_roles)
select
  'T.E.A.M',
  'Required for alcohol service.',
  (select coalesce(max(sort_order), 0) + 1 from certification_types),
  array['Bartender']
where not exists (select 1 from certification_types where name = 'T.E.A.M');

insert into certification_types (name, description, sort_order, applicable_roles)
select
  'ServeSafe',
  'Required for food handling.',
  (select coalesce(max(sort_order), 0) + 1 from certification_types),
  array['Server Food']
where not exists (select 1 from certification_types where name = 'ServeSafe');
