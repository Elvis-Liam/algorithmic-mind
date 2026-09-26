# Algorithmic Mind

The latest developments, releases, breakthroughs, and industry movements
shaping software and AI. See `CONTEXT.md` for the build log and
`PROJECT_CONSTITUTION.md` (kept outside this repo, alongside it) for the
rules this codebase follows.

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS v4 · Supabase ·
Cloudinary · Resend · Cloudflare (Workers, via the OpenNext adapter) ·
Lucide · TipTap · OpenAPI 3.1 / Swagger UI · Python (httpx + selectolax) for
the discovery pipeline only.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in real values, never commit this file
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run lint          # ESLint
npm run format        # Prettier, writes
npm run format:check  # Prettier, checks only
npm run typecheck      # tsc --noEmit
```

## Deploying to Cloudflare

This project targets Cloudflare Workers via the **OpenNext Cloudflare
adapter** (`@opennextjs/cloudflare`), not `@cloudflare/next-on-pages`, which
is superseded. Note that this means the app is a Worker with a static
assets binding under the hood, not the older Pages-native product — that is
the current Cloudflare-recommended path for a Next.js 15 App Router project
and is what "deploy to Cloudflare Pages" resolves to today. (Cloudflare's
newest tool, `vinext`, targets Next.js 16 and isn't applicable while this
project is pinned to Next.js 15.)

```bash
npx wrangler login          # once, per machine
npm run cf:preview          # build + local Workers runtime preview
npm run cf:deploy           # build + deploy
```

`wrangler.jsonc` has no bindings yet beyond the static assets binding —
Supabase, Cloudinary, and Resend are all reached over HTTPS from environment
variables, not Cloudflare bindings, so nothing else is needed for Phase 1.
Set the variables in `.env.example` as Cloudflare secrets/vars before
deploying past this phase (`npx wrangler secret put <NAME>` for secrets).

## Known gap: logo assets are not vector

The four files in `public/brand/` (`logo-mark-dark.svg`,
`logo-mark-light.svg`, `logo-lockup-dark.svg`, `logo-lockup-light.svg`) are
raster PNGs wrapped in an `.svg` container, not real vector path data. The
source files supplied for Phase 1 were themselves raster JPEGs in an
`<svg><image>` wrapper (Canva AI exports carrying an embedded C2PA
manifest); the PNGs were the clean pixels. Each file here has had its
background chroma-keyed to transparent, the manifest stripped, and the mark
separated from the wordmark, but it is still a raster image under the
`.svg` extension — noticeably heavier than a real vector mark and not
infinitely scalable. **Before launch, a designer needs to redraw the mark as
true vector paths** matching the existing geometry and the exact palette
tokens; swap the four files in place once that exists and nothing else in
the codebase needs to change, since everything references them by path.

## Repository layout

```
app/          routes (App Router)
components/   shared UI (layout/, providers/)
lib/          clients and utilities (fonts, cn helper)
types/        shared TypeScript types
styles/       global CSS, design tokens, Tailwind theme mapping
public/brand/ logo assets (see gap noted above)
```
