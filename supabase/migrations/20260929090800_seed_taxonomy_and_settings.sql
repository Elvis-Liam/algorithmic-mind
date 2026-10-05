-- Phase 2, migration 9 of 9: reference data every environment needs.
--
-- The category taxonomy lives in a migration, not in seed.sql, because
-- production needs it too (seed.sql only runs on local resets).
--
-- Categories come from the project brief: Software Engineering, Artificial
-- Intelligence, Events and Product Reviews. No subcategories are defined yet;
-- categories.parent_id supports one level of nesting when they are needed.
--
-- Every statement is idempotent, so re-running it changes nothing.

insert into public.categories (name, slug, description, sort_order)
values
  ('Software Engineering', 'software-engineering',
   'Developer platforms, languages, tools, infrastructure and the practice of building software.', 10),
  ('Artificial Intelligence', 'artificial-intelligence',
   'Models, research, tooling and the companies building artificial intelligence.', 20),
  ('Events', 'events',
   'Conferences, meetups and other gatherings for software and AI professionals.', 30),
  ('Product Reviews', 'product-reviews',
   'Hands-on reviews of software and AI products.', 40)
on conflict (slug) do nothing;

-- Public configuration, taken from the project constitution.
insert into public.site_settings (key, value, description, is_public)
values
  ('site.name', to_jsonb('Algorithmic Mind'::text), 'Publication name.', true),
  ('site.domain', to_jsonb('algorithmicmind.com'::text), 'Canonical domain.', true),
  ('site.tagline',
   to_jsonb('The latest developments, releases, breakthroughs, and industry movements shaping software and AI.'::text),
   'Publication tagline.', true)
on conflict (key) do nothing;
