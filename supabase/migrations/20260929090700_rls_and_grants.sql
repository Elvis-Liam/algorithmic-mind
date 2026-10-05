-- Phase 2, migration 8 of 9: row level security and grants.
--
-- Two independent locks protect every table:
--   1. Grants: anon and authenticated hold only the privileges written below.
--   2. Policies: row level security decides which rows those privileges reach.
-- A mistake in one is caught by the other, and a final block at the bottom
-- aborts the migration if any table in "public" lacks row level security.
--
-- Reading the public rules: the public may read published articles and the
-- reference rows needed to render them (categories, tags, topics, sources,
-- published media). Everything operational is closed to anonymous visitors.
--
-- Role ladder used by the write policies:
--   super_admin, administrator : manage users, settings, ads, navigation
--   editor                     : write and publish anything editorial
--   author                     : write own drafts, submit them for review
--   reporter                   : write own drafts only, read the discovery feed
--
-- Child rows (tags, sources, review points) are visible exactly when their
-- parent row is visible to the caller, by asking the parent table, whose own
-- policies then do the filtering.

-- ---------------------------------------------------------------------------
-- 1. Enable row level security on every table
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.topics enable row level security;
alter table public.media enable row level security;
alter table public.sources enable row level security;
alter table public.scraped_articles enable row level security;
alter table public.articles enable row level security;
alter table public.article_revisions enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_topics enable row level security;
alter table public.article_sources enable row level security;
alter table public.trending_scores enable row level security;
alter table public.startups enable row level security;
alter table public.startup_funding_rounds enable row level security;
alter table public.events enable row level security;
alter table public.products enable row level security;
alter table public.product_reviews enable row level security;
alter table public.product_review_points enable row level security;
alter table public.product_review_media enable row level security;
alter table public.story_clusters enable row level security;
alter table public.cluster_members enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.ad_slots enable row level security;
alter table public.advertisements enable row level security;
alter table public.site_settings enable row level security;
alter table public.navigation_items enable row level security;
alter table public.social_links enable row level security;
alter table public.redirects enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Reset grants, then write each one out
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Anonymous: read only, and only on tables the public site renders.
grant select on
  public.categories, public.tags, public.topics, public.media,
  public.articles, public.article_tags, public.article_topics,
  public.article_sources, public.trending_scores,
  public.startups, public.startup_funding_rounds, public.events,
  public.products, public.product_reviews, public.product_review_points,
  public.product_review_media,
  public.ad_slots, public.advertisements,
  public.site_settings, public.navigation_items, public.social_links,
  public.redirects
to anon;

-- Profiles: named columns only. Role, activation and deletion state stay
-- private, so anonymous queries must list columns instead of using select *.
grant select (id, display_name, slug, avatar_media_id, bio, specialization, social_links, created_at)
  on public.profiles to anon;

-- Authenticated: read everything the policies allow.
grant select on
  public.profiles, public.categories, public.tags, public.topics, public.media,
  public.sources, public.scraped_articles,
  public.articles, public.article_revisions, public.article_tags,
  public.article_topics, public.article_sources, public.trending_scores,
  public.startups, public.startup_funding_rounds, public.events,
  public.products, public.product_reviews, public.product_review_points,
  public.product_review_media,
  public.story_clusters, public.cluster_members,
  public.newsletter_subscribers,
  public.ad_slots, public.advertisements,
  public.site_settings, public.navigation_items, public.social_links,
  public.redirects, public.audit_log
to authenticated;

-- Not granted for writing at all: profiles insert (created by trigger),
-- trending_scores (written by a job), newsletter_subscribers insert (server
-- route with the service role) and audit_log (written by trigger).
grant insert on
  public.categories, public.tags, public.topics, public.media,
  public.sources, public.scraped_articles,
  public.articles, public.article_revisions, public.article_tags,
  public.article_topics, public.article_sources,
  public.startups, public.startup_funding_rounds, public.events,
  public.products, public.product_reviews, public.product_review_points,
  public.product_review_media,
  public.story_clusters, public.cluster_members,
  public.ad_slots, public.advertisements,
  public.site_settings, public.navigation_items, public.social_links,
  public.redirects
to authenticated;

