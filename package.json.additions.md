Run once, from the repository root:

    npm install @supabase/ssr @supabase/supabase-js server-only
    npm install -D vitest

Add to the "scripts" block:

    "test": "vitest run",
    "check:secrets": "node scripts/check-client-secrets.mjs"

Then append the contents of env.example.append to .env.example.
