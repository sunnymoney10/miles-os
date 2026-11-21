-- ========== utilities ==========
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ========== profiles ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, ''), '@', 1), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ========== children ==========
create table public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid(),
  nickname text not null check (char_length(nickname) between 1 and 40),
  age_band text not null check (age_band in ('3-5', '6-8', '9-12', '13-15')),
  interests text[] not null default '{}',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index children_parent_idx on public.children(parent_id);
grant select, insert, update, delete on public.children to authenticated;
grant all on public.children to service_role;
alter table public.children enable row level security;
create policy "Parents manage their own children" on public.children
  for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());
create trigger children_updated_at before update on public.children for each row execute function public.set_updated_at();

create or replace function public.owns_child(_child_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.children where id = _child_id and parent_id = auth.uid())
$$;

-- ========== consents ==========
create type public.consent_type as enum ('profile_storage', 'ai_plan_generation', 'media_storage', 'family_circle_sharing');

create table public.child_consents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null default auth.uid(),
  consent_type public.consent_type not null,
  granted boolean not null default false,
  policy_version text not null default '2026-11-mvp',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, consent_type)
);
grant select, insert, update, delete on public.child_consents to authenticated;
grant all on public.child_consents to service_role;
alter table public.child_consents enable row level security;
create policy "Parents manage consents for their children" on public.child_consents
  for all to authenticated
  using (parent_id = auth.uid() and public.owns_child(child_id))
  with check (parent_id = auth.uid() and public.owns_child(child_id));
create trigger child_consents_updated_at before update on public.child_consents for each row execute function public.set_updated_at();

create or replace function public.has_consent(_child_id uuid, _type public.consent_type)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select granted from public.child_consents where child_id = _child_id and consent_type = _type), false)
$$;

