-- Phase 3: authentication and authorization support.
-- 1. Preconditions on the Phase 2 schema (fail loudly, do not guess).
-- 2. Automatic profile creation on new auth user, lowest role, inactive.
-- 3. audit_events: append only log of semantic events (sign in, role change, publish, delete).
-- 4. Postgres backed rate limiter for the password path.

create schema if not exists private;

-- 1. Preconditions ---------------------------------------------------------
do $$
declare
  v_missing_cols text[];
  v_missing_roles text[];
begin
  select array_agg(c) into v_missing_cols
  from unnest(array['id', 'display_name', 'slug', 'role', 'is_active']) as c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = c
  );
  if v_missing_cols is not null then
    raise exception 'Phase 3 precondition failed: public.profiles is missing columns %', v_missing_cols;
  end if;

  select array_agg(l) into v_missing_roles
  from unnest(array['reporter', 'author', 'editor', 'administrator', 'super_admin']) as l
  where not exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_enum e on e.enumtypid = a.atttypid
    where n.nspname = 'public' and c.relname = 'profiles'
      and a.attname = 'role' and e.enumlabel = l
  );
  if v_missing_roles is not null then
    raise exception 'Phase 3 precondition failed: profiles.role enum has no label(s) %. Align lib/auth/permissions.ts and this file with the real labels.', v_missing_roles;
  end if;
end $$;

-- 2. Profile creation trigger ----------------------------------------------
-- Role and activation are hard coded. Client controlled metadata is used for
-- the display name only and is never read for role or is_active.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_base text;
begin
  v_name := nullif(btrim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  )), '');
  v_name := regexp_replace(coalesce(v_name, 'New user'), '[[:cntrl:]]', '', 'g');
  v_name := left(coalesce(nullif(btrim(v_name), ''), 'New user'), 80);
  v_base := btrim(regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'), '-');

  insert into public.profiles (id, display_name, slug, role, is_active)
  values (
    new.id,
    v_name,
    coalesce(nullif(v_base, ''), 'user') || '-' || substr(new.id::text, 1, 8),
    'reporter',
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
declare
  t record;
begin
  for t in
    select tgname from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and not tgisinternal
      and tgfoid::regproc::text like '%handle_new_user'
  loop
    execute format('drop trigger %I on auth.users', t.tgname);
  end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- 3. audit_events ----------------------------------------------------------
-- Separate from the Phase 2 field level diff log. This table records who did
-- what. actor_id has no foreign key on purpose: a cascading update on user
-- deletion would be refused by the append only trigger below.
create table public.audit_events (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,
  action      text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb
);

create index audit_events_occurred_at_idx on public.audit_events (occurred_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id, occurred_at desc);
create index audit_events_action_idx on public.audit_events (action, occurred_at desc);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id);

create or replace function private.audit_events_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_events is append only';
end;
$$;

create trigger audit_events_no_update_delete
  before update or delete on public.audit_events
  for each row execute function private.audit_events_append_only();

create trigger audit_events_no_truncate
  before truncate on public.audit_events
  for each statement execute function private.audit_events_append_only();

alter table public.audit_events enable row level security;

create policy audit_events_admin_read on public.audit_events
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active
        and p.role::text in ('administrator', 'super_admin')
    )
  );

revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;

create or replace function public.record_audit_event(
  p_actor_id    uuid,
  p_action      text,
  p_entity_type text,
  p_entity_id   text default null,
  p_metadata    jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_events (actor_id, action, entity_type, entity_id, metadata)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

revoke all on function public.record_audit_event(uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_audit_event(uuid, text, text, text, jsonb)
  to service_role;

-- 4. Rate limiter ----------------------------------------------------------
-- Fixed window counter. Serverless isolates share no memory, so the counter
-- lives in Postgres. Reachable only through the service role.
create table public.rate_limit_hits (
  bucket       text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, window_start)
);

create index rate_limit_hits_window_idx on public.rate_limit_hits (window_start);

alter table public.rate_limit_hits enable row level security;
create policy rate_limit_hits_no_direct_access on public.rate_limit_hits
  for all to anon, authenticated
  using (false) with check (false);
revoke all on public.rate_limit_hits from anon, authenticated;

create or replace function public.check_rate_limit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits   integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limit_hits as r (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  -- Opportunistic cleanup, roughly one call in fifty.
  if random() < 0.02 then
    delete from public.rate_limit_hits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer)
  to service_role;

-- Final guard, same rule as Phase 2: no table without RLS.
do $$
declare
  v_bad text[];
begin
  select array_agg(c.relname) into v_bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('audit_events', 'rate_limit_hits')
    and not c.relrowsecurity;
  if v_bad is not null then
    raise exception 'RLS missing on %', v_bad;
  end if;
end $$;
