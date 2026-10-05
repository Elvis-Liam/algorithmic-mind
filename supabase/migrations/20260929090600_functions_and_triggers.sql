-- Phase 2, migration 7 of 9: role helpers, triggers, audit trail, scheduler.
--
-- Trust model for triggers that guard privileged columns: they only act when
-- a signed in user is present (auth.uid() is not null). The service role, the
-- SQL editor, migrations and seed scripts carry no user, so they pass through.
-- Anonymous visitors never reach these triggers because they hold no write
-- privileges at all (migration 8).

-- ---------------------------------------------------------------------------
-- Role helpers (security definer, so policies can read profiles without
-- recursing into profiles' own policies)
-- ---------------------------------------------------------------------------

-- The caller's role, or null if signed out, inactive or soft deleted.
create function private.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
    and p.deleted_at is null;
$$;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.auth_role()) is not null;
$$;

create function private.is_author_or_above()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.auth_role()) in ('super_admin', 'administrator', 'editor', 'author'), false);
$$;

create function private.is_editor_or_above()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.auth_role()) in ('super_admin', 'administrator', 'editor'), false);
$$;

create function private.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.auth_role()) in ('super_admin', 'administrator'), false);
$$;

create function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.auth_role()) = 'super_admin', false);
$$;

-- ---------------------------------------------------------------------------
-- New users: create an inactive reporter profile
-- ---------------------------------------------------------------------------
-- The role is never read from user metadata, which a visitor controls at
-- sign up. Everyone starts inactive and unprivileged until an administrator
-- activates them.

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_base text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'New user'
  );
  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then
    v_base := 'user';
  end if;

  insert into public.profiles (id, display_name, slug)
  values (
    new.id,
    left(v_name, 120),
    left(v_base, 60) || '-' || substr(replace(new.id::text, '-', ''), 1, 8)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- profiles: stop privilege escalation
-- ---------------------------------------------------------------------------

create function private.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_role public.user_role;
begin
  if v_actor is null then
    return new;
  end if;

  v_actor_role := (select private.auth_role());

  if new.id <> old.id then
    raise exception 'A profile id cannot be changed' using errcode = '42501';
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.deleted_at is distinct from old.deleted_at then
    if v_actor_role is null or v_actor_role not in ('super_admin', 'administrator') then
      raise exception 'Only administrators may change roles or activation' using errcode = '42501';
    end if;
    if v_actor_role <> 'super_admin'
       and (old.role in ('super_admin', 'administrator') or new.role in ('super_admin', 'administrator')) then
      raise exception 'Only a super admin may change administrator or super admin accounts' using errcode = '42501';
    end if;
  end if;

  -- An administrator may not edit another administrator or a super admin.
  if v_actor_role is distinct from 'super_admin'
     and old.id <> v_actor
     and old.role in ('super_admin', 'administrator') then
    raise exception 'Only a super admin may edit administrator or super admin accounts' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_before_guard
  before update on public.profiles
  for each row execute function private.profiles_guard();

-- ---------------------------------------------------------------------------
-- categories: one level of nesting only
-- ---------------------------------------------------------------------------

create function private.categories_enforce_one_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if exists (
      select 1 from public.categories p
      where p.id = new.parent_id and p.parent_id is not null
    ) then
      raise exception 'Categories allow one level of nesting only' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and exists (
      select 1 from public.categories c where c.parent_id = new.id
    ) then
      raise exception 'A category that has children cannot become a child' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_before_one_level
  before insert or update of parent_id on public.categories
  for each row execute function private.categories_enforce_one_level();

-- ---------------------------------------------------------------------------
-- articles
-- ---------------------------------------------------------------------------

-- Only editors may touch placement, indexing and publishing fields. Row level
-- security cannot restrict individual columns, so this trigger does.
create function private.articles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if (select private.is_editor_or_above()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_breaking
       or new.breaking_priority <> 0
       or new.is_top_story
       or new.top_story_start is not null
       or new.top_story_end is not null
       or new.is_featured
       or new.is_editors_pick
       or new.noindex
       or new.published_at is not null
       or new.scheduled_for is not null
       or new.view_count <> 0 then
      raise exception 'Only editors may set placement, indexing or publishing fields' using errcode = '42501';
    end if;
  else
    if new.is_breaking is distinct from old.is_breaking
       or new.breaking_priority is distinct from old.breaking_priority
       or new.is_top_story is distinct from old.is_top_story
       or new.top_story_start is distinct from old.top_story_start
       or new.top_story_end is distinct from old.top_story_end
       or new.is_featured is distinct from old.is_featured
       or new.is_editors_pick is distinct from old.is_editors_pick
       or new.noindex is distinct from old.noindex
       or new.published_at is distinct from old.published_at
       or new.scheduled_for is distinct from old.scheduled_for
       or new.view_count is distinct from old.view_count then
      raise exception 'Only editors may change placement, indexing or publishing fields' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Stamps published_at, computes reading time, and rebuilds the search vector.
create function private.articles_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_plain text;
  v_words integer;
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  v_plain := private.tiptap_plain_text(new.body);

  if tg_op = 'INSERT' or new.body is distinct from old.body then
    v_words := coalesce(array_length(regexp_split_to_array(btrim(v_plain), '\s+'), 1), 0);
    new.reading_time := greatest(1, ceil(v_words / 230.0))::smallint;
  end if;

  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(new.subtitle, '')), 'B')
    || setweight(to_tsvector('english', coalesce(new.excerpt, '')), 'B')
    || setweight(to_tsvector('english', v_plain), 'C');

  return new;
