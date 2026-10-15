# Context Log

## Phase 1 — Repository foundation

### What was built
A Next.js 15 App Router project, TypeScript strict, ESLint (flat config) +
Prettier, targeting Cloudflare Workers via `@opennextjs/cloudflare`. The
full design token layer (light + dark) as CSS custom properties mapped into
Tailwind v4's `@theme`, with the default Tailwind palette wiped so
non-brand colour classes fail to compile. Self-hosted fonts via
`next/font/google` (IBM Plex Sans, IBM Plex Mono, Playfair Display as the
editorial serif — chosen since the constitution names a typeface role,
"an editorial serif," rather than a specific family). A three-state
(Light/Dark/System) theme system with no flash of the wrong theme: an
inline `<head>` script resolves and applies the theme before first paint,
and a client `ThemeProvider` takes over after hydration. The public shell:
header (logo lockup, tagline, live clock in the reader's own timezone,
theme toggle, primary nav) and footer (section links, legal links,
copyright), both responsive 320px–1920px. `.env.example` covering every
variable the project will eventually need. No page content, database code,
or auth — out of scope for this phase.

### Files that now exist
```
app/layout.tsx                          root layout, metadata, theme script wiring
app/page.tsx                            minimal placeholder home route
components/layout/header.tsx
components/layout/footer.tsx
components/layout/nav.tsx
components/layout/logo.tsx
components/layout/theme-toggle.tsx
components/layout/site-clock.tsx
components/providers/theme-script.tsx   no-flash inline script
components/providers/theme-provider.tsx client context + localStorage sync
lib/fonts.ts
lib/utils.ts                            cn() only, no new dependency
types/theme.ts
styles/globals.css                      tokens, @theme mapping, base layer
public/brand/logo-mark-dark.svg
public/brand/logo-mark-light.svg
public/brand/logo-lockup-dark.svg
public/brand/logo-lockup-light.svg
package.json, tsconfig.json, next.config.mjs, postcss.config.mjs
open-next.config.ts, wrangler.jsonc, cloudflare-env.d.ts
eslint.config.mjs, .prettierrc.json, .prettierignore, .gitignore
.env.example, README.md, CONTEXT.md
```

### Decisions taken
- **Tailwind v4**, CSS-first `@theme`, not a `tailwind.config.ts` JS
  palette. `@theme` compiles to real `:root` custom properties, so the
  constitution's "define once as CSS custom properties on :root, map into
  Tailwind as named colours" is one block, not two. Semantic tokens
  (`bg`, `surface`, `fg`, `fg-muted`, `accent`, `brand`, `rule`) swap on
  `[data-theme="dark"]`; base palette tokens (`primary`, `gold`, etc.) do
  not swap and are also available directly as utilities.
- **`--radius-full` capped at 4px** in the theme, so `rounded-full` can
  never produce a pill — a token-level backstop for the "no pill buttons"
  rule, matching the same instinct as wiping the default colour palette.
- **`@opennextjs/cloudflare`**, not `@cloudflare/next-on-pages` (confirmed
  superseded as of the search done this phase). This deploys as a Worker
  with a static-assets binding, which is what "Cloudflare Pages" resolves
  to for a Next.js 15 app today. Cloudflare's newer `vinext` tool targets
  Next.js 16 and doesn't apply while the stack is pinned to 15 — worth
  revisiting if the constitution's fixed stack ever moves to 16.
- **Nav taxonomy: Software / Engineering / AI**, taken directly from the
  constitution's scope sentence, not the reference mockup's
  Startups/Events/Reviews, which isn't grounded in the constitution and
  reads as generic SaaS-blog taxonomy the constitution rules out.