grant update on
  public.profiles, public.categories, public.tags, public.topics, public.media,
  public.sources, public.scraped_articles,
  public.articles, public.article_sources,
  public.startups, public.startup_funding_rounds, public.events,
  public.products, public.product_reviews, public.product_review_points,
  public.story_clusters, public.cluster_members,
  public.newsletter_subscribers,
  public.ad_slots, public.advertisements,
  public.site_settings, public.navigation_items, public.social_links,
  public.redirects
to authenticated;

grant delete on
  public.profiles, public.categories, public.tags, public.topics, public.media,
  public.sources, public.scraped_articles,
  public.articles, public.article_tags, public.article_topics, public.article_sources,
  public.startups, public.startup_funding_rounds, public.events,
  public.products, public.product_reviews, public.product_review_points,
  public.product_review_media,
  public.story_clusters, public.cluster_members,
  public.newsletter_subscribers,
  public.ad_slots, public.advertisements,
  public.site_settings, public.navigation_items, public.social_links,
  public.redirects
to authenticated;

-- The service role bypasses row level security by design (server code only).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 3. Policies
-- ---------------------------------------------------------------------------

-- ===== profiles ============================================================

-- Anonymous readers see a profile only if its owner has a published article.
create policy profiles_select_public on public.profiles
  for select to anon, authenticated
  using (
    deleted_at is null
    and is_active
    and exists (select 1 from public.articles a where a.author_id = profiles.id)
  );

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_editors on public.profiles
  for select to authenticated
  using ((select private.is_editor_or_above()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and (select private.is_staff()))
  with check (id = (select auth.uid()));

-- Role and activation changes are further limited by profiles_guard.
create policy profiles_update_admins on public.profiles
  for update to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));

create policy profiles_delete_super_admin on public.profiles
  for delete to authenticated
  using ((select private.is_super_admin()));

-- ===== categories, tags, topics ============================================

create policy categories_select_public on public.categories
  for select to anon, authenticated using (true);
create policy categories_manage_editors on public.categories
  for all to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));

create policy tags_select_public on public.tags
  for select to anon, authenticated using (true);
create policy tags_manage_editors on public.tags
  for all to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));

create policy topics_select_public on public.topics
  for select to anon, authenticated using (true);
create policy topics_manage_editors on public.topics
  for all to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));

-- ===== media ===============================================================

-- A media row is public only while something public references it. Each
-- exists() asks a table whose own policies already hide unpublished rows.
create policy media_select_public on public.media
  for select to anon, authenticated
  using (
    deleted_at is null
    and (
      exists (select 1 from public.articles a where a.hero_media_id = media.id)
      or exists (select 1 from public.articles a where a.social_image_id = media.id)
      or exists (select 1 from public.startups s where s.logo_media_id = media.id)
      or exists (select 1 from public.events e where e.image_media_id = media.id)
      or exists (select 1 from public.advertisements ad where ad.creative_media_id = media.id)
      or exists (select 1 from public.profiles p where p.avatar_media_id = media.id)
      or exists (select 1 from public.product_review_media m where m.media_id = media.id)
    )
  );

-- Authors and above can browse the library.
create policy media_select_authors on public.media
  for select to authenticated
  using (deleted_at is null and (select private.is_author_or_above()));

create policy media_select_editors on public.media
  for select to authenticated
  using ((select private.is_editor_or_above()));

create policy media_insert_authors on public.media
  for insert to authenticated
  with check ((select private.is_author_or_above()) and uploaded_by = (select auth.uid()));

create policy media_update_editors on public.media
  for update to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));

create policy media_update_own on public.media
  for update to authenticated
  using ((select private.is_author_or_above()) and uploaded_by = (select auth.uid()))
  with check ((select private.is_author_or_above()) and uploaded_by = (select auth.uid()));

create policy media_delete_admins on public.media
  for delete to authenticated
  using ((select private.is_admin_or_above()));

-- ===== discovery pipeline (staff only, no public access) ===================

create policy sources_select_staff on public.sources
  for select to authenticated using ((select private.is_staff()));
create policy sources_manage_admins on public.sources
  for all to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));

create policy scraped_articles_select_staff on public.scraped_articles
  for select to authenticated using ((select private.is_staff()));
create policy scraped_articles_manage_editors on public.scraped_articles
  for all to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));

create policy story_clusters_select_staff on public.story_clusters
  for select to authenticated using ((select private.is_staff()));
create policy story_clusters_manage_editors on public.story_clusters
  for all to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));

create policy cluster_members_select_staff on public.cluster_members
  for select to authenticated using ((select private.is_staff()));
