-- Phase 2, migration 3 of 9: news discovery pipeline, base tables.
--
-- "sources" and "scraped_articles" come before "articles" because
-- article_sources can point back at the scraped item a citation came from.
-- story_clusters and cluster_members are in migration 6 (they point at articles).
--
-- Copyright note: scraped_articles stores metadata and a short summary only
-- (capped at 1200 characters), never full article text. The pipeline is for
-- discovery, not for republishing other people's writing.

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  kind public.source_kind not null default 'news_report',
  homepage_url text not null,
  feed_url text,
  -- ISO 3166-1 alpha-2 country code of the publisher, when known.
  country text,
  language text not null default 'en',
  is_active boolean not null default true,
  respect_robots boolean not null default true,
  crawl_interval_minutes integer not null default 60,
  last_fetched_at timestamptz,
  last_status_code integer,
  last_error text,
  license_note text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_slug_key unique (slug),
  constraint sources_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint sources_homepage_https check (homepage_url ~ '^https://'),
  constraint sources_feed_https check (feed_url is null or feed_url ~ '^https://'),
  constraint sources_country_code check (country is null or country ~ '^[A-Z]{2}$'),
  constraint sources_crawl_interval check (crawl_interval_minutes >= 15)
);

create index sources_active_idx on public.sources (is_active, last_fetched_at);

create table public.scraped_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  url text not null,
  -- Normalised URL used for de-duplication (no tracking parameters, no fragment).
  canonical_url text not null,
  title text not null,
  author text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  summary text,
  language text,
  content_hash text,
  geography public.geo_scope not null default 'none',
  status public.scrape_status not null default 'new',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scraped_articles_canonical_url_key unique (canonical_url),
  constraint scraped_articles_url_https check (url ~ '^https://'),
  constraint scraped_articles_summary_length check (summary is null or char_length(summary) <= 1200)
);

create index scraped_articles_source_discovered_idx on public.scraped_articles (source_id, discovered_at desc);
create index scraped_articles_status_discovered_idx on public.scraped_articles (status, discovered_at desc);
create index scraped_articles_published_idx on public.scraped_articles (published_at desc nulls last);
create index scraped_articles_content_hash_idx on public.scraped_articles (content_hash) where content_hash is not null;
create index scraped_articles_reviewed_by_idx on public.scraped_articles (reviewed_by) where reviewed_by is not null;
