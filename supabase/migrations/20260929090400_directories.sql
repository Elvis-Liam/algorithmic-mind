-- Phase 2, migration 5 of 9: startups, events, products and reviews.
--
-- Integrity rules that enforce the constitution's "no fabricated content":
--   * every funding round must carry a source_url
--   * a product review cannot be published without a tested_on date
--   * public readers only see funding rows when the startup's funding group
--     has been verified (policy in migration 8)

-- ---------------------------------------------------------------------------
-- startups
-- ---------------------------------------------------------------------------

create table public.startups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_media_id uuid references public.media (id) on delete set null,
  -- ISO 3166-1 alpha-2. The app maps codes to names with Intl.DisplayNames.
  country text,
  city text,
  -- Array of objects, for example [{"name": "...", "role": "..."}].
  founders jsonb not null default '[]'::jsonb,
  founded_year smallint,
  website text,
  industry text,
  product text,
  description text,
  technologies text[] not null default '{}'::text[],
  geography public.geo_scope not null default 'none',
  is_published boolean not null default false,
  -- Verification flags, one per field group.
  verified_identity boolean not null default false,
  verified_founders boolean not null default false,
  verified_product boolean not null default false,
  verified_funding boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint startups_slug_key unique (slug),
  constraint startups_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint startups_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint startups_country_code check (country is null or country ~ '^[A-Z]{2}$'),
  constraint startups_founders_is_array check (jsonb_typeof(founders) = 'array'),
  constraint startups_founded_year_range check (founded_year is null or founded_year between 1900 and 2100),
  constraint startups_website_https check (website is null or website ~ '^https://')
);

create index startups_published_name_idx on public.startups (name)
  where is_published and deleted_at is null;
create index startups_country_city_idx on public.startups (country, city);
create index startups_industry_idx on public.startups (industry) where industry is not null;
create index startups_geography_idx on public.startups (geography);
create index startups_technologies_idx on public.startups using gin (technologies);
create index startups_logo_media_idx on public.startups (logo_media_id) where logo_media_id is not null;

create table public.startup_funding_rounds (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups (id) on delete cascade,
  round_type public.funding_round_type not null,
  announced_on date,
  -- Null amount means undisclosed. Amount and currency are set together.
  amount numeric(18, 2),
  currency text,
  lead_investors text[] not null default '{}'::text[],
  investors text[] not null default '{}'::text[],
  -- Every figure must point at where it was reported.
  source_url text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_funding_rounds_source_https check (source_url ~ '^https://'),
  constraint startup_funding_rounds_amount_nonnegative check (amount is null or amount >= 0),
  constraint startup_funding_rounds_currency_code check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint startup_funding_rounds_amount_with_currency check ((amount is null) = (currency is null))
);

create index startup_funding_rounds_startup_idx on public.startup_funding_rounds (startup_id, announced_on desc);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  -- IANA time zone name, validated by a trigger (migration 7).
  timezone text not null default 'UTC',
  location text,
  city text,
  country text,
  mode public.event_mode not null,
  organizer text,
  website text,
  registration_url text,
  ticket_info text,
  image_media_id uuid references public.media (id) on delete set null,
  geography public.geo_scope not null default 'none',
  is_published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint events_slug_key unique (slug),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint events_name_length check (char_length(btrim(name)) between 1 and 200),
  constraint events_end_after_start check (end_at is null or end_at >= start_at),
  constraint events_country_code check (country is null or country ~ '^[A-Z]{2}$'),
  constraint events_website_https check (website is null or website ~ '^https://'),
  constraint events_registration_https check (registration_url is null or registration_url ~ '^https://'),
  constraint events_place_required check (mode = 'online' or location is not null or city is not null)
);

create index events_published_start_idx on public.events (start_at)
  where is_published and deleted_at is null;
create index events_country_start_idx on public.events (country, start_at);
create index events_mode_idx on public.events (mode);
create index events_image_media_idx on public.events (image_media_id) where image_media_id is not null;

-- ---------------------------------------------------------------------------
-- products and reviews
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  -- Product type, for example "code editor" or "model API". Free text for now.
  category text,
  vendor text not null,
  website text,
  description text,
  is_published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint products_slug_key unique (slug),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint products_name_length check (char_length(btrim(name)) between 1 and 160),
  constraint products_website_https check (website is null or website ~ '^https://')
);

create index products_published_name_idx on public.products (name)
  where is_published and deleted_at is null;
create index products_category_idx on public.products (category) where category is not null;
create index products_vendor_idx on public.products (vendor);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  slug text not null,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  version_reviewed text not null,
  summary text,
  verdict text,
  -- 1.0 to 5.0 in half point steps.
  rating numeric(2, 1),
  pricing text,
  pricing_tested boolean not null default false,
  free_tier_notes text,
  free_tier_tested boolean not null default false,
  -- The date the reviewer actually used the product. Required to publish.
  tested_on date,
  status public.article_status not null default 'draft',
  published_at timestamptz,
  seo_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint product_reviews_slug_key unique (slug),
  constraint product_reviews_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint product_reviews_verdict_length check (verdict is null or char_length(verdict) <= 240),
  constraint product_reviews_rating_range check (rating is null or (rating >= 1 and rating <= 5 and rating * 2 = trunc(rating * 2))),
  constraint product_reviews_published_needs_date check (status <> 'published' or published_at is not null),
  constraint product_reviews_published_needs_testing check (status <> 'published' or tested_on is not null),
  constraint product_reviews_seo_title_length check (seo_title is null or char_length(seo_title) <= 120),
  constraint product_reviews_meta_description_length check (meta_description is null or char_length(meta_description) <= 320)
);

create index product_reviews_product_idx on public.product_reviews (product_id, published_at desc);
create index product_reviews_reviewer_idx on public.product_reviews (reviewer_id);
create index product_reviews_published_idx on public.product_reviews (published_at desc)
  where status = 'published' and deleted_at is null;
create index product_reviews_status_updated_idx on public.product_reviews (status, updated_at desc)
  where deleted_at is null;

-- Pros and cons, each with its own "we tested this" flag.
create table public.product_review_points (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.product_reviews (id) on delete cascade,
  kind public.review_point_kind not null,
  body text not null,
  tested boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_review_points_body_length check (char_length(btrim(body)) between 1 and 500)
);

create index product_review_points_review_idx on public.product_review_points (review_id, kind, sort_order);

-- Media gallery for a review.
create table public.product_review_media (
  review_id uuid not null references public.product_reviews (id) on delete cascade,
  media_id uuid not null references public.media (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (review_id, media_id)
);

create index product_review_media_media_idx on public.product_review_media (media_id);