create policy cluster_members_manage_editors on public.cluster_members
  for all to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));

-- ===== articles ============================================================

-- The public rule: published, not deleted, and not dated in the future.
create policy articles_select_public on public.articles
  for select to anon, authenticated
  using (status = 'published' and deleted_at is null and published_at <= now());

create policy articles_select_own on public.articles
  for select to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null and (select private.is_staff()));

create policy articles_select_editors on public.articles
  for select to authenticated
  using ((select private.is_editor_or_above()));

create policy articles_insert_editors on public.articles
  for insert to authenticated
  with check ((select private.is_editor_or_above()));

create policy articles_insert_authors on public.articles
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.auth_role()) = 'author'
    and status in ('draft', 'review')
  );

create policy articles_insert_reporters on public.articles
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.auth_role()) = 'reporter'
    and status = 'draft'
  );

create policy articles_update_editors on public.articles
  for update to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));

-- An author edits only their own drafts and may submit them for review.
-- Once a piece is in review it is locked until an editor returns it.
create policy articles_update_authors on public.articles
  for update to authenticated
  using (
    author_id = (select auth.uid())
    and (select private.auth_role()) = 'author'
    and status = 'draft'
    and deleted_at is null
  )
  with check (
    author_id = (select auth.uid())
    and (select private.auth_role()) = 'author'
    and status in ('draft', 'review')
  );

create policy articles_update_reporters on public.articles
  for update to authenticated
  using (
    author_id = (select auth.uid())
    and (select private.auth_role()) = 'reporter'
    and status = 'draft'
    and deleted_at is null
  )
  with check (
    author_id = (select auth.uid())
    and (select private.auth_role()) = 'reporter'
    and status = 'draft'
  );

create policy articles_delete_super_admin on public.articles
  for delete to authenticated
  using ((select private.is_super_admin()));

-- ===== article children ====================================================

-- Revisions are never public. Editors read all, authors read their own.
create policy article_revisions_select_staff on public.article_revisions
  for select to authenticated
  using (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_revisions.article_id
          and a.author_id = (select auth.uid())
      )
    )
  );

create policy article_revisions_insert_editors on public.article_revisions
  for insert to authenticated
  with check ((select private.is_editor_or_above()) and editor_id = (select auth.uid()));

-- Tags, topics and sources follow the parent article's visibility.
create policy article_tags_select on public.article_tags
  for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_tags.article_id));

create policy article_tags_insert on public.article_tags
  for insert to authenticated
  with check (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_tags.article_id
          and a.author_id = (select auth.uid())
          and a.status = 'draft'
          and a.deleted_at is null
      )
    )
  );

create policy article_tags_delete on public.article_tags
  for delete to authenticated
  using (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_tags.article_id
          and a.author_id = (select auth.uid())
          and a.status = 'draft'
          and a.deleted_at is null
      )
    )
  );

create policy article_topics_select on public.article_topics
  for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_topics.article_id));

create policy article_topics_insert on public.article_topics
  for insert to authenticated
  with check (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_topics.article_id
          and a.author_id = (select auth.uid())
          and a.status = 'draft'
          and a.deleted_at is null
      )
    )
  );

create policy article_topics_delete on public.article_topics
  for delete to authenticated
  using (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_topics.article_id
          and a.author_id = (select auth.uid())
          and a.status = 'draft'
          and a.deleted_at is null
      )
    )
  );

create policy article_sources_select on public.article_sources
  for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = article_sources.article_id));

create policy article_sources_insert on public.article_sources
  for insert to authenticated
  with check (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_sources.article_id
          and a.author_id = (select auth.uid())
          and a.status = 'draft'
          and a.deleted_at is null
      )
    )
  );

create policy article_sources_update on public.article_sources
  for update to authenticated
  using (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_sources.article_id
          and a.author_id = (select auth.uid())
          and a.status = 'draft'
          and a.deleted_at is null
      )
    )
  )
  with check (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_sources.article_id
          and a.author_id = (select auth.uid())
          and a.status = 'draft'
          and a.deleted_at is null
      )
    )
  );

create policy article_sources_delete on public.article_sources
  for delete to authenticated
  using (
    (select private.is_editor_or_above())
    or (
      (select private.is_staff())
      and exists (
        select 1 from public.articles a
        where a.id = article_sources.article_id
          and a.author_id = (select auth.uid())
          and a.status = 'draft'
          and a.deleted_at is null
      )
    )
  );

