-- Phase 2, migration 2 of 9: profiles, categories, tags, topics, media.
--
-- Conventions used in every table migration:
--   * uuid primary keys with gen_random_uuid() (core in Postgres 13 and later)
--   * created_at / updated_at as timestamptz, updated_at kept by a trigger
--   * deleted_at where a soft delete matters (content a human may want back)
--   * one column per line, constraints at the bottom, so the TypeScript types
--     can be regenerated from this file by a simple parser if needed

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'reporter',
  -- New accounts are inactive and hold no privileges until an administrator
  -- activates them. This keeps an open sign-up from granting staff access.
  is_active boolean not null default false,
  display_name text not null,
  slug text not null,
  avatar_media_id uuid,
  bio text,
  specialization text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_slug_key unique (slug),
  constraint profiles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 120),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 1000),
  constraint profiles_social_links_is_object check (jsonb_typeof(social_links) = 'object')
);

create index profiles_role_idx on public.profiles (role) where deleted_at is null;
create index profiles_avatar_media_idx on public.profiles (avatar_media_id) where avatar_media_id is not null;

-- ---------------------------------------------------------------------------
-- categories: one level of nesting (enforced by a trigger in migration 7)
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  parent_id uuid references public.categories (id) on delete restrict,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_key unique (slug),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint categories_not_own_parent check (parent_id is null or parent_id <> id),
  constraint categories_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint categories_seo_title_length check (seo_title is null or char_length(seo_title) <= 120),
  constraint categories_seo_description_length check (seo_description is null or char_length(seo_description) <= 320)
);

create index categories_parent_sort_idx on public.categories (parent_id, sort_order);
-- A name may repeat under different parents, never within the same parent.
create unique index categories_parent_name_key
  on public.categories (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- ---------------------------------------------------------------------------
-- tags and topics
-- ---------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_slug_key unique (slug),
  constraint tags_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tags_name_length check (char_length(btrim(name)) between 1 and 60)
);

create unique index tags_name_key on public.tags (lower(name));

-- Topics are the nodes of the topical graph. Edges are derived from articles
-- that share topics (article_topics), so no separate edge table is needed yet.
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_slug_key unique (slug),
  constraint topics_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint topics_name_length check (char_length(btrim(name)) between 1 and 80)
);

create unique index topics_name_key on public.topics (lower(name));

-- ---------------------------------------------------------------------------
-- media: Cloudinary assets
-- ---------------------------------------------------------------------------

create table public.media (
  id uuid primary key default gen_random_uuid(),
  public_id text not null,
  url text not null,
  width integer,
  height integer,
  format text,
  bytes bigint,
  -- Alt text is mandatory unless the image is explicitly marked decorative.
  alt text not null default '',
  is_decorative boolean not null default false,
  caption text,
  credit text,
  source text,
  license text,
  -- Focal point as two normalised coordinates (0 to 1), used for crops.
  focal_x numeric(4, 3),
  focal_y numeric(4, 3),
  folder text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint media_public_id_key unique (public_id),
  constraint media_url_https check (url ~ '^https://'),
  constraint media_alt_required check (is_decorative or char_length(btrim(alt)) > 0),
  constraint media_dimensions_positive check ((width is null or width > 0) and (height is null or height > 0)),
  constraint media_bytes_nonnegative check (bytes is null or bytes >= 0),
  constraint media_focal_pair check ((focal_x is null) = (focal_y is null)),
  constraint media_focal_range check (focal_x between 0 and 1 and focal_y between 0 and 1)
);

create index media_uploaded_by_idx on public.media (uploaded_by) where uploaded_by is not null;
create index media_folder_idx on public.media (folder) where folder is not null;
create index media_created_at_idx on public.media (created_at desc) where deleted_at is null;

-- profiles.avatar_media_id could not reference media until media existed.
alter table public.profiles
  add constraint profiles_avatar_media_id_fkey
  foreign key (avatar_media_id) references public.media (id) on delete set null;