end;
$$;

-- Trigger names sort alphabetically: guard runs before lifecycle.
create trigger articles_before_guard
  before insert or update on public.articles
  for each row execute function private.articles_guard();

create trigger articles_before_lifecycle
  before insert or update on public.articles
  for each row execute function private.articles_lifecycle();

-- Snapshot the body on insert and whenever it changes.
create function private.articles_snapshot_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next integer;
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return null;
  end if;

  select coalesce(max(r.revision_number), 0) + 1
    into v_next
  from public.article_revisions r
  where r.article_id = new.id;

  insert into public.article_revisions (article_id, revision_number, body, editor_id)
  values (new.id, v_next, new.body, (select auth.uid()));

  return null;
end;
$$;

create trigger articles_after_snapshot
  after insert or update of body on public.articles
  for each row execute function private.articles_snapshot_revision();

-- ---------------------------------------------------------------------------
-- events: reject unknown time zone names
-- ---------------------------------------------------------------------------

create function private.events_validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Raises "time zone ... not recognized" for an invalid IANA name.
  perform now() at time zone new.timezone;
  return new;
end;
$$;

create trigger events_before_timezone
  before insert or update of timezone on public.events
  for each row execute function private.events_validate_timezone();

-- ---------------------------------------------------------------------------
-- updated_at on every table that has the column
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'tags', 'topics', 'media',
    'sources', 'scraped_articles',
    'articles', 'article_sources',
    'startups', 'startup_funding_rounds', 'events',
    'products', 'product_reviews', 'product_review_points',
    'story_clusters', 'newsletter_subscribers',
    'ad_slots', 'advertisements', 'site_settings',
    'navigation_items', 'social_links', 'redirects'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------

create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Columns that change on every save or are stored elsewhere (revisions).
  c_noise constant text[] := array['search_vector', 'updated_at', 'body'];
  v_old jsonb;
  v_new jsonb;
  v_diff jsonb;
  v_id text;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new) - c_noise;
    v_diff := v_new;
    v_id := coalesce(v_new ->> 'id', v_new ->> 'key');
  elsif tg_op = 'DELETE' then
    v_old := to_jsonb(old) - c_noise;
    v_diff := v_old;
    v_id := coalesce(v_old ->> 'id', v_old ->> 'key');
  else
    v_old := to_jsonb(old) - c_noise;
    v_new := to_jsonb(new) - c_noise;
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('old', o.value, 'new', n.value)), '{}'::jsonb)
      into v_diff
    from jsonb_each(v_new) n
    left join jsonb_each(v_old) o on o.key = n.key
    where n.value is distinct from o.value;
    v_id := coalesce(v_new ->> 'id', v_new ->> 'key');
    if v_diff = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, diff)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id, v_diff);

  return null;
end;
$$;

-- Newsletter subscribers are deliberately not audited: the diff would copy
-- email addresses into a second table.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'categories', 'articles', 'site_settings', 'redirects',
    'navigation_items', 'social_links', 'ad_slots', 'advertisements',
    'startups', 'events', 'products', 'product_reviews'
  ] loop
    execute format(
      'create trigger audit_row_change after insert or update or delete on public.%I
         for each row execute function private.audit_row_change()', t);
  end loop;
end;
$$;

create function private.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append only' using errcode = '42501';
end;
$$;

create trigger audit_log_no_change
  before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.audit_log_immutable();

-- ---------------------------------------------------------------------------
-- Scheduled publishing
-- ---------------------------------------------------------------------------
-- Flips due scheduled articles to published, stamping the intended time. It is
-- callable only with the service role. Wiring it to a clock (a Cloudflare cron
-- trigger or pg_cron) belongs to the publishing phase; this phase supplies the
-- function and nothing that calls it.

create function public.publish_due_articles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.articles
     set status = 'published',
         published_at = coalesce(published_at, scheduled_for)
   where status = 'scheduled'
     and scheduled_for <= now()
     and deleted_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.publish_due_articles() from public, anon, authenticated;
grant execute on function public.publish_due_articles() to service_role;

-- ---------------------------------------------------------------------------
-- Function privileges in "private"
-- ---------------------------------------------------------------------------
-- Policies run as the calling role, so the role helpers must be executable by
-- anon and authenticated. Nothing in "private" is reachable through the Data
-- API, because that schema is not exposed.

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to anon, authenticated, service_role;

-- The Auth service fires handle_new_user when it inserts into auth.users.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema private to supabase_auth_admin;
    grant execute on function private.handle_new_user() to supabase_auth_admin;
  end if;
end;
$$;
