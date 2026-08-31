-- Each physical location has a 3-digit code used to match it to the
-- corresponding location record in Yellow Dog on CSV import.

alter table locations add column yellow_dog_code text;

alter table locations add constraint locations_yellow_dog_code_format
  check (yellow_dog_code is null or yellow_dog_code ~ '^[0-9]{3}$');

create unique index locations_yellow_dog_code_unique
  on locations (yellow_dog_code) where yellow_dog_code is not null;