-- Trending scores are written only by the service role.
create policy trending_scores_select on public.trending_scores
  for select to anon, authenticated
  using (exists (select 1 from public.articles a where a.id = trending_scores.article_id));

-- ===== startups ============================================================

create policy startups_select_public on public.startups
  for select to anon, authenticated
  using (is_published and deleted_at is null);
create policy startups_select_editors on public.startups
  for select to authenticated
  using ((select private.is_editor_or_above()));
create policy startups_insert_editors on public.startups
  for insert to authenticated
  with check ((select private.is_editor_or_above()));
create policy startups_update_editors on public.startups
  for update to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));
create policy startups_delete_admins on public.startups
  for delete to authenticated
  using ((select private.is_admin_or_above()));

-- Funding is public only when the startup is public and its funding group has
-- been verified.
create policy startup_funding_rounds_select_public on public.startup_funding_rounds
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.startups s
      where s.id = startup_funding_rounds.startup_id
        and s.verified_funding
    )
  );
create policy startup_funding_rounds_select_editors on public.startup_funding_rounds
  for select to authenticated
  using ((select private.is_editor_or_above()));
create policy startup_funding_rounds_insert_editors on public.startup_funding_rounds
  for insert to authenticated
  with check ((select private.is_editor_or_above()));
create policy startup_funding_rounds_update_editors on public.startup_funding_rounds
  for update to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));
create policy startup_funding_rounds_delete_editors on public.startup_funding_rounds
  for delete to authenticated
  using ((select private.is_editor_or_above()));

-- ===== events ==============================================================

create policy events_select_public on public.events
  for select to anon, authenticated
  using (is_published and deleted_at is null);
create policy events_select_editors on public.events
  for select to authenticated
  using ((select private.is_editor_or_above()));
create policy events_insert_editors on public.events
  for insert to authenticated
  with check ((select private.is_editor_or_above()));
create policy events_update_editors on public.events
  for update to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));
create policy events_delete_admins on public.events
  for delete to authenticated
  using ((select private.is_admin_or_above()));

-- ===== products and reviews ================================================

create policy products_select_public on public.products
  for select to anon, authenticated
  using (is_published and deleted_at is null);
create policy products_select_editors on public.products
  for select to authenticated
  using ((select private.is_editor_or_above()));
create policy products_insert_editors on public.products
  for insert to authenticated
  with check ((select private.is_editor_or_above()));
create policy products_update_editors on public.products
  for update to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));
create policy products_delete_admins on public.products
  for delete to authenticated
  using ((select private.is_admin_or_above()));

create policy product_reviews_select_public on public.product_reviews
  for select to anon, authenticated
  using (
    status = 'published'
    and deleted_at is null
    and published_at <= now()
    and exists (select 1 from public.products p where p.id = product_reviews.product_id)
  );
create policy product_reviews_select_own on public.product_reviews
  for select to authenticated
  using (reviewer_id = (select auth.uid()) and deleted_at is null and (select private.is_staff()));
create policy product_reviews_select_editors on public.product_reviews
  for select to authenticated
  using ((select private.is_editor_or_above()));
create policy product_reviews_insert_editors on public.product_reviews
  for insert to authenticated
  with check ((select private.is_editor_or_above()));
create policy product_reviews_insert_authors on public.product_reviews
  for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and (select private.auth_role()) = 'author'
    and status in ('draft', 'review')
  );
create policy product_reviews_update_editors on public.product_reviews
  for update to authenticated
  using ((select private.is_editor_or_above()))
  with check ((select private.is_editor_or_above()));
create policy product_reviews_update_authors on public.product_reviews
  for update to authenticated
  using (
    reviewer_id = (select auth.uid())
    and (select private.auth_role()) = 'author'
    and status = 'draft'
    and deleted_at is null
  )
  with check (
    reviewer_id = (select auth.uid())
    and (select private.auth_role()) = 'author'
    and status in ('draft', 'review')
  );
create policy product_reviews_delete_admins on public.product_reviews
  for delete to authenticated
  using ((select private.is_admin_or_above()));

create policy product_review_points_select on public.product_review_points
  for select to anon, authenticated
  using (exists (select 1 from public.product_reviews r where r.id = product_review_points.review_id));
