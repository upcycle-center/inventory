-- Generic "save for later" draft storage shared by the Request, Transfer,
-- and Return forms. One draft per user per action type (upsert on
-- user_id+type) -- the Overview button for that action turns colored while
-- a draft exists, and clears once the real record is posted and the draft
-- is deleted.
create type action_draft_type as enum ('request', 'transfer', 'return');

create table action_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type action_draft_type not null,
  form_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, type)
);

alter table action_drafts enable row level security;

create policy "action_drafts_own" on action_drafts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
