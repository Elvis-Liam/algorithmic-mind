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
- The vector-logo gap above blocks a fully constitution-compliant brand
  system; treat it as a prerequisite for any phase that touches favicons,
  social cards, or print-facing assets.