- **Two token-level accessibility corrections, deliberate, not oversights:**
  the literal `--color-muted` measures 3.58:1 against `ivory-light`
  (fails the constitution's own 4.5:1 body-text rule), and the literal
  `--color-gold-dark` measures 1.96:1 against `ivory-light` (fails the 3:1
  a focus ring needs) despite being the token named for both "muted text"
  and the focus ring in the light theme. Since "Accessibility, required in
  every phase" is explicit and non-negotiable, and the constitution
  already establishes that a computed derivative of a listed token is
  acceptable (dark-theme muted is defined as "ivory-dark at 70 percent"),
  `--color-fg-muted` in light mode is now a 75/25 mix of muted toward
  text-dark (~5:1), and `--color-focus-ring` uses `--color-primary` in
  light mode (11.3:1) instead of gold-dark, while dark mode keeps gold for
  both, unchanged, since it already passes. Full reasoning is in
  `styles/globals.css` comments next to each token.
- **No social links in the footer.** The reference mockup's handles are
  explicit bracketed placeholders, not real accounts, and the constitution
  bars fabricated content. Left out entirely rather than faked, per the
  constitution's own "leave it out of the interface entirely" instruction.
- **Logo assets are raster, not vector — flagged, not hidden.** The four
  uploaded `.svg` files are raster JPEGs (Canva AI exports with an
  embedded C2PA manifest) wrapped in an `<svg><image>` tag, not path data.
  The accompanying PNGs were the clean source pixels. This phase:
  chroma-keyed the flat background to transparency with edge colour
  decontamination, split the mark from the wordmark, stripped the
  manifest, and re-wrapped the result in a minimal `.svg` container at the
  four required paths/names. These are real, clean, transparent assets —
  but still raster under an `.svg` extension, meaningfully heavier than a
  true vector mark would be. Flagged in code comments, README, and here.
  **Blocking item: a designer needs to redraw the mark as true vector path
  data before launch.**
- **Environment sandbox had no network access** for this phase, so
  `npm install`, an actual `next build`, a Cloudflare Workers preview
  deploy, and a Lighthouse run could not be executed here. Every config
  file was hand-written and cross-checked against current documentation,
  but is unverified by an actual build. Whoever picks this up should run
  `npm install && npm run typecheck && npm run lint && npm run build`
  locally before trusting it, and complete the Cloudflare preview-deploy
  and Lighthouse acceptance checks from the original brief then.
- **Dependency fix, post-handoff:** the first `npm install` you'll run
  failed with an ERESOLVE conflict — `@opennextjs/cloudflare@1.20.6`
  requires `next >=15.5.24 <16`, and the original pin was `next@15.5.4`.
  Fixed by moving to `"next": "^15.5.24"`, `"eslint-config-next":
  "^15.5.24"`, `"@opennextjs/cloudflare": "^1.20.6"`, and `"wrangler":
  "^4.128.0"` (opennext 1.20.6 shells out to a Wrangler 4.128+ CLI, not
  the 3.x line this repo started on). This is exactly the kind of thing
  the unexecuted `npm install` in this sandbox couldn't catch — worth
  running `npm outdated` after cloning, since this line moves fast.
- **Lint pass, confirmed against a real build:** `next build` compiled and
  typechecked clean. Three lint items fixed: the placeholder
  `CloudflareEnv` empty-interface error (suppressed with a comment, since
  it's replaced by `wrangler types` output later), and two `no-img-element`
  warnings in `components/layout/logo.tsx`, suppressed deliberately —
  next/image's optimization pipeline doesn't meaningfully re-process a
  raster payload already embedded in an `.svg` wrapper, so it buys nothing
  until the real vector logo lands.
- **Lighthouse run against the real Cloudflare Workers preview: 96/100
  accessibility on the first pass**, one finding — nav and footer links
  were plain inline text with no padding, so their actual clickable box
  was under the 24×24 CSS px minimum (WCAG 2.5.8). Fixed in
  `components/layout/nav.tsx` and `components/layout/footer.tsx` by
  giving each link real padding (`px-2`–`px-3`, `py-2`–`py-2.5`) and
  cancelling the resulting visual shift with a matching negative margin,
  so the text still lines up exactly where it did before — only the
  invisible tap area grew. Same technique applied consistently to both
  components. Re-run after the fix, via Chrome DevTools' own Lighthouse
  panel (the CLI kept hitting `chrome-launcher` flakiness on Windows —
  an interstitial-error false start and then a throttling-related hang,
  neither one a problem with the app): **100/100 accessibility,
  confirmed.** Contrast, landmarks, labels, focus order, and ARIA all
  passed clean, including the two deliberate token deviations noted
  above, which is the actual confirmation those were the right call.
  Performance/Best Practices/SEO also came back 96/100/100, unprompted —
  not a Phase 1 acceptance target, but worth knowing the shell isn't
  starting from a deficit on those either. **Phase 1 acceptance criteria
  are now fully verified**, not just written: real `npm install`, real
  `next build`, real `next lint`, real OpenNext build running under a
  real local `workerd` (Cloudflare Workers runtime) instance, and a real
  100/100 accessibility score against that running instance.

### What the next phase depends on
- The token names in `styles/globals.css` (`bg`, `surface`, `fg`,
  `fg-muted`, `accent`, `brand`, `rule`, plus the fixed palette names) are
  the vocabulary every future component should use — no new colour names,
  no hex literals anywhere else.
- `components/layout/` is the place for shared chrome; page-level UI goes
  under `app/<route>/`.
- The Cloudflare Workers target (not Node.js, not Vercel) constrains
  future dependency choices — check `nodejs_compat` coverage before adding
  anything that touches the filesystem, native bindings, or Node-only APIs.
- The vector-logo gap noted in Phase 1 is resolved — see the "Real brand
  assets inspected" note below. No longer a blocking item.

## Targeted fix — real brand assets swapped in, header composition corrected

Placeholder logos at `/public/brand/` replaced with final brand assets
(same filenames, files not touched by me). That surfaced the real bug:
`Logo` was rendering the *lockup* SVG (mark + wordmark flattened into one
raster) at 36px tall, which made the baked-in wordmark illegible — not
just an aspect-ratio mismatch. Fixed by rebuilding `Logo` to show the mark
SVG alone (sized via CSS height only, `logo-mark-dark.svg` /
`logo-mark-light.svg`, no hardcoded width/height — the old pixel values
were pinned to the placeholder's exact dimensions and never matched real
artwork) next to a real HTML wordmark in the existing editorial-serif
display font. Restructured `Header` to a single top row (logo+wordmark
left, clock+theme toggle right) with the tagline full-width below,
matching the layout referenced. Shrank `SiteClock` and `ThemeToggle`
sizing to match; toggle padding rechecked against the 24×24px touch-target
minimum from the Phase 1 Lighthouse fix so it doesn't regress that.
Touches `Logo`, `Header`, `SiteClock`, `ThemeToggle` — broader than a
single-file sizing patch, since the actual request (mark+wordmark as one
unit, repositioned tagline, smaller chrome) needed all four. Not
re-verified against a live build/Lighthouse run in this pass — recommend
re-running `npm run build` and a quick Lighthouse pass before trusting it
fully, same as any other unverified change.

## Real brand assets inspected (no code changed)

You supplied the four real files you'd already placed at `/public/brand/`
(`logo-mark-dark.svg`, `logo-mark-light.svg`, `logo-lockup-dark.svg`,
`logo-lockup-light.svg`) for inspection only — read, not modified.
Findings:
- **Real vector paths.** `<path>` elements with real coordinate data, not
  a raster wrapper. Resolves the Phase 1 blocking item.
- **No file contains the wordmark.** Not even the two named "lockup":
  `logo-mark-*` and `logo-lockup-*` have identical path data and fill
  colours, just recentred on different canvas shapes (1250x848 vs. a
  1264x1264 square). There is no version of the real artwork with
  "Algorithmic Mind" drawn into it. This confirms the mark-image +
  real-HTML-wordmark approach built in the header-composition fix above is
  necessary, not a stylistic choice — there's nothing to fall back to.
- **Each file bakes in its own opaque full-canvas background rect** (e.g.
  `logo-mark-dark.svg` is a solid `#0a2a1e` tile with the mark drawn on
  top), making it a self-contained square badge rather than a transparent
  mark meant to sit on the page background. This matches every reference
  screenshot shown throughout this project, so is very likely intentional,
  but is worth flagging against the constitution's literal "never add...
  a container" line for the mark. Not changed either way — flagged for a
  human call, not decided here.
- **Artwork colours are close but not pixel-identical to the token
  palette** — e.g. `#0a2a1e` vs. the constitution's `#102A25` for
  primary-deep, `#c4984a` vs. `#E5C690` for gold. Flagged, not changed.

## Phase 2 — Supabase schema, RLS, seed data

### What was built
A 30 table Postgres schema written as nine ordered SQL migrations (no ORM),
row level security on every table, explicit grants, full text search on
articles, a development seed, an anonymous access proof script, and
TypeScript types. Nothing from Phase 1 was touched.

### Files that now exist
```
supabase/migrations/20260929090000_enums_and_base_functions.sql
supabase/migrations/20260929090100_identity_taxonomy_media.sql
supabase/migrations/20260929090200_pipeline_sources.sql
supabase/migrations/20260929090300_articles.sql
supabase/migrations/20260929090400_directories.sql
supabase/migrations/20260929090500_operations.sql
supabase/migrations/20260929090600_functions_and_triggers.sql
supabase/migrations/20260929090700_rls_and_grants.sql
supabase/migrations/20260929090800_seed_taxonomy_and_settings.sql
supabase/seed.sql                     development only, never run on production
supabase/scripts/rls_proof.sql        the access proof, see Verification
types/database.ts                     derived from the migrations, see Decisions
CONTEXT.md                            this entry
```
`supabase/config.toml` comes from `supabase init` and is not hand written.

### Verification, stated plainly
- **Migrations ran clean** on an empty Supabase project via `supabase db push`
  (a scratch project, confirmed by the project owner).
- **Access proof passed, 80 of 80 checks,** on that real database. It builds
  its own fixtures, acts as anon and as every role, and rolls back. It proves
  anon reads published articles and their published child rows only, cannot
  read drafts, reviews, scheduled, future dated or soft deleted articles,
  cannot read private tables, cannot write anything, and that role escalation,
  editorial field changes and audit log edits are all refused. It also checks
  structurally that every table has RLS and at least one policy.
- **Seed ran successfully** on the same scratch project (confirmed by the
  project owner). That project now holds development data and must not be
  treated as production.
- **Not verified:** `supabase db reset` and the local Docker flow have not
  been exercised. The migrations have not yet been pushed to a separate
  production project.
  `types/database.ts` was derived from the SQL by parsing it, then passed
  strict `tsc`, but has not been compared with the official generator output.

### Where this deviates from the written schema, and why
1. **Categories** are the four from the brief: Software Engineering,
   Artificial Intelligence, Events, Product Reviews. No subcategories are
   seeded. Phase 1's header nav is hard coded as Software, Engineering, AI and
   no longer matches. Phase 1 code was not changed. A later phase should drive
   navigation from `navigation_items` and the real categories.
2. **"Anonymous can read published articles and nothing else"** is implemented
   as: published articles plus the reference rows needed to render them
   (categories, tags, topics, sources, published media, public settings).
   Read literally, anon could not even load a category label.
3. **`geo_scope`** is the enum name, column is still `geography`, because
   `geography` is a PostGIS type name.
4. **`profiles.is_active`** was added. New sign ups are inactive and hold no
   privileges until an administrator activates them, so open sign up cannot
   grant staff access.
5. **`site_settings`** is one row per key (key, jsonb value, `is_public`), not
   a literal single row. This allows public and private settings in one table
   under row level security.
6. **`media`**: focal point is `focal_x` and `focal_y` (0 to 1), and
   `is_decorative` was added so alt text is mandatory unless an image is
   explicitly decorative.
7. **Country** columns hold ISO 3166-1 alpha-2 codes, constrained.
8. **`reading_time`** is computed by trigger from the body, not entered.
   **`search_vector`** is trigger maintained, not a generated column, because
   the TipTap text extraction needs a recursive function. The GIN index is in
   place.
9. **Role ladder, where the brief was silent:** reporters write their own
   drafts only and read the discovery pipeline. Authors write their own drafts
   and may submit them for review, after which the piece is locked until an
   editor returns it. Editors write and publish anything. Administrators
   manage users, settings, ads, navigation, redirects and read the audit log
   and subscribers. Only a super admin may create or edit administrators and
   super admins. Hard deletes of articles and profiles are super admin only.
10. **Integrity rules added to protect against fabricated content:** every
    funding round requires a `source_url`; funding is public only when the
    startup's `verified_funding` flag is set; a review cannot be published
    without a `tested_on` date; ads carry a mandatory disclosure label.
11. **Seed authors are not real people.** The brief asked for two real
    authors. Inventing named staff would be fabrication, so the seed creates
    "Editorial Desk" and "News Desk" accounts that cannot log in (reserved
    `.invalid` email domain, no password). **Replace before launch.**
12. **The proof is plain SQL, not pgTAP,** so it runs in the dashboard SQL
    Editor with no Docker. It ends in a deliberate error that rolls its test
    data back; the message is the report.
13. **Per claim "tested" flags** on reviews are a child table
    (`product_review_points`, kind pro or con) plus `pricing_tested` and
    `free_tier_tested` on the review.

### Decisions taken
- **Two locks on every table:** explicit grants (anon holds `select` only, on
  22 named tables) and row level security. Default privileges for anon and
  authenticated were revoked, so a forgotten grant fails closed. A final block
  in migration 8 aborts the migration if any table lacks RLS.
- **Helper functions live in a `private` schema** that the Data API does not
  expose. Never add `private` to `[api] schemas` in `config.toml`.
- **Privileged column guard:** RLS cannot restrict columns, so a trigger stops
  non editors changing breaking, top story, featured, editor's pick, noindex,
  publishing and view count fields. Triggers only act when a signed in user is
  present, so the service role, migrations and the SQL editor pass through.
- **Audit trail:** a trigger writes diffs for staff editable tables. Newsletter
  subscribers are excluded so email addresses are not copied. The log is
  append only, enforced by triggers that even the service role cannot bypass.
- **Revisions** are written on every body change. If the editor autosaves
  often, add coalescing in the editor phase or the table will grow quickly.
- **Scheduled publishing:** `public.publish_due_articles()` exists and is
  callable by the service role only. Nothing calls it yet.
- **`view_count` has no writer.** Anonymous visitors have no write path by
  design. A later phase should add a server side counter or a job.
- **Types:** `types/database.ts` carries a header saying how to replace it
  with official output.

### Things the next phase must know
- **Anonymous profile queries must name columns.** Anon holds column level
  select on `profiles` (id, display_name, slug, avatar_media_id, bio,
  specialization, social_links, created_at). `select *` and embedding
  `profiles(*)` fail for anon with a permission error. This is deliberate so
  role and activation state stay private.
- **Newsletter sign up, trending score writes, and anything touching
  `newsletter_subscribers`** must run in server code with the service role
  key. No client code may hold that key.
- **Inline images inside article bodies** are not tracked in `media`, because
  only hero and social images are linked. If the editor needs media rows for
  inline images, add an `article_media` join table in the editor phase.
- **Turn off public sign up** in the Supabase Auth settings. Staff should be
  invited only.
- **Types** should be regenerated from the live database with the official
  command once a real project is linked:
  `npx supabase gen types typescript --project-id YOUR_REFERENCE_ID > types/database.ts`
- **Dependencies for later phases:** the Phase 1 token vocabulary is unchanged.
  The schema introduces no npm dependency. Development only items are
  `supabase/seed.sql` and the two desk accounts it creates.

## Phase 3 - Authentication and authorization

### What was built
Google OAuth as the primary sign in and email with password as the fallback,
both started and finished on the server. A database trigger creates a profile
for every new auth user as an inactive reporter. A permissions module is the
single role to capability table, read by the interface and by every server
entry point. Middleware verifies the session on gated routes and refreshes the
cookie. Sign in, account, access denied and callback routes, a minimal studio
landing page, API routes for publish, delete and role or activation changes,
audit events, a Postgres backed rate limiter, tests, and a client bundle
secret scanner.

### Files that now exist
```
supabase/migrations/20261012090000_auth_support.sql
middleware.ts
lib/env.ts
lib/audit.ts
lib/api/http.ts
lib/auth/permissions.ts       single source of truth, no imports
lib/auth/redirects.ts         post sign in allowlist, no imports
lib/auth/session.ts           getAuthContext(), fetchProfile()
lib/auth/guards.ts            requireStaff(), requireCapability() for pages
lib/auth/authorize.ts         authorize() for route handlers
lib/auth/rate-limit.ts
lib/supabase/{server,admin,middleware,cookies}.ts
app/auth/actions.ts           Google, password and sign out server actions
app/auth/callback/route.ts
app/sign-in/page.tsx
app/account/page.tsx
app/access-denied/page.tsx
app/studio/{layout,page}.tsx
app/admin/layout.tsx          guard only, pages arrive in a later phase
app/api/articles/[id]/publish/route.ts
app/api/articles/[id]/route.ts            DELETE, soft or permanent
app/api/admin/users/[id]/route.ts         PATCH role and is_active
components/auth/{auth-shell,form-field,google-button,sign-out-button}.tsx
tests/permissions.test.ts
tests/publish-route.test.ts
tests/integration/author-publish.live.test.ts
tests/stubs/server-only.ts
vitest.config.ts
scripts/check-client-secrets.mjs
```

### Decisions taken
- **Server side only auth.** There is no browser Supabase client. OAuth and
  password sign in run in Server Actions, so the password path can be rate
  limited by us and auth cookies can be HttpOnly, Secure in production and
  SameSite Lax.
- **Middleware matches only gated routes** (/studio, /admin, /account,
  /api/admin, /sign-in, /access-denied). Public pages set no cookies, so they
  stay cacheable at Cloudflare. Role checks live in layouts and handlers
  because they need the profile row.
- **Two gates on every write.** authorize() checks the capability, then the
  write runs through the caller's own client so RLS and the Phase 2 guard
  triggers apply independently. Interface hiding is never relied on.
- **audit_events is a new table**, separate from the Phase 2 diff log. The
  Phase 2 notes describe that log's behaviour but not its columns, so this
  phase did not guess them. Semantic events (who signed in, who changed which
  role) go here. Field diffs stay in the Phase 2 log. A later admin phase can
  read both, or repoint public.record_audit_event at the old table in one
  function body.
- **Audit writes are best effort** and logged on failure. No IP or user agent
  is stored.
- **Rate limit:** 5 attempts per email and 20 per IP per 15 minutes, fixed
  window, counters in Postgres (serverless isolates share no memory). Fails
  closed. Known limits: a determined attacker can lock a known email out of
  the password path for 15 minutes, and calls made straight to the Supabase
  Auth endpoint bypass this limiter and fall back to Supabase's own limits.
  Add a Cloudflare rate limiting rule in front of the Supabase auth host if
  that matters.
- **Role inferred where Phase 2 was silent:** authors do not read the
  discovery pipeline, administrators inherit all editor capabilities
  including publish. Confirm both against the Phase 2 RLS policies.
- **Role changes** go through PATCH /api/admin/users/{id} only. Nobody can
  change their own account there. Only super administrators may touch
  administrator or super administrator accounts.
- **Google button:** the G is Google's unmodified mark, the one sanctioned
  colour exception, because Google's guidelines forbid recolouring it. Fill,
  border and text use design tokens and the label font is IBM Plex Sans, so
  the button follows Google's neutral styles in spirit, not hex for hex.
  Needs a human call.
- **Form control borders use fg-muted, not rule.** The rule token is 14 percent
  alpha and fails the 3:1 non-text contrast a control edge needs.
- **Errors carry a text label,** never colour alone, and no new colour was
  introduced for them.

### Configuration outside the repository
1. Supabase, Auth, Providers: enable Google with the client id and secret.
2. Supabase, Auth, URL Configuration: add `<NEXT_PUBLIC_SITE_URL>/auth/callback`
   to Redirect URLs and set Site URL. This is a second allowlist behind ours.
3. Google Cloud console: authorised redirect URI is
   `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Sign up mode: Phase 2 said staff are invited only. Either keep public
   sign up off and create staff accounts in the dashboard with auto confirm
   (verify that first time Google sign in links to such an account on your
   project), or leave it on and accept inactive profile rows from strangers.
   The security boundary is is_active plus role either way.
5. Set SUPABASE_SERVICE_ROLE_KEY as a Worker secret, never as a build variable.

### Verification, stated plainly
- Written in a sandbox with no network. `npm install`, `tsc`, `next build`,
  vitest, the migration and the live test have not been run against the real
  repository. The pure modules (permissions, redirects) were exercised
  directly in Node.
- Before trusting it: `npm run typecheck && npm run lint && npm test`, apply
  the migration to the scratch project, run the live test with
  TEST_BASE_URL, then `npm run build && npm run check:secrets`.
- Guessed names to confirm: role enum labels (the migration checks them and
  aborts with a clear message), articles.status, published_at, deleted_at,
  Tailwind utility `font-display`, the env variable names, and that the root
  layout supplies the main landmark (the new pages use section).

### What the next phase depends on
- Import capabilities from lib/auth/permissions.ts. Never test role strings
  in components.
- New admin pages go under app/admin and inherit the guard. New API routes
  call authorize() first.
- Header and footer do not show sign in state yet. A later phase can add a
  staff link using getAuthContext().

### Verification update (Phase 3)
Run against the scratch Supabase project: vitest 39 passed, 1 skipped (the
direct data API publish test, needs TEST_ARTICLE_ID). Live test confirmed new
accounts start as inactive reporters, an author gets 403 from the publish
endpoint with their own token, and self promotion is refused. next build
compiled and type checked clean. check:secrets passed on .next/static and
.open-next/assets. Not yet verified: Google sign in end to end, audit_events
rows, the rate limit by hand, and a workerd preview of the Phase 3 build.

### Verification update 2 (Phase 3, final)
Verified by hand: Google sign in end to end (new users land on the activation
screen, activated users land on /studio), audit_events rows written for both
email and Google sign in, the password rate limit triggers on the sixth wrong
attempt, and sign in works under the workerd preview of the Phase 3 build.
All Phase 3 acceptance criteria are now confirmed against a running system.
Open items carried forward: TEST_ARTICLE_ID test still skipped until articles
exist, the Google button deviations need a human design call, and role
inferences (authors do not read the discovery pipeline, administrators
inherit publish) should be checked against the Phase 2 RLS policies.