-- ========== authorization log (append-only) ==========
create table public.authorization_log (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid(),
  child_id uuid references public.children(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index authorization_log_parent_idx on public.authorization_log(parent_id, created_at desc);
grant select, insert on public.authorization_log to authenticated;
grant all on public.authorization_log to service_role;
alter table public.authorization_log enable row level security;
create policy "Parents read their own records" on public.authorization_log
  for select to authenticated using (parent_id = auth.uid());
create policy "Parents add their own records" on public.authorization_log
  for insert to authenticated
  with check (parent_id = auth.uid() and (child_id is null or public.owns_child(child_id)));

create or replace function public.log_consent_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.granted is distinct from old.granted then
    insert into public.authorization_log (parent_id, child_id, action, subject_type, subject_id, details)
    values (new.parent_id, new.child_id,
      case when new.granted then 'consent_granted' else 'consent_withheld' end,
      'consent', new.id,
      jsonb_build_object('consent_type', new.consent_type, 'policy_version', new.policy_version));
  end if;
  return new;
end $$;
create trigger child_consents_log after insert or update on public.child_consents for each row execute function public.log_consent_change();

-- ========== inspirations ==========
create table public.inspirations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null default auth.uid(),
  kind text not null check (kind in ('text', 'url')),
  prompt text not null check (char_length(prompt) between 1 and 1000),
  source_url text check (source_url is null or (source_url ~* '^https?://' and char_length(source_url) <= 2000)),
  created_at timestamptz not null default now()
);
create index inspirations_child_idx on public.inspirations(child_id, created_at desc);
grant select, insert, update, delete on public.inspirations to authenticated;
grant all on public.inspirations to service_role;
alter table public.inspirations enable row level security;
create policy "Parents manage inspirations for their children" on public.inspirations
  for all to authenticated
  using (parent_id = auth.uid() and public.owns_child(child_id))
  with check (parent_id = auth.uid() and public.owns_child(child_id));

-- ========== plans ==========
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null default auth.uid(),
  inspiration_id uuid references public.inspirations(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  what_if text not null default '',
  steps jsonb not null default '[]'::jsonb,
  materials text[] not null default '{}',
  grown_up_notes text not null default '',
  source text not null check (source in ('ai', 'demo_template')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'completed', 'archived')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plans_child_idx on public.plans(child_id, created_at desc);
grant select, insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "Parents manage plans for their children" on public.plans
  for all to authenticated
  using (parent_id = auth.uid() and public.owns_child(child_id))
  with check (parent_id = auth.uid() and public.owns_child(child_id));
create trigger plans_updated_at before update on public.plans for each row execute function public.set_updated_at();

create or replace function public.plans_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    -- New plans always start as drafts; approval is an explicit later step.
    new.status := 'draft';
    new.approved_at := null;
    return new;
  end if;
  -- Content edits to an approved plan send it back for re-approval.
  if old.status = 'approved' and new.status = 'approved'
     and (new.title is distinct from old.title or new.steps is distinct from old.steps
          or new.materials is distinct from old.materials or new.what_if is distinct from old.what_if) then
    new.status := 'draft';
  end if;
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at := now();
  elsif new.status = 'draft' then
    new.approved_at := null;
  end if;
  if new.status = 'completed' and old.status not in ('approved', 'completed') then
    raise exception 'A plan must be approved by the parent before it can be completed';
  end if;
  return new;
end $$;
create trigger plans_guard_trg before insert or update on public.plans for each row execute function public.plans_guard();

create or replace function public.plans_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'completed') then
    insert into public.authorization_log (parent_id, child_id, action, subject_type, subject_id, details)
    values (new.parent_id, new.child_id,
      case when new.status = 'approved' then 'plan_approved' else 'plan_completed' end,
      'plan', new.id, jsonb_build_object('title', new.title, 'source', new.source));
  end if;
  return new;
end $$;
create trigger plans_log_trg after update on public.plans for each row execute function public.plans_log();

-- ========== family circle ==========
create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid(),
  display_name text not null check (char_length(display_name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  relationship text not null default 'family' check (char_length(relationship) between 1 and 40),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invite_token uuid not null default gen_random_uuid() unique,
  member_user_id uuid,
  delivery text not null default 'link_only' check (delivery in ('link_only')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (parent_id, email)
);
create index circle_members_member_idx on public.circle_members(member_user_id);
grant select, insert, update, delete on public.circle_members to authenticated;
grant all on public.circle_members to service_role;
alter table public.circle_members enable row level security;
create policy "Parents manage their circle" on public.circle_members
  for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());
create policy "Members see their own membership" on public.circle_members
  for select to authenticated
  using (member_user_id = auth.uid());

create or replace function public.circle_members_guard()
returns trigger language plpgsql set search_path = public as $$
declare _accepting boolean := coalesce(current_setting('miles.accepting_invite', true), '') = 'on';
begin
  new.email := lower(trim(new.email));
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.member_user_id := null;
    new.accepted_at := null;
    return new;
  end if;
  if not _accepting then
    if new.member_user_id is distinct from old.member_user_id then
      raise exception 'Membership can only be linked by the invitee accepting the invitation';
    end if;
    if new.status = 'accepted' and old.status <> 'accepted' then
      raise exception 'Only the invitee can accept an invitation';
    end if;
    if new.invite_token is distinct from old.invite_token then
      raise exception 'Invitation token cannot be changed';
    end if;
  end if;
  return new;
end $$;
create trigger circle_members_guard_trg before insert or update on public.circle_members for each row execute function public.circle_members_guard();

create or replace function public.is_circle_member_of(_parent_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_members
    where parent_id = _parent_id and member_user_id = auth.uid() and status = 'accepted'
  )
$$;

create or replace function public.accept_circle_invite(_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _row public.circle_members;
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into _row from public.circle_members where invite_token = _token;
  if not found or _row.status = 'revoked' then
    raise exception 'Invitation not found or no longer active';
  end if;
  if _row.parent_id = auth.uid() then
    raise exception 'You cannot accept your own invitation';
  end if;
  if _row.email <> _email then
    raise exception 'This invitation was created for a different email address';
  end if;
  perform set_config('miles.accepting_invite', 'on', true);
  update public.circle_members
    set status = 'accepted', member_user_id = auth.uid(), accepted_at = now()
    where id = _row.id;
  perform set_config('miles.accepting_invite', 'off', true);
  insert into public.authorization_log (parent_id, action, subject_type, subject_id, details)
  values (_row.parent_id, 'circle_invite_accepted', 'circle_member', _row.id, jsonb_build_object('display_name', _row.display_name));
  return _row.id;
end $$;
revoke execute on function public.accept_circle_invite(uuid) from public, anon;
grant execute on function public.accept_circle_invite(uuid) to authenticated;

-- Profiles policies (defined after circle helper)
create policy "Own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Circle members read inviter profile" on public.profiles for select to authenticated using (public.is_circle_member_of(id));
create policy "Own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ========== journal ==========
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null default auth.uid(),
  plan_id uuid references public.plans(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  reflection text not null default '',
  child_words text not null default '',
  shared_with_circle boolean not null default false,
  shared_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journal_entries_child_idx on public.journal_entries(child_id, created_at desc);
grant select, insert, update, delete on public.journal_entries to authenticated;
grant all on public.journal_entries to service_role;
alter table public.journal_entries enable row level security;
create policy "Parents manage journal for their children" on public.journal_entries
  for all to authenticated
  using (parent_id = auth.uid() and public.owns_child(child_id))
  with check (parent_id = auth.uid() and public.owns_child(child_id));
create policy "Circle members read parent-approved entries" on public.journal_entries
  for select to authenticated
  using (shared_with_circle = true and public.is_circle_member_of(parent_id));
create trigger journal_entries_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();

create or replace function public.journal_share_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare _was_shared boolean := case when tg_op = 'UPDATE' then old.shared_with_circle else false end;
begin
  if new.shared_with_circle and not _was_shared then
    if not public.has_consent(new.child_id, 'family_circle_sharing') then
      raise exception 'Family circle sharing consent is required before sharing';
    end if;
    new.shared_approved_at := now();
  elsif not new.shared_with_circle then
    new.shared_approved_at := null;
  end if;
  return new;
end $$;
create trigger journal_share_guard_trg before insert or update on public.journal_entries for each row execute function public.journal_share_guard();

create or replace function public.journal_share_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare _was_shared boolean := case when tg_op = 'UPDATE' then old.shared_with_circle else false end;
begin
  if new.shared_with_circle is distinct from _was_shared then
    insert into public.authorization_log (parent_id, child_id, action, subject_type, subject_id, details)
    values (new.parent_id, new.child_id,
      case when new.shared_with_circle then 'entry_shared_with_circle' else 'entry_unshared' end,
      'journal_entry', new.id, jsonb_build_object('title', new.title));
  end if;
  return new;
end $$;
create trigger journal_share_log_trg after insert or update on public.journal_entries for each row execute function public.journal_share_log();

create table public.journal_media (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null default auth.uid(),
  storage_path text not null unique,
  mime_type text not null check (mime_type ~ '^(image|audio|video)/'),
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index journal_media_entry_idx on public.journal_media(entry_id);
grant select, insert, update, delete on public.journal_media to authenticated;
grant all on public.journal_media to service_role;
alter table public.journal_media enable row level security;
create policy "Parents manage media for their children" on public.journal_media
  for all to authenticated
  using (parent_id = auth.uid() and public.owns_child(child_id))
  with check (parent_id = auth.uid() and public.owns_child(child_id));
create policy "Circle members read media of shared entries" on public.journal_media
  for select to authenticated
  using (
    public.is_circle_member_of(parent_id)
    and exists (select 1 from public.journal_entries e where e.id = entry_id and e.shared_with_circle)
  );

create or replace function public.journal_media_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_consent(new.child_id, 'media_storage') then
    raise exception 'Private media consent is required before saving photos or recordings';
  end if;
  if not exists (select 1 from public.journal_entries e where e.id = new.entry_id and e.child_id = new.child_id and e.parent_id = new.parent_id) then
    raise exception 'Media must belong to a journal entry for the same child';
  end if;
  if split_part(new.storage_path, '/', 1) <> new.parent_id::text or split_part(new.storage_path, '/', 2) <> new.child_id::text then
    raise exception 'Media path must be inside the family folder';
  end if;
  return new;
end $$;
create trigger journal_media_guard_trg before insert on public.journal_media for each row execute function public.journal_media_guard();

-- ========== storage helpers & policies ==========
create or replace function public.can_upload_journal_media(_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare _child uuid;
begin
  if split_part(_name, '/', 1) <> coalesce(auth.uid()::text, '') then return false; end if;
  begin
    _child := split_part(_name, '/', 2)::uuid;
  exception when others then
    return false;
  end;
  return public.owns_child(_child) and public.has_consent(_child, 'media_storage');
end $$;

create or replace function public.can_view_journal_media(_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select split_part(_name, '/', 1) = coalesce(auth.uid()::text, '')
    or exists (
      select 1 from public.journal_media m
      join public.journal_entries e on e.id = m.entry_id
      where m.storage_path = _name and e.shared_with_circle and public.is_circle_member_of(m.parent_id)
    )
$$;

create policy "Parents upload family journal media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'journal-media' and public.can_upload_journal_media(name));
create policy "Parents and approved circle view journal media" on storage.objects
  for select to authenticated
  using (bucket_id = 'journal-media' and public.can_view_journal_media(name));
create policy "Parents delete family journal media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'journal-media' and split_part(name, '/', 1) = auth.uid()::text);

-- ========== sample family (runs as the caller; RLS applies) ==========
create or replace function public.create_sample_child()
returns uuid language plpgsql security invoker set search_path = public as $$
declare _child uuid; _insp uuid; _plan uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.children (nickname, age_band, interests, is_sample)
  values ('Sample: Robin', '6-8', array['dinosaurs', 'building', 'drawing'], true)
  returning id into _child;
  insert into public.child_consents (child_id, consent_type, granted) values
    (_child, 'profile_storage', true),
    (_child, 'ai_plan_generation', false),
    (_child, 'media_storage', false),
    (_child, 'family_circle_sharing', false);
  insert into public.inspirations (child_id, kind, prompt)
  values (_child, 'text', 'What if a dinosaur needed a house in our living room?')
  returning id into _insp;
  insert into public.plans (child_id, inspiration_id, title, what_if, steps, materials, grown_up_notes, source)
  values (_child, _insp, 'A cardboard den for a sleepy dinosaur',
    'What if a dinosaur needed a house in our living room?',
    '[{"id":"s1","phase":"wonder","text":"Imagine the dinosaur: how big is it? What does it like to sleep on?"},
      {"id":"s2","phase":"explore","text":"Gather boxes, blankets and tape. Try building a doorway the dinosaur fits through."},
      {"id":"s3","phase":"explore","text":"Test it with a toy dinosaur. Does the roof stay up? What could make it stronger?"},
      {"id":"s4","phase":"show","text":"Give a tour of the den and tell the story of who lives there."}]'::jsonb,
    array['Cardboard boxes', 'Old blanket', 'Masking tape', 'Toy dinosaur'],
    'Sample data. There is no right answer — follow the child''s ideas, even when the den falls down.',
    'demo_template')
  returning id into _plan;
  insert into public.authorization_log (child_id, action, subject_type, subject_id, details)
  values (_child, 'sample_profile_created', 'child', _child, jsonb_build_object('note', 'Sample data created by parent'));
  return _child;
end $$;
revoke execute on function public.create_sample_child() from public, anon;
grant execute on function public.create_sample_child() to authenticated;