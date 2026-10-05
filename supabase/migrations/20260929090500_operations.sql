-- Phase 2, migration 6 of 9: operational tables.
-- story clusters, newsletter, ads, settings, navigation, social links,
-- redirects and the audit log.

-- ---------------------------------------------------------------------------
-- story clusters (discovery pipeline output)
-- ---------------------------------------------------------------------------

create table public.story_clusters (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  summary text,
  status public.cluster_status not null default 'open',
  geography public.geo_scope not null default 'none',
  score numeric(8, 4) not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  assigned_to uuid references public.profiles (id) on delete set null,
  -- The article this cluster turned into, once one exists.
  article_id uuid references public.articles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_clusters_seen_order check (last_seen_at >= first_seen_at),
  constraint story_clusters_score_nonnegative check (score >= 0)
);

create index story_clusters_status_seen_idx on public.story_clusters (status, last_seen_at desc);
create index story_clusters_score_idx on public.story_clusters (score desc);
create index story_clusters_assigned_idx on public.story_clusters (assigned_to) where assigned_to is not null;
create index story_clusters_article_idx on public.story_clusters (article_id) where article_id is not null;

create table public.cluster_members (
  cluster_id uuid not null references public.story_clusters (id) on delete cascade,
  scraped_article_id uuid not null references public.scraped_articles (id) on delete cascade,
  similarity numeric(5, 4),
  is_primary boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (cluster_id, scraped_article_id),
  constraint cluster_members_similarity_range check (similarity is null or similarity between 0 and 1)
);

create index cluster_members_scraped_idx on public.cluster_members (scraped_article_id);
-- At most one primary item per cluster.
create unique index cluster_members_one_primary_idx on public.cluster_members (cluster_id) where is_primary;

-- ---------------------------------------------------------------------------
-- newsletter_subscribers
-- ---------------------------------------------------------------------------
-- Personal data. No anonymous access at all; sign-ups go through a server route
-- using the service role (a later phase). IP addresses are stored as a hash.

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status public.subscriber_status not null default 'pending',
  source text,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  -- Random tokens built from two version 4 UUIDs (no pgcrypto dependency).
  confirmation_token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  unsubscribe_token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  -- Consent record: the exact wording shown, its version, and when and how.
  consent_text text not null,
  consent_version text not null,
  consent_ip_hash text,
  consent_user_agent text,
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_subscribers_confirmation_token_key unique (confirmation_token),
  constraint newsletter_subscribers_unsubscribe_token_key unique (unsubscribe_token),
  constraint newsletter_subscribers_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  constraint newsletter_subscribers_confirmed_needs_date check (status <> 'confirmed' or confirmed_at is not null),
  constraint newsletter_subscribers_unsubscribed_needs_date check (status <> 'unsubscribed' or unsubscribed_at is not null)
);

create unique index newsletter_subscribers_email_key on public.newsletter_subscribers (lower(email));
create index newsletter_subscribers_status_created_idx on public.newsletter_subscribers (status, created_at desc);

-- ---------------------------------------------------------------------------
-- advertising
-- ---------------------------------------------------------------------------

create table public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  slot_key text not null,
  name text not null,
  description text,
  width integer,
  height integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_slots_slot_key_key unique (slot_key),
  constraint ad_slots_slot_key_format check (slot_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint ad_slots_dimensions_positive check ((width is null or width > 0) and (height is null or height > 0))
);

create table public.advertisements (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.ad_slots (id) on delete cascade,
  advertiser text not null,
  name text not null,
  creative_media_id uuid references public.media (id) on delete set null,
  target_url text not null,
  -- Readers must always be able to tell an ad from editorial content.
  disclosure_label text not null default 'Advertisement',
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint advertisements_target_https check (target_url ~ '^https://'),
  constraint advertisements_window_order check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint advertisements_disclosure_required check (char_length(btrim(disclosure_label)) > 0)
);

create index advertisements_slot_priority_idx on public.advertisements (slot_id, priority desc)
  where is_active and deleted_at is null;
create index advertisements_creative_media_idx on public.advertisements (creative_media_id) where creative_media_id is not null;

-- ---------------------------------------------------------------------------
-- site_settings: one row per setting key, value stored as jsonb
-- ---------------------------------------------------------------------------

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  description text,
  -- Only rows marked public are readable without signing in.
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_settings_key_format check (key ~ '^[a-z0-9]+([._-][a-z0-9]+)*$')
);

create index site_settings_public_idx on public.site_settings (key) where is_public;

-- ---------------------------------------------------------------------------
-- navigation_items and social_links
-- ---------------------------------------------------------------------------

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  area public.navigation_area not null,
  label text not null,
  href text not null,
  parent_id uuid references public.navigation_items (id) on delete cascade,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  opens_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint navigation_items_href_format check (href ~ '^(/|https://)'),
  constraint navigation_items_not_own_parent check (parent_id is null or parent_id <> id),
  constraint navigation_items_label_length check (char_length(btrim(label)) between 1 and 80)
);

create index navigation_items_area_sort_idx on public.navigation_items (area, sort_order) where is_visible;
create index navigation_items_parent_idx on public.navigation_items (parent_id) where parent_id is not null;

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_links_url_key unique (url),
  constraint social_links_url_https check (url ~ '^https://'),
  constraint social_links_platform_format check (platform ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index social_links_sort_idx on public.social_links (sort_order) where is_visible;

-- ---------------------------------------------------------------------------
-- redirects
-- ---------------------------------------------------------------------------

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null,
  to_path text not null,
  status_code smallint not null default 301,
  is_active boolean not null default true,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint redirects_from_path_key unique (from_path),
  constraint redirects_from_path_format check (from_path ~ '^/'),
  constraint redirects_to_path_format check (to_path ~ '^(/|https://)'),
  constraint redirects_status_code_allowed check (status_code in (301, 302, 307, 308)),
  constraint redirects_not_self check (from_path <> to_path)
);

-- ---------------------------------------------------------------------------
-- audit_log: append only
-- ---------------------------------------------------------------------------
-- actor_id has no foreign key on purpose: the log must outlive the account.
-- Rows are written by the audit trigger (migration 7) and cannot be changed
-- or deleted, not even by the service role (a trigger refuses).

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc) where actor_id is not null;
create index audit_log_created_idx on public.audit_log (created_at desc);
