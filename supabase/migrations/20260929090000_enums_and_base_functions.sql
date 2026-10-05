-- Phase 2, migration 1 of 9: private schema, enums, base functions.
--
-- Creates the "private" schema (never exposed through the Data API), every
-- enum type, and the two utility functions later migrations depend on.
-- No tables are created here.

create schema if not exists private;

-- The Data API only serves the schemas listed under [api] in
-- supabase/config.toml (public by default). "private" must never be added.
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Lock the door before any table exists. Tables created in "public" from this
-- point on grant nothing to the API roles; migration 8 writes each grant out
-- explicitly, so a forgotten grant fails closed instead of open.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Declared from most to least privileged, matching the brief. Comparisons in
-- policies always name roles explicitly and never rely on enum ordering.
create type public.user_role as enum (
  'super_admin',
  'administrator',
  'editor',
  'author',
  'reporter'
);

create type public.article_status as enum (
  'draft',
  'review',
  'approved',
  'scheduled',
  'published',
  'archived'
);

-- Named geo_scope, not geography, because "geography" is a PostGIS type name
-- and would collide the day PostGIS is enabled. The column is still called
-- geography, as the brief specifies.
create type public.geo_scope as enum (
  'kenya',
  'africa',
  'worldwide',
  'none'
);

create type public.event_mode as enum (
  'online',
  'in_person',
  'hybrid'
);

create type public.subscriber_status as enum (
  'pending',
  'confirmed',
  'unsubscribed',
  'bounced',
  'complained'
);

create type public.source_kind as enum (
  'news_report',
  'press_release',
  'official_blog',
  'blog_post',
  'documentation',
  'changelog',
  'research_paper',
  'code_repository',
  'social_post',
  'dataset',
  'other'
);

create type public.funding_round_type as enum (
  'grant',
  'pre_seed',
  'seed',
  'series_a',
  'series_b',
  'series_c_plus',
  'debt',
  'acquisition',
  'other'
);

create type public.review_point_kind as enum (
  'pro',
  'con'
);

create type public.scrape_status as enum (
  'new',
  'reviewed',
  'used',
  'rejected',
  'duplicate'
);

create type public.cluster_status as enum (
  'open',
  'assigned',
  'published',
  'dismissed'
);

create type public.navigation_area as enum (
  'header',
  'footer',
  'legal'
);

-- ---------------------------------------------------------------------------
-- Base functions
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Extracts the visible text from a TipTap (ProseMirror) JSON document by
-- walking every "content" array and collecting each "text" leaf. Used to build
-- the full text search vector and the reading time. Order is breadth first,
-- which is fine for both uses (neither depends on word order).
create function private.tiptap_plain_text(doc jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  with recursive walk(node) as (
    select doc
    union all
    select child.value
    from walk
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(walk.node -> 'content') = 'array' then walk.node -> 'content'
        else '[]'::jsonb
      end
    ) as child
  )
  select coalesce(string_agg(walk.node ->> 'text', ' '), '')
  from walk
  where jsonb_typeof(walk.node -> 'text') = 'string';
$$;
