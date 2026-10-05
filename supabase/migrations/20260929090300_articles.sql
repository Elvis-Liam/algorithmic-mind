-- Phase 2, migration 4 of 9: articles and everything that hangs off them.
--
-- Full text search: articles.search_vector is a tsvector filled by the
-- articles_before_lifecycle trigger (migration 7) from title (weight A),
-- subtitle and excerpt (B) and the body text (C). It is a trigger-maintained
-- column rather than a generated column because the body is TipTap JSON and
-- the text extraction needs a recursive function. The GIN index is created
-- here so the first real rows are indexed from day one.

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  slug text not null,
  body jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  excerpt text,
  author_id uuid not null references public.profiles (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  status public.article_status not null default 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  -- Whole minutes, computed by trigger from the body (about 230 words a minute).
  reading_time smallint,
  hero_media_id uuid references public.media (id) on delete set null,
  is_breaking boolean not null default false,
  breaking_priority smallint not null default 0,
  is_top_story boolean not null default false,
  top_story_start timestamptz,
  top_story_end timestamptz,
  is_featured boolean not null default false,
  is_editors_pick boolean not null default false,
  geography public.geo_scope not null default 'none',
  view_count bigint not null default 0,
  seo_title text,
  meta_description text,
  canonical_url text,
  social_title text,
  social_description text,
  social_image_id uuid references public.media (id) on delete set null,
  noindex boolean not null default false,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint articles_slug_key unique (slug),
  constraint articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint articles_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint articles_excerpt_length check (excerpt is null or char_length(excerpt) <= 500),
  constraint articles_seo_title_length check (seo_title is null or char_length(seo_title) <= 120),
  constraint articles_meta_description_length check (meta_description is null or char_length(meta_description) <= 320),
  constraint articles_social_title_length check (social_title is null or char_length(social_title) <= 120),
  constraint articles_social_description_length check (social_description is null or char_length(social_description) <= 320),
  constraint articles_canonical_https check (canonical_url is null or canonical_url ~ '^https://'),
  constraint articles_body_is_doc check (jsonb_typeof(body) = 'object' and body ->> 'type' = 'doc'),
  constraint articles_published_needs_date check (status <> 'published' or published_at is not null),
  constraint articles_scheduled_needs_time check (status <> 'scheduled' or scheduled_for is not null),
  constraint articles_live_needs_category check (status not in ('scheduled', 'published') or category_id is not null),
  constraint articles_breaking_priority_range check (breaking_priority between 0 and 100),
  constraint articles_view_count_nonnegative check (view_count >= 0),
  constraint articles_reading_time_positive check (reading_time is null or reading_time > 0),
  constraint articles_top_story_window check (top_story_start is null or top_story_end is null or top_story_end > top_story_start)
);

-- Public listings: newest published first, optionally by category or geography.
create index articles_published_idx on public.articles (published_at desc)
  where status = 'published' and deleted_at is null;
create index articles_category_published_idx on public.articles (category_id, published_at desc)
  where status = 'published' and deleted_at is null;
create index articles_geography_published_idx on public.articles (geography, published_at desc)
  where status = 'published' and deleted_at is null;
create index articles_author_idx on public.articles (author_id, published_at desc);

-- Editorial placements.
create index articles_breaking_idx on public.articles (breaking_priority desc, published_at desc)
  where is_breaking and status = 'published' and deleted_at is null;
create index articles_top_story_idx on public.articles (top_story_start, top_story_end)
  where is_top_story and status = 'published' and deleted_at is null;
create index articles_featured_idx on public.articles (published_at desc)
  where is_featured and status = 'published' and deleted_at is null;
create index articles_editors_pick_idx on public.articles (published_at desc)
  where is_editors_pick and status = 'published' and deleted_at is null;
create index articles_popular_idx on public.articles (view_count desc)
  where status = 'published' and deleted_at is null;

-- Dashboards and the scheduler.
create index articles_status_updated_idx on public.articles (status, updated_at desc)
  where deleted_at is null;
create index articles_scheduled_idx on public.articles (scheduled_for)
  where status = 'scheduled';

-- Foreign keys used by media visibility checks and joins.
create index articles_hero_media_idx on public.articles (hero_media_id) where hero_media_id is not null;
create index articles_social_image_idx on public.articles (social_image_id) where social_image_id is not null;

-- Full text search.
create index articles_search_vector_idx on public.articles using gin (search_vector);

-- ---------------------------------------------------------------------------
-- article_revisions: append only body history
-- ---------------------------------------------------------------------------

create table public.article_revisions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  revision_number integer not null,
  body jsonb not null,
  editor_id uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint article_revisions_number_key unique (article_id, revision_number),
  constraint article_revisions_number_positive check (revision_number > 0),
  constraint article_revisions_note_length check (note is null or char_length(note) <= 500)
);

create index article_revisions_editor_idx on public.article_revisions (editor_id) where editor_id is not null;

-- ---------------------------------------------------------------------------
-- Join tables
-- ---------------------------------------------------------------------------

create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create index article_tags_tag_idx on public.article_tags (tag_id);

create table public.article_topics (
  article_id uuid not null references public.articles (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, topic_id)
);

create index article_topics_topic_idx on public.article_topics (topic_id);

-- ---------------------------------------------------------------------------
-- article_sources: where the reporting came from
-- ---------------------------------------------------------------------------

create table public.article_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  source_name text not null,
  url text not null,
  original_title text,
  author text,
  source_published_at timestamptz,
  discovered_at timestamptz,
  source_type public.source_kind not null default 'news_report',
  license_note text,
  scraped_article_id uuid references public.scraped_articles (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_sources_article_url_key unique (article_id, url),
  constraint article_sources_url_https check (url ~ '^https://'),
  constraint article_sources_name_length check (char_length(btrim(source_name)) between 1 and 160)
);

create index article_sources_scraped_idx on public.article_sources (scraped_article_id) where scraped_article_id is not null;

-- ---------------------------------------------------------------------------
-- trending_scores: one current row per article, written by a job
-- ---------------------------------------------------------------------------

create table public.trending_scores (
  article_id uuid primary key references public.articles (id) on delete cascade,
  score numeric(12, 4) not null default 0,
  components jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  constraint trending_scores_score_nonnegative check (score >= 0),
  constraint trending_scores_components_is_object check (jsonb_typeof(components) = 'object')
);

create index trending_scores_score_idx on public.trending_scores (score desc);
