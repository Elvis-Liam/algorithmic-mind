// Environment access. Only NEXT_PUBLIC_ values are read here, so this file is
// safe to import anywhere. The service role key is read in lib/supabase/admin.ts.

export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set');
  }
  return { url, anonKey };
}

/** The one origin this site may redirect to. Never derived from request headers. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) throw new Error('NEXT_PUBLIC_SITE_URL must be set');
  return new URL(raw).origin;
}