create policy product_review_points_insert on public.product_review_points
  for insert to authenticated
  with check (
    (select private.is_editor_or_above())
    or exists (
      select 1 from public.product_reviews r
      where r.id = product_review_points.review_id
        and r.reviewer_id = (select auth.uid())
        and r.status = 'draft'
        and r.deleted_at is null
        and (select private.is_author_or_above())
    )
  );
create policy product_review_points_update on public.product_review_points
  for update to authenticated
  using (
    (select private.is_editor_or_above())
    or exists (
      select 1 from public.product_reviews r
      where r.id = product_review_points.review_id
        and r.reviewer_id = (select auth.uid())
        and r.status = 'draft'
        and r.deleted_at is null
        and (select private.is_author_or_above())
    )
  )
  with check (
    (select private.is_editor_or_above())
    or exists (
      select 1 from public.product_reviews r
      where r.id = product_review_points.review_id
        and r.reviewer_id = (select auth.uid())
        and r.status = 'draft'
        and r.deleted_at is null
        and (select private.is_author_or_above())
    )
  );
create policy product_review_points_delete on public.product_review_points
  for delete to authenticated
  using (
    (select private.is_editor_or_above())
    or exists (
      select 1 from public.product_reviews r
      where r.id = product_review_points.review_id
        and r.reviewer_id = (select auth.uid())
        and r.status = 'draft'
        and r.deleted_at is null
        and (select private.is_author_or_above())
    )
  );

create policy product_review_media_select on public.product_review_media
  for select to anon, authenticated
  using (exists (select 1 from public.product_reviews r where r.id = product_review_media.review_id));
create policy product_review_media_insert on public.product_review_media
  for insert to authenticated
  with check (
    (select private.is_editor_or_above())
    or exists (
      select 1 from public.product_reviews r
      where r.id = product_review_media.review_id
        and r.reviewer_id = (select auth.uid())
        and r.status = 'draft'
        and r.deleted_at is null
        and (select private.is_author_or_above())
    )
  );
create policy product_review_media_delete on public.product_review_media
  for delete to authenticated
  using (
    (select private.is_editor_or_above())
    or exists (
      select 1 from public.product_reviews r
      where r.id = product_review_media.review_id
        and r.reviewer_id = (select auth.uid())
        and r.status = 'draft'
        and r.deleted_at is null
        and (select private.is_author_or_above())
    )
  );

-- ===== newsletter (administrators only, inserts via service role) ==========

create policy newsletter_subscribers_select_admins on public.newsletter_subscribers
  for select to authenticated using ((select private.is_admin_or_above()));
create policy newsletter_subscribers_update_admins on public.newsletter_subscribers
  for update to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));
create policy newsletter_subscribers_delete_admins on public.newsletter_subscribers
  for delete to authenticated using ((select private.is_admin_or_above()));

-- ===== advertising =========================================================

create policy ad_slots_select_public on public.ad_slots
  for select to anon, authenticated using (is_active);
create policy ad_slots_manage_admins on public.ad_slots
  for all to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));

create policy advertisements_select_public on public.advertisements
  for select to anon, authenticated
  using (
    is_active
    and deleted_at is null
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and exists (select 1 from public.ad_slots s where s.id = advertisements.slot_id)
  );
create policy advertisements_manage_admins on public.advertisements
  for all to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));

-- ===== site configuration ==================================================

create policy site_settings_select_public on public.site_settings
  for select to anon, authenticated using (is_public);
create policy site_settings_manage_admins on public.site_settings
  for all to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));

create policy navigation_items_select_public on public.navigation_items
  for select to anon, authenticated using (is_visible);
create policy navigation_items_manage_admins on public.navigation_items
  for all to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));

create policy social_links_select_public on public.social_links
  for select to anon, authenticated using (is_visible);
create policy social_links_manage_admins on public.social_links
  for all to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));

create policy redirects_select_public on public.redirects
  for select to anon, authenticated using (is_active);
create policy redirects_manage_admins on public.redirects
  for all to authenticated
  using ((select private.is_admin_or_above()))
  with check ((select private.is_admin_or_above()));

-- ===== audit log: administrators read, nobody writes through the API =======

create policy audit_log_select_admins on public.audit_log
  for select to authenticated using ((select private.is_admin_or_above()));

-- ---------------------------------------------------------------------------
-- 4. Fail the migration if any table was left without row level security
-- ---------------------------------------------------------------------------

do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  loop
    raise exception 'Row level security is not enabled on public.%', t.relname;
  end loop;
end;
$$;
